"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { SyncBadge } from "@/components/SyncBadge";
import { ExerciseCard } from "@/components/ExerciseCard";
import { WorkoutCompleteModal } from "@/components/WorkoutCompleteModal";
import { ArrowLeft, Plus, ChevronRight, Trash2, X, Dumbbell, Play } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useXP, CompleteWorkoutResult } from "@/hooks/useXP";
import { useWorkoutSession } from "@/hooks/useWorkoutSession";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  rep_range?: string;
  description?: string;
  video_url?: string;
}

function SortableExerciseCard({
  exercise,
  workoutId,
  splitId,
  onDeleted,
  onEdit,
  isTraining,
}: {
  exercise: Exercise;
  workoutId: string;
  splitId: string;
  onDeleted?: () => void;
  onEdit?: () => void;
  isTraining?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ExerciseCard
        exerciseId={exercise.id}
        name={exercise.name}
        muscleGroup={exercise.muscle_group}
        workoutId={workoutId}
        splitId={splitId}
        restTime={exercise.rest_time || 90}
        targetSets={exercise.target_sets || 3}
        repRange={exercise.rep_range}
        description={exercise.description}
        videoUrl={exercise.video_url}
        onDeleted={onDeleted}
        onEdit={onEdit}
        isTraining={isTraining}
        dragHandleListeners={listeners as Record<string, (...args: unknown[]) => void>}
        dragHandleAttributes={attributes}
      />
    </div>
  );
}

