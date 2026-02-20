"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { SyncBadge } from "@/components/SyncBadge";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ArrowLeft, Plus, ChevronRight } from "lucide-react";
import { Suspense, useMemo, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  split_id: string;
  rest_time: number;
  target_sets: number;
}

function TodayWorkoutSelection() {
  const router = useRouter();
  const [divisions, setDivisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDivisionsAndSplits = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch divisions with their splits
      const { data, error } = await supabase
        .from("workout_divisions")
        .select(`
          id,
          name,
          workout_splits (
            id,
            name,
            order_index
          )
        `)
        .eq("user_id", session.user.id)
        .order("created_at");

      if (data) {
        // Sort splits by order_index
        const sortedData = data.map(div => ({
          ...div,
          workout_splits: div.workout_splits.sort((a: any, b: any) => a.order_index - b.order_index)
        }));
        setDivisions(sortedData);
      }
      setLoading(false);
    };

    fetchDivisionsAndSplits();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <span className="loading loading-spinner text-primary"></span>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <header className="mb-8 text-center">
        <h1 className="font-display text-3xl text-base-content tracking-wide leading-tight uppercase">
          O que você vai<br/><span className="text-primary">treinar hoje?</span>
        </h1>
      </header>

      <div className="flex flex-col gap-6">
        {divisions.length === 0 ? (
          <div className="text-center p-4 text-neutral-content text-sm">
            Nenhuma divisão cadastrada. Vá para a Home para criar uma!
          </div>
        ) : (
          divisions.map((division) => (
            <div key={division.id} className="flex flex-col gap-3">
              <h2 className="font-display text-xl text-base-content/80 px-2">
                {division.name}
              </h2>
              <div className="flex flex-col gap-2">
                {division.workout_splits.map((split: any) => (
                  <button
                    key={split.id}
                    onClick={() => router.push(`/workout?split=${split.id}`)}
                    className="w-full text-left rounded-xl border bg-base-200 border-base-300 p-4 transition-all duration-200 active:scale-[0.98] hover:brightness-110"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xl text-base-content tracking-wide">
                        {split.name}
                      </span>
                      <ChevronRight className="w-5 h-5 text-neutral-content" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function WorkoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const splitId = searchParams.get("split");

  const [splitName, setSplitName] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseMuscle, setNewExerciseMuscle] = useState("");
  const [newExerciseRestTime, setNewExerciseRestTime] = useState(90);
  const [newExerciseTargetSets, setNewExerciseTargetSets] = useState(3);

  const workoutId = useMemo(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `workout-${Date.now()}`;
  }, []); // Unique ID for this session

  const logs = useLiveQuery(
    () => db.workout_logs.where("workout_id").equals(workoutId).toArray(),
    [workoutId]
  );

  const currentVolume = logs?.reduce((acc, log) => acc + log.weight * log.reps, 0) || 0;

  const fetchExercises = async () => {
    if (!splitId) return;
    
    setLoading(true);
    
    // Fetch Split Name and Division ID for back button
    const { data: splitData } = await supabase
      .from("workout_splits")
      .select("name, division_id")
      .eq("id", splitId)
      .single();

    if (splitData) {
      setSplitName(splitData.name);
      setDivisionId(splitData.division_id);
    }

    // Fetch exercises from Supabase that match the split
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .eq("split_id", splitId);

    if (data) {
      setExercises(data);
    } else {
      console.error("Error fetching exercises:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExercises();
  }, [splitId]);

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!splitId || !newExerciseName) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("exercises").insert([
      {
        split_id: splitId,
        name: newExerciseName,
        muscle_group: newExerciseMuscle,
        rest_time: newExerciseRestTime,
        target_sets: newExerciseTargetSets,
        user_id: session.user.id,
      }
    ]);

    if (!error) {
      setIsModalOpen(false);
      setNewExerciseName("");
      setNewExerciseMuscle("");
      setNewExerciseRestTime(90);
      setNewExerciseTargetSets(3);
      fetchExercises();
    } else {
      console.error("Erro ao adicionar exercício:", error);
    }
  };

  if (!splitId) {
    return <TodayWorkoutSelection />;
  }

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(divisionId ? `/division/${divisionId}` : "/")} className="btn btn-circle btn-sm btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl text-base-content tracking-wide leading-none">
              Treino {splitName}
            </h1>
            <p className="text-xs text-neutral-content">Em andamento</p>
          </div>
        </div>
        <SyncBadge />
      </header>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="bg-base-200 rounded-xl p-3 border border-base-300 flex flex-col gap-1">
          <div className="flex items-baseline gap-0.5">
            <span className="font-display text-xl text-primary leading-none">{currentVolume.toFixed(1)}</span>
            <span className="text-[10px] text-neutral-content">kg</span>
          </div>
          <p className="text-[10px] text-neutral-content leading-tight">Volume Total</p>
        </div>
        <div className="bg-base-200 rounded-xl p-3 border border-base-300 flex flex-col gap-1">
          <div className="flex items-baseline gap-0.5">
            <span className="font-display text-xl text-base-content leading-none">{logs?.length || 0}</span>
          </div>
          <p className="text-[10px] text-neutral-content leading-tight">Séries Concluídas</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex justify-center p-8">
            <span className="loading loading-spinner text-primary"></span>
          </div>
        ) : exercises.length === 0 ? (
          <div className="bg-base-200 rounded-xl border border-base-300 p-8 text-center">
            <p className="text-sm text-neutral-content">Nenhum exercício encontrado para este treino.</p>
          </div>
        ) : (
          exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exerciseId={ex.id}
              name={ex.name}
              muscleGroup={ex.muscle_group}
              workoutId={workoutId}
              splitId={splitId}
              restTime={ex.rest_time || 90}
              targetSets={ex.target_sets || 3}
              onDeleted={fetchExercises}
            />
          ))
        )}

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-content/30 bg-base-200/50 p-4 text-neutral-content transition-all duration-200 active:scale-[0.98] hover:bg-base-200 hover:text-base-content"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Adicionar Exercício</span>
        </button>
      </div>

      <div className="mt-8 mb-4">
        <button onClick={() => router.push("/")} className="btn btn-primary w-full rounded-xl font-display text-xl tracking-wide h-14">
          Finalizar Treino
        </button>
      </div>

      {/* Modal de Criação de Exercício */}
      {isModalOpen && (
        <dialog className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Adicionar Exercício</h3>
            <form onSubmit={handleAddExercise} className="flex flex-col gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Nome do Exercício</span></label>
                <input required type="text" className="input input-bordered" value={newExerciseName} onChange={e => setNewExerciseName(e.target.value)} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Grupo Muscular (Opcional)</span></label>
                <input type="text" className="input input-bordered" value={newExerciseMuscle} onChange={e => setNewExerciseMuscle(e.target.value)} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Tempo de Descanso (segundos)</span></label>
                <input required type="number" min="0" step="15" className="input input-bordered" value={newExerciseRestTime} onChange={e => setNewExerciseRestTime(parseInt(e.target.value))} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Séries Alvo</span></label>
                <input required type="number" min="1" className="input input-bordered" value={newExerciseTargetSets} onChange={e => setNewExerciseTargetSets(parseInt(e.target.value))} />
              </div>
              <div className="modal-action mt-6">
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Adicionar</button>
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

export default function WorkoutPage() {
  return (
    <Suspense fallback={<div className="p-4">Carregando...</div>}>
      <WorkoutContent />
    </Suspense>
  );
}
