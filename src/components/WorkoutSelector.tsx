"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Trash2, X, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface WorkoutDivision {
  id: string;
  name: string;
  frequency: number;
}

export function WorkoutSelector() {
  const router = useRouter();
  const [divisions, setDivisions] = useState<WorkoutDivision[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    frequency: 3,
  });
  const [splits, setSplits] = useState([{ name: "" }]);

  const fetchDivisions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("workout_divisions")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at");

    if (data) {
      setDivisions(data);
    } else {
      console.error("Erro ao buscar divisões:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDivisions();
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
    if (!session) return;

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
      alert("Erro ao criar divisão.");
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
        <div className="text-center p-4 text-neutral-content text-sm">
          Nenhuma divisão cadastrada. Crie uma para começar!
        </div>
      )}
      
      {divisions.map((division) => (
        <button
          key={division.id}
          onClick={() => handleSelect(division.id)}
          className="w-full text-left rounded-xl border bg-base-200 border-base-300 p-4 transition-all duration-200 active:scale-[0.98] hover:brightness-110"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏋️</span>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-xl text-base-content tracking-wide">
                    {division.name}
                  </span>
                </div>
                <p className="text-xs text-neutral-content mt-0.5">
                  Frequência: {division.frequency}x na semana
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-content shrink-0" />
          </div>
        </button>
      ))}

      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-content/30 bg-base-200/50 p-4 text-neutral-content transition-all duration-200 active:scale-[0.98] hover:bg-base-200 hover:text-base-content"
      >
        <Plus className="w-5 h-5" />
        <span className="font-medium">Criar Nova Divisão</span>
      </button>

      {/* Modal de Criação */}
      {isModalOpen && (
        <dialog className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box max-w-lg rounded-2xl border border-base-300 bg-base-200 p-0 overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-base-300 bg-linear-to-r from-primary/10 to-transparent">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-base-content leading-none">Criar Divisão de Treino</h3>
                    <p className="text-xs text-neutral-content mt-1">Organize seus dias de treino da semana</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-circle btn-sm"
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Fechar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreate} className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider">Nome da Divisão</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: PPL"
                  className="w-full bg-base-300 border border-base-300 text-base-content placeholder:text-neutral-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider">Frequência na semana</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="7"
                  className="w-full bg-base-300 border border-base-300 text-base-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  value={formData.frequency}
                  onChange={e => setFormData({...formData, frequency: parseInt(e.target.value)})}
                />
              </div>

              <div className="pt-1">
                <p className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider mb-2">Separações (Dias)</p>
                <div className="flex flex-col gap-2.5">
                  {splits.map((split, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        required
                        type="text"
                        placeholder={`Ex: ${index === 0 ? 'Push' : index === 1 ? 'Pull' : 'Legs'}`}
                        className="w-full bg-base-300 border border-base-300 text-base-content placeholder:text-neutral-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                        value={split.name}
                        onChange={e => handleSplitChange(index, e.target.value)}
                      />
                      {splits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSplit(index)}
                          className="btn btn-square btn-ghost text-error rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button type="button" onClick={handleAddSplit} className="btn btn-sm btn-outline rounded-xl mt-1 w-fit">
                <Plus className="w-4 h-4" /> Adicionar Dia
              </button>

              <div className="modal-action mt-2">
                <button type="button" className="btn btn-ghost rounded-xl" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary rounded-xl min-w-24" disabled={isSubmitting}>
                  {isSubmitting ? <span className="loading loading-spinner"></span> : "Salvar"}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setIsModalOpen(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
