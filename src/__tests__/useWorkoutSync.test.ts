import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useWorkoutSync } from "@/hooks/useWorkoutSync";

const mockToArray = vi.fn();
const mockUpdate = vi.fn();
const mockTransaction = vi.fn();
const mockInsert = vi.fn();
const mockGetSession = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    workout_logs: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: (...args: unknown[]) => mockToArray(...args),
        }),
      }),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
    from: vi.fn().mockReturnValue({
      insert: (...args: unknown[]) => mockInsert(...args),
    }),
  },
}));

function setOnlineStatus(online: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: online,
  });
}

const fakeSession = { data: { session: { user: { id: "user-1" } } } };

const pendingLog = {
  id: 1,
  workout_id: "w1",
  split_id: "s1",
  exercise_id: "e1",
  weight: 60,
  reps: 10,
  timestamp: "2024-01-01T10:00:00Z",
  is_synced: 0,
};

describe("useWorkoutSync", () => {
  beforeEach(() => {
    setOnlineStatus(true);
    mockToArray.mockResolvedValue([]);
    mockGetSession.mockResolvedValue(fakeSession);
    mockInsert.mockResolvedValue({ error: null });
    mockUpdate.mockResolvedValue(undefined);
    mockTransaction.mockImplementation(
      async (_mode: unknown, _tables: unknown, fn: () => Promise<void>) => {
        await fn();
      }
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("inicia como Sincronizado quando online sem logs pendentes", async () => {
    const { result } = renderHook(() => useWorkoutSync());

    await waitFor(() => {
      expect(result.current.syncStatus).toBe("Sincronizado");
    });
    expect(result.current.isOnline).toBe(true);
  });

  it("inicia como Modo Offline quando sem conexão", async () => {
    setOnlineStatus(false);
    const { result } = renderHook(() => useWorkoutSync());

    await waitFor(() => {
      expect(result.current.syncStatus).toBe("Modo Offline");
    });
    expect(result.current.isOnline).toBe(false);
  });

  it("faz upload dos logs pendentes e marca como sincronizados", async () => {
    mockToArray.mockResolvedValue([pendingLog]);

    const { result } = renderHook(() => useWorkoutSync());

    await waitFor(() => {
      expect(result.current.syncStatus).toBe("Sincronizado");
    });

    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        workout_id: "w1",
        split_id: "s1",
        exercise_id: "e1",
        weight: 60,
        reps: 10,
        user_id: "user-1",
      }),
    ]);
    expect(mockUpdate).toHaveBeenCalledWith(1, { is_synced: 1 });
  });

  it("define Modo Offline quando o Supabase retorna erro", async () => {
    mockToArray.mockResolvedValue([pendingLog]);
    mockInsert.mockResolvedValue({ error: new Error("Network error") });

    const { result } = renderHook(() => useWorkoutSync());

    await waitFor(() => {
      expect(result.current.syncStatus).toBe("Modo Offline");
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("não faz upload quando não há sessão ativa", async () => {
    mockToArray.mockResolvedValue([pendingLog]);
    mockGetSession.mockResolvedValue({ data: { session: null } });

    renderHook(() => useWorkoutSync());

    await new Promise((r) => setTimeout(r, 100));
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("dispara sync ao voltar online", async () => {
    setOnlineStatus(false);
    const { result } = renderHook(() => useWorkoutSync());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
    });

    setOnlineStatus(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
      expect(result.current.syncStatus).toBe("Sincronizado");
    });
  });

  it("atualiza isOnline para false no evento offline", async () => {
    const { result } = renderHook(() => useWorkoutSync());

    act(() => {
      setOnlineStatus(false);
      window.dispatchEvent(new Event("offline"));
    });

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
      expect(result.current.syncStatus).toBe("Modo Offline");
    });
  });

  it("não faz duplo upload de logs já sincronizados", async () => {
    mockToArray.mockResolvedValue([pendingLog]);

    renderHook(() => useWorkoutSync());

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });
  });
});
