import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExerciseCard } from "@/components/ExerciseCard";

const mockAdd = vi.fn();
const mockScheduleLocalRestTimer = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    workout_logs: {
      add: (...args: unknown[]) => mockAdd(...args),
    },
  },
}));

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn().mockReturnValue([]),
}));

vi.mock("@/hooks/usePushNotifications", () => ({
  usePushNotifications: () => ({
    scheduleLocalRestTimer: mockScheduleLocalRestTimer,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

const defaultProps = {
  exerciseId: "ex-1",
  name: "Supino Reto",
  muscleGroup: "Peitoral",
  workoutId: "workout-1",
  splitId: "split-1",
  restTime: 90,
  targetSets: 3,
  isTraining: true,
};

describe("ExerciseCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdd.mockResolvedValue(1);
  });

  it("renderiza nome e grupo muscular do exercício", () => {
    render(<ExerciseCard {...defaultProps} />);
    expect(screen.getByText("Supino Reto")).toBeInTheDocument();
    expect(screen.getByText("Peitoral")).toBeInTheDocument();
  });

  it("mostra o contador de séries como 0/3 inicialmente", () => {
    render(<ExerciseCard {...defaultProps} />);
    expect(screen.getByText("0/3")).toBeInTheDocument();
  });

  it("renderiza descrição quando fornecida", () => {
    render(<ExerciseCard {...defaultProps} description="Barra na altura do peitoral" />);
    expect(screen.getByText("Barra na altura do peitoral")).toBeInTheDocument();
  });

  it("salva no Dexie com is_synced=0 em submit válido", async () => {
    const user = userEvent.setup();
    render(<ExerciseCard {...defaultProps} />);

    await user.type(screen.getByPlaceholderText("0.0"), "60");
    await user.type(screen.getByPlaceholderText("0"), "10");
    await user.click(screen.getByRole("button", { name: /registrar série/i }));

    await waitFor(() => {
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          exercise_id: "ex-1",
          workout_id: "workout-1",
          split_id: "split-1",
          weight: 60,
          reps: 10,
          is_synced: 0,
        })
      );
    });
  });

  it("mostra erro de validação para peso zero", async () => {
    const user = userEvent.setup();
    render(<ExerciseCard {...defaultProps} />);

    await user.type(screen.getByPlaceholderText("0.0"), "0");
    await user.type(screen.getByPlaceholderText("0"), "10");
    await user.click(screen.getByRole("button", { name: /registrar série/i }));

    await waitFor(() => {
      expect(screen.getByText("O peso deve ser maior que zero")).toBeInTheDocument();
    });
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("mostra erro de validação para repetições zero", async () => {
    const user = userEvent.setup();
    render(<ExerciseCard {...defaultProps} />);

    await user.type(screen.getByPlaceholderText("0.0"), "60");
    await user.type(screen.getByPlaceholderText("0"), "0");
    await user.click(screen.getByRole("button", { name: /registrar série/i }));

    await waitFor(() => {
      expect(screen.getByText("As repetições devem ser maiores que zero")).toBeInTheDocument();
    });
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("agenda timer de descanso após salvar quando restTime > 0", async () => {
    const user = userEvent.setup();
    render(<ExerciseCard {...defaultProps} restTime={90} />);

    await user.type(screen.getByPlaceholderText("0.0"), "80");
    await user.type(screen.getByPlaceholderText("0"), "8");
    await user.click(screen.getByRole("button", { name: /registrar série/i }));

    await waitFor(() => {
      expect(mockScheduleLocalRestTimer).toHaveBeenCalledWith(90);
    });
  });

  it("não agenda timer quando restTime é 0", async () => {
    const user = userEvent.setup();
    render(<ExerciseCard {...defaultProps} restTime={0} />);

    await user.type(screen.getByPlaceholderText("0.0"), "80");
    await user.type(screen.getByPlaceholderText("0"), "8");
    await user.click(screen.getByRole("button", { name: /registrar série/i }));

    await waitFor(() => {
      expect(mockAdd).toHaveBeenCalled();
    });
    expect(mockScheduleLocalRestTimer).not.toHaveBeenCalled();
  });

  it("exibe mensagem de erro e não exibe sucesso quando o Dexie falha", async () => {
    mockAdd.mockRejectedValue(new Error("IndexedDB error"));
    const user = userEvent.setup();
    render(<ExerciseCard {...defaultProps} />);

    await user.type(screen.getByPlaceholderText("0.0"), "60");
    await user.type(screen.getByPlaceholderText("0"), "10");
    await user.click(screen.getByRole("button", { name: /registrar série/i }));

    await waitFor(() => {
      expect(screen.queryByText(/série registrada/i)).not.toBeInTheDocument();
      expect(screen.getByText(/falha ao salvar/i)).toBeInTheDocument();
    });
  });
});
