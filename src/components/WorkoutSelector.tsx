"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
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
            <ChevronRight className="w-4 h-4 text-neutral-content flex-shrink-0" />
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
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Criar Divisão de Treino</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Nome da Divisão (ex: PPL)</span></label>
                <input required type="text" className="input input-bordered" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Frequência na semana (ex: 3)</span></label>
                <input required type="number" min="1" max="7" className="input input-bordered" value={formData.frequency} onChange={e => setFormData({...formData, frequency: parseInt(e.target.value)})} />
              </div>
              
              <div className="divider my-2">Separações (Dias)</div>
              
              {splits.map((split, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input 
                    required 
                    type="text" 
                    placeholder={`Ex: ${index === 0 ? 'Push' : index === 1 ? 'Pull' : 'Legs'}`} 
                    className="input input-bordered flex-1" 
                    value={split.name} 
                    onChange={e => handleSplitChange(index, e.target.value)} 
                  />
                  {splits.length > 1 && (
                    <button type="button" onClick={() => handleRemoveSplit(index)} className="btn btn-square btn-ghost text-error">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              
              <button type="button" onClick={handleAddSplit} className="btn btn-sm btn-outline mt-2">
                <Plus className="w-4 h-4" /> Adicionar Dia
              </button>

              <div className="modal-action mt-6">
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
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
