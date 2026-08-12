"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { db } from "@/lib/db";

interface WorkoutDivision {
  id: string;
  name: string;
  frequency?: number;
}

interface PendingDivisionCreate {
  localDivisionId: string;
  name: string;
  frequency: number;
  user_id: string;
  splits: {
    localSplitId: string;
    name: string;
    order_index: number;
  }[];
}

const PENDING_DIVISIONS_KEY = "pending_division_creates";

export function WorkoutSelector() {
  const router = useRouter();
  const [divisions, setDivisions] = useState<WorkoutDivision[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" | "error" } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    frequency: 3,
  });
  const [splits, setSplits] = useState([{ name: "" }]);

  const showToast = (message: string, type: "success" | "warning" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const readPendingDivisionCreates = (): PendingDivisionCreate[] => {
    try {
      const raw = localStorage.getItem(PENDING_DIVISIONS_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as PendingDivisionCreate[];
    } catch {
      return [];
    }
  };

  const writePendingDivisionCreates = (items: PendingDivisionCreate[]) => {
    localStorage.setItem(PENDING_DIVISIONS_KEY, JSON.stringify(items));
  };

  const enqueuePendingDivisionCreate = (item: PendingDivisionCreate) => {
    const current = readPendingDivisionCreates();
    current.push(item);
    writePendingDivisionCreates(current);
  };

  const syncPendingDivisionCreates = async () => {
    if (!navigator.onLine) return;

    const pending = readPendingDivisionCreates();
    if (pending.length === 0) return;

    const stillPending: PendingDivisionCreate[] = [];

    for (const item of pending) {
      try {
        const { data: divisionData, error: divisionError } = await supabase
          .from("workout_divisions")
          .insert([
            {
              name: item.name,
              frequency: item.frequency,
              user_id: item.user_id,
            },
          ])
          .select()
          .single();

        if (divisionError || !divisionData) {
          stillPending.push(item);
          continue;
        }

        const splitsToInsert = item.splits
          .filter((split) => split.name.trim() !== "")
          .map((split) => ({
            division_id: divisionData.id,
            name: split.name,
            order_index: split.order_index,
            user_id: item.user_id,
          }));

        if (splitsToInsert.length > 0) {
          const { error: splitsError } = await supabase.from("workout_splits").insert(splitsToInsert);
          if (splitsError) {
            stillPending.push(item);
            continue;
          }
        }

        await db.transaction("rw", db.workout_divisions, db.workout_splits, async () => {
          await db.workout_divisions.delete(item.localDivisionId);
          for (const split of item.splits) {
            await db.workout_splits.delete(split.localSplitId);
          }
        });
      } catch {
        stillPending.push(item);
      }
    }

    writePendingDivisionCreates(stillPending);

    if (stillPending.length === 0) {
      showToast("Divisões offline sincronizadas com sucesso.", "success");
    }

    fetchDivisions();
  };

  const fetchDivisions = async () => {
    // 1) Offline-first: Dexie
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const localDivisions = await db.workout_divisions.where("user_id").equals(session.user.id).toArray();
        if (localDivisions.length > 0) {
          setDivisions(localDivisions as WorkoutDivision[]);
          setLoading(false);
        }
      }
    } catch {
      // noop
    }

    // 2) Online source of truth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("workout_divisions")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at");

    if (data) {
      setDivisions(data);

      await db.transaction("rw", db.workout_divisions, async () => {
        for (const division of data) {
          await db.workout_divisions.put({
            id: division.id,
            user_id: session.user.id,
            name: division.name,
            created_at: new Date().toISOString(),
          });
        }
      });
    } else {
      console.error("Erro ao buscar divisões:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDivisions();

    syncPendingDivisionCreates();

    const onOnline = () => {
      syncPendingDivisionCreates();
    };

    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  const handleSelect = (id: string) => {
    router.push(`/division/${id}`);
  };

  const handleAddSplit = () => {
    setSplits([...splits, { name: "" }]);
  };

  const handleRemoveSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  const handleSplitChange = (index: number, value: string) => {
    const newSplits = [...splits];
    newSplits[index].name = value;
    setSplits(newSplits);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsSubmitting(false);
      showToast("Faça login para criar divisões.", "error");
      return;
    }

    const normalizedSplits = splits
      .filter(s => s.name.trim() !== "")
      .map((split, index) => ({
        name: split.name,
        order_index: index + 1,
      }));

    // Fluxo offline: salva no Dexie e enfileira para sincronização
    if (!navigator.onLine) {
      const localDivisionId = `local-division-${crypto.randomUUID()}`;
      const nowIso = new Date().toISOString();
      const localSplits = normalizedSplits.map((split) => ({
        localSplitId: `local-split-${crypto.randomUUID()}`,
        name: split.name,
        order_index: split.order_index,
      }));

      try {
        await db.transaction("rw", db.workout_divisions, db.workout_splits, async () => {
          await db.workout_divisions.put({
            id: localDivisionId,
            user_id: session.user.id,
            name: formData.name,
            frequency: formData.frequency,
            created_at: nowIso,
          });

          for (const split of localSplits) {
            await db.workout_splits.put({
              id: split.localSplitId,
              division_id: localDivisionId,
              user_id: session.user.id,
              name: split.name,
              order_index: split.order_index,
              created_at: nowIso,
            });
          }
        });

        enqueuePendingDivisionCreate({
          localDivisionId,
          name: formData.name,
          frequency: formData.frequency,
          user_id: session.user.id,
          splits: localSplits,
        });

        setIsModalOpen(false);
        setFormData({ name: "", frequency: 3 });
        setSplits([{ name: "" }]);
        setLoading(true);
        fetchDivisions();
        showToast("Divisão criada offline. Será sincronizada quando voltar a internet.", "warning");
      } catch (error) {
        console.error("Erro ao salvar divisão offline:", error);
        showToast("Não foi possível salvar offline.", "error");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 1. Criar a Divisão
    const { data: divisionData, error: divisionError } = await supabase
      .from("workout_divisions")
      .insert([
        {
          name: formData.name,
          frequency: formData.frequency,
          user_id: session.user.id,
        },
      ])
      .select()
      .single();

    if (divisionError || !divisionData) {
      console.error("Erro ao criar divisão:", divisionError);
      showToast("Erro ao criar divisão.", "error");
      setIsSubmitting(false);
      return;
    }

    // 2. Criar os Splits (Separações)
    const splitsToInsert = splits
      .filter(s => s.name.trim() !== "")
      .map((split, index) => ({
        division_id: divisionData.id,
        name: split.name,
        order_index: index + 1,
        user_id: session.user.id,
      }));

    if (splitsToInsert.length > 0) {
      const { error: splitsError } = await supabase
        .from("workout_splits")
        .insert(splitsToInsert);

      if (splitsError) {
        console.error("Erro ao criar splits:", splitsError);
      }
    }

    setIsModalOpen(false);
    setFormData({ name: "", frequency: 3 });
    setSplits([{ name: "" }]);
    setLoading(true);
    fetchDivisions();
    setIsSubmitting(false);
    showToast("Divisão criada com sucesso.", "success");
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <span className="loading loading-spinner text-primary"></span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {divisions.length === 0 && (
        <div className="text-center p-4 text-sm" style={{ color: "var(--color-neutral-600)" }}>
          Nenhuma divisão cadastrada. Crie uma para começar!
        </div>
      )}

      {divisions.map((division) => (
        <button
          key={division.id}
          onClick={() => handleSelect(division.id)}
          className="w-full text-left flex items-center justify-between gap-3 bg-base-200 border p-[18px]"
          style={{ borderColor: "var(--color-divider)" }}
        >
          <div>
            <div className="font-display text-[19px]">{division.name}</div>
            <div className="text-[13px] mt-1" style={{ color: "var(--color-neutral-600)" }}>
              Frequência: {division.frequency ?? "-"}x na semana
            </div>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0" style={{ color: "var(--color-neutral-600)" }} />
        </button>
      ))}

      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full flex items-center justify-start gap-2 p-4 bg-transparent font-display font-extrabold text-sm"
        style={{ border: "2px dashed var(--color-divider)" }}
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
        Criar Nova Divisão
      </button>

      {/* Modal de Criação */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-4"
          style={{ background: "color-mix(in srgb, var(--color-base-content) 50%, transparent)" }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-md flex flex-col bg-base-100 max-h-[85vh]"
            style={{ border: "1px solid var(--color-divider)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: "2px solid var(--color-divider)" }}>
              <div>
                <h3 className="font-display text-xl leading-none">Criar Divisão de Treino</h3>
                <p className="text-xs mt-1.5" style={{ color: "var(--color-neutral-600)" }}>Organize seus dias de treino da semana</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Fechar modal"
                style={{ color: "var(--color-neutral-600)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 flex flex-col gap-4 overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "var(--color-neutral-600)" }}>Nome da Divisão</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: PPL"
                  className="input"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "var(--color-neutral-600)" }}>Frequência na semana</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="7"
                  className="input"
                  value={formData.frequency}
                  onChange={e => setFormData({...formData, frequency: parseInt(e.target.value)})}
                />
              </div>

              <div className="pt-1">
                <p className="text-xs mb-2" style={{ color: "var(--color-neutral-600)" }}>Separações (Dias)</p>
                <div className="flex flex-col gap-2.5">
                  {splits.map((split, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        required
                        type="text"
                        placeholder={`Ex: ${index === 0 ? 'Push' : index === 1 ? 'Pull' : 'Legs'}`}
                        className="input"
                        value={split.name}
                        onChange={e => handleSplitChange(index, e.target.value)}
                      />
                      {splits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSplit(index)}
                          style={{ color: "var(--color-accent-700)" }}
                          aria-label="Remover dia"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddSplit}
                className="flex items-center gap-1.5 text-sm font-semibold w-fit"
                style={{ color: "var(--color-accent)" }}
              >
                <Plus className="w-4 h-4" /> Adicionar Dia
              </button>

              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary min-w-24" disabled={isSubmitting}>
                  {isSubmitting ? <span className="loading loading-spinner loading-xs"></span> : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-70 px-4 py-3 text-sm font-medium max-w-[90%]"
          style={{
            background: toast.type === "error" ? "var(--color-accent-100)" : "var(--color-base-200)",
            color: toast.type === "error" ? "var(--color-accent-700)" : "var(--color-base-content)",
            border: "1px solid var(--color-divider)",
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