function TodayWorkoutSelection() {
  const router = useRouter();
  const [divisions, setDivisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDivisionsAndSplits = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Tentar carregar do Dexie primeiro (Offline-first)
      try {
        const localDivisions = await db.workout_divisions.where("user_id").equals(session.user.id).toArray();
        const localSplits = await db.workout_splits.toArray();
        
        if (localDivisions.length > 0) {
          const sortedData = localDivisions.map(div => ({
            ...div,
            workout_splits: localSplits
              .filter(split => split.division_id === div.id)
              .sort((a, b) => a.order_index - b.order_index)
          })).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          
          setDivisions(sortedData);
          setLoading(false);
        }
      } catch (err) {
        console.error("Erro ao carregar do Dexie:", err);
      }

      // 2. Buscar do Supabase em background e atualizar Dexie
      try {
        const { data, error } = await supabase
          .from("workout_divisions")
          .select(`
            id,
            name,
            created_at,
            workout_splits (
              id,
              name,
              order_index
            )
          `)
          .eq("user_id", session.user.id)
          .order("created_at");

        if (error) {
          console.error("Erro do Supabase:", error);
        }

        if (data) {
          // Atualizar Dexie
          await db.transaction('rw', db.workout_divisions, db.workout_splits, async () => {
            for (const div of data) {
              await db.workout_divisions.put({
                id: div.id,
                user_id: session.user.id,
                name: div.name,
                created_at: div.created_at
              });
              
              for (const split of div.workout_splits) {
                await db.workout_splits.put({
                  id: split.id,
                  division_id: div.id,
                  name: split.name,
                  order_index: split.order_index,
                  created_at: new Date().toISOString() // Fallback since it's not in the DB
                });
              }
            }
          });

          // Sort splits by order_index
          const sortedData = data.map(div => ({
            ...div,
            workout_splits: div.workout_splits.sort((a: any, b: any) => a.order_index - b.order_index)
          }));
          setDivisions(sortedData);
        }
      } catch (err) {
        console.error("Erro ao buscar do Supabase (offline?):", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDivisionsAndSplits();
  }, []);

  const handleDeleteDivision = async (divisionId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta divisão e todos os seus treinos?")) return;

    // 1. Deletar do Supabase
    const { error } = await supabase
      .from("workout_divisions")
      .delete()
      .eq("id", divisionId);

    if (error) {
      console.error("Erro ao deletar divisão:", error);
      alert("Erro ao deletar divisão.");
      return;
    }

    // 2. Deletar do Dexie (Local)
    await db.transaction('rw', db.workout_divisions, db.workout_splits, async () => {
      await db.workout_divisions.delete(divisionId);
      const splitsToDelete = await db.workout_splits.where("division_id").equals(divisionId).toArray();
      for (const split of splitsToDelete) {
        await db.workout_splits.delete(split.id);
      }
    });

    // 3. Atualizar estado local
    setDivisions(prev => prev.filter(div => div.id !== divisionId));
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <span className="loading loading-spinner text-primary"></span>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
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
              <div className="flex items-center justify-between px-2">
                <h2 className="font-display text-xl text-base-content/80">
                  {division.name}
                </h2>
                <button 
                  onClick={() => handleDeleteDivision(division.id)}
                  className="btn btn-ghost btn-sm btn-circle text-error"
                  title="Excluir Divisão"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setExercises((prev) => {
        const oldIndex = prev.findIndex((e) => e.id === active.id);
        const newIndex = prev.findIndex((e) => e.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseMuscle, setNewExerciseMuscle] = useState("");
  const [newExerciseRestTime, setNewExerciseRestTime] = useState(90);
  const [newExerciseTargetSets, setNewExerciseTargetSets] = useState(3);
  const [newExerciseRepRange, setNewExerciseRepRange] = useState("");
  const [newExerciseDescription, setNewExerciseDescription] = useState("");
  const [newExerciseVideoUrl, setNewExerciseVideoUrl] = useState("");

  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editName, setEditName] = useState("");
  const [editMuscle, setEditMuscle] = useState("");
  const [editRestTime, setEditRestTime] = useState(90);
  const [editTargetSets, setEditTargetSets] = useState(3);
  const [editRepRange, setEditRepRange] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");

  const { completeWorkout } = useXP();
  const [completeResult, setCompleteResult] = useState<CompleteWorkoutResult | null>(null);
  const [finishing, setFinishing] = useState(false);

  const { session, isTraining, loaded: sessionLoaded, startSession, endSession } = useWorkoutSession(splitId);
  const workoutId = session?.workoutId ?? "none";

  const logs = useLiveQuery(
    () => workoutId !== "none" ? db.workout_logs.where("workout_id").equals(workoutId).toArray() : [],
    [workoutId]
  );

  const currentVolume = logs?.reduce((acc, log) => acc + log.weight * log.reps, 0) || 0;

  const fetchExercises = async () => {
    if (!splitId) return;
    
    setLoading(true);
    
    // 1. Tentar carregar do Dexie primeiro (Offline-first)
    try {
      const localSplit = await db.workout_splits.get(splitId);
      if (localSplit) {
        setSplitName(localSplit.name);
        setDivisionId(localSplit.division_id);
      }

      const localExercises = await db.exercises.where("split_id").equals(splitId).toArray();
      if (localExercises.length > 0) {
        setExercises(localExercises);
        setLoading(false);
      }
    } catch (err) {
      console.error("Erro ao carregar exercícios do Dexie:", err);
    }

    // 2. Buscar do Supabase em background e atualizar Dexie
    try {
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
        // Atualizar Dexie
        await db.transaction('rw', db.exercises, async () => {
          for (const ex of data) {
            await db.exercises.put({
              id: ex.id,
              name: ex.name,
              muscle_group: ex.muscle_group,
              split_id: ex.split_id,
              rest_time: ex.rest_time,
              target_sets: ex.target_sets,
              rep_range: ex.rep_range ?? undefined,
              description: ex.description ?? undefined,
              video_url: ex.video_url ?? undefined,
            });
          }
        });
        setExercises(data);
      } else {
        console.error("Error fetching exercises:", error);
      }
    } catch (err) {
      console.error("Erro ao buscar exercícios do Supabase (offline?):", err);
    } finally {
      setLoading(false);
    }
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
        rep_range: newExerciseRepRange || null,
        description: newExerciseDescription || null,
        video_url: newExerciseVideoUrl || null,
        user_id: session.user.id,
      }
    ]);

    if (!error) {
      setIsModalOpen(false);
      setNewExerciseName("");
      setNewExerciseMuscle("");
      setNewExerciseRestTime(90);
      setNewExerciseTargetSets(3);
      setNewExerciseRepRange("");
      setNewExerciseDescription("");
      setNewExerciseVideoUrl("");
      fetchExercises();
    } else {
      console.error("Erro ao adicionar exercício:", error);
    }
  };

  const openEditModal = (ex: Exercise) => {
    setEditingExercise(ex);
    setEditName(ex.name);
    setEditMuscle(ex.muscle_group);
    setEditRestTime(ex.rest_time);
    setEditTargetSets(ex.target_sets);
    setEditRepRange(ex.rep_range ?? "");
    setEditDescription(ex.description ?? "");
    setEditVideoUrl(ex.video_url ?? "");
  };

  const handleEditExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExercise) return;

    const { error } = await supabase.from("exercises").update({
      name: editName,
      muscle_group: editMuscle,
      rest_time: editRestTime,
      target_sets: editTargetSets,
      rep_range: editRepRange || null,
      description: editDescription || null,
      video_url: editVideoUrl || null,
    }).eq("id", editingExercise.id);

    if (!error) {
      setEditingExercise(null);
      fetchExercises();
    } else {
      console.error("Erro ao editar exercício:", error);
    }
  };

  if (!splitId) {
    return <TodayWorkoutSelection />;
  }

  if (!sessionLoaded) {
    return (
      <div className="flex justify-center p-8">
        <span className="loading loading-spinner text-primary"></span>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => {
            if (isTraining) {
              if (!confirm("Você tem um treino em andamento. Deseja sair? Seu progresso será mantido.")) return;
            }
            router.push(divisionId ? `/division/${divisionId}` : "/");
          }} className="btn btn-circle btn-sm btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl text-base-content tracking-wide leading-none">
              Treino {splitName}
            </h1>
            <p className="text-xs text-neutral-content">
              {isTraining ? "Em andamento" : "Visualização"}
            </p>
          </div>
        </div>
        <SyncBadge />
      </header>

      {isTraining && (
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
      )}

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={exercises.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-4">
                {exercises.map((ex) => (
                  <SortableExerciseCard
                    key={ex.id}
                    exercise={ex}
                    workoutId={workoutId}
                    splitId={splitId}
                    onDeleted={isTraining ? undefined : fetchExercises}
                    onEdit={isTraining ? undefined : () => openEditModal(ex)}
                    isTraining={isTraining}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {!isTraining && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-content/30 bg-base-200/50 p-4 text-neutral-content transition-all duration-200 active:scale-[0.98] hover:bg-base-200 hover:text-base-content"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Adicionar Exercício</span>
          </button>
        )}
      </div>

      <div className="mt-8 mb-4">
        {!isTraining ? (
          <button
            onClick={() => startSession()}
            className="btn btn-primary w-full rounded-xl font-display text-xl tracking-wide h-14 gap-2"
          >
            <Play className="w-6 h-6" />
            Iniciar Treino
          </button>
        ) : (
          <button
            onClick={async () => {
              if (finishing) return;
              if (!confirm("Deseja finalizar o treino?")) return;
              setFinishing(true);
              const result = await completeWorkout(logs?.length ?? 0, currentVolume);
              endSession();
              setFinishing(false);
              if (result) {
                setCompleteResult(result);
              } else {
                router.push("/");
              }
            }}
            disabled={finishing}
            className="btn btn-error w-full rounded-xl font-display text-xl tracking-wide h-14"
          >
            {finishing ? <span className="loading loading-spinner loading-sm" /> : "Finalizar Treino"}
          </button>
        )}
      </div>

      {completeResult && (
        <WorkoutCompleteModal
          result={completeResult}
          numSets={logs?.length ?? 0}
          sessionVolume={currentVolume}
        />
      )}

      {/* Modal de Edição de Exercício */}
      {editingExercise && (
        <dialog className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box max-w-lg rounded-2xl border border-base-300 bg-base-200 p-0 overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-base-300 bg-linear-to-r from-primary/10 to-transparent">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-base-content leading-none">Editar Exercício</h3>
                    <p className="text-xs text-neutral-content mt-1">{editingExercise.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-circle btn-sm"
                  onClick={() => setEditingExercise(null)}
                  aria-label="Fechar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleEditExercise} className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider">Nome do Exercício</label>
                <input
                  required
                  type="text"
                  className="w-full bg-base-300 border border-base-300 text-base-content placeholder:text-neutral-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider">Grupo Muscular (Opcional)</label>
                <input
                  type="text"
                  className="w-full bg-base-300 border border-base-300 text-base-content placeholder:text-neutral-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  value={editMuscle}
                  onChange={e => setEditMuscle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider">Descanso (s)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="15"
                    className="w-full bg-base-300 border border-base-300 text-base-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    value={editRestTime}
                    onChange={e => setEditRestTime(parseInt(e.target.value))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider">Séries alvo</label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="w-full bg-base-300 border border-base-300 text-base-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    value={editTargetSets}
                    onChange={e => setEditTargetSets(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider">Repetições (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: 8-12"
                  className="w-full bg-base-300 border border-base-300 text-base-content placeholder:text-neutral-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  value={editRepRange}
                  onChange={e => setEditRepRange(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider">Descrição (Opcional)</label>
                <textarea
                  rows={3}
                  className="w-full bg-base-300 border border-base-300 text-base-content placeholder:text-neutral-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider">Vídeo / GIF (Opcional)</label>
                <input
                  type="url"
                  placeholder="Ex: https://youtube.com/watch?v=..."
                  className="w-full bg-base-300 border border-base-300 text-base-content placeholder:text-neutral-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  value={editVideoUrl}
                  onChange={e => setEditVideoUrl(e.target.value)}
                />
                <p className="text-[10px] text-neutral-content">Suporta YouTube, Shorts, links de vídeo (.mp4) e GIFs</p>
              </div>

              <div className="modal-action mt-2">
                <button type="button" className="btn btn-ghost rounded-xl" onClick={() => setEditingExercise(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary rounded-xl px-6">
                  Salvar
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setEditingExercise(null)}>close</button>
          </form>
        </dialog>
      )}

      {/* Modal de Criação de Exercício */}
      {isModalOpen && (
        <dialog className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box max-w-lg rounded-2xl border border-base-300 bg-base-200 p-0 overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-base-300 bg-linear-to-r from-primary/10 to-transparent">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-base-content leading-none">Adicionar Exercício</h3>
                    <p className="text-xs text-neutral-content mt-1">Crie um novo exercício para este treino</p>
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

            <form onSubmit={handleAddExercise} className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider">Nome do Exercício</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Supino reto"
                  className="w-full bg-base-300 border border-base-300 text-base-content placeholder:text-neutral-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  value={newExerciseName}
                  onChange={e => setNewExerciseName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider">Grupo Muscular (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Peito"
                  className="w-full bg-base-300 border border-base-300 text-base-content placeholder:text-neutral-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  value={newExerciseMuscle}
                  onChange={e => setNewExerciseMuscle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider">Descanso (s)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="15"
                    className="w-full bg-base-300 border border-base-300 text-base-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    value={newExerciseRestTime}
                    onChange={e => setNewExerciseRestTime(parseInt(e.target.value))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider">Séries alvo</label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="w-full bg-base-300 border border-base-300 text-base-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    value={newExerciseTargetSets}
                    onChange={e => setNewExerciseTargetSets(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider">Repetições (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: 8-12"
                  className="w-full bg-base-300 border border-base-300 text-base-content placeholder:text-neutral-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  value={newExerciseRepRange}
                  onChange={e => setNewExerciseRepRange(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider">Descrição (Opcional)</label>
                <textarea
                  placeholder="Ex: Pegada pronada, cotovelos a 45°"
                  rows={3}
                  className="w-full bg-base-300 border border-base-300 text-base-content placeholder:text-neutral-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none"
                  value={newExerciseDescription}
                  onChange={e => setNewExerciseDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider">Vídeo / GIF (Opcional)</label>
                <input
                  type="url"
                  placeholder="Ex: https://youtube.com/watch?v=..."
                  className="w-full bg-base-300 border border-base-300 text-base-content placeholder:text-neutral-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  value={newExerciseVideoUrl}
                  onChange={e => setNewExerciseVideoUrl(e.target.value)}
                />
                <p className="text-[10px] text-neutral-content">Suporta YouTube, Shorts, links de vídeo (.mp4) e GIFs</p>
              </div>

              <div className="modal-action mt-2">
                <button type="button" className="btn btn-ghost rounded-xl" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary rounded-xl px-6">
                  Adicionar
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

export default function WorkoutPage() {
  return (
    <Suspense fallback={<div className="p-4">Carregando...</div>}>
      <WorkoutContent />
    </Suspense>
  );
}
