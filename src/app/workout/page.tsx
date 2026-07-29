"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { SyncBadge } from "@/components/SyncBadge";
import { ExerciseCard } from "@/components/ExerciseCard";
import { WorkoutCompleteModal } from "@/components/WorkoutCompleteModal";
import { ArrowLeft, Plus, ChevronRight, Trash2, X, Dumbbell, Play } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useWorkoutSession, useAutoFinishSetting } from "@/hooks/useWorkoutSession";
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
  target_reps?: number;
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
        targetReps={exercise.target_reps}
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
                  user_id: session.user.id,
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
    <div className="px-5 pt-7 pb-2 flex flex-col gap-6">
      <header>
        <h1 className="font-display text-[26px] leading-tight">
          O que você vai
          <br />
          <span style={{ color: "var(--color-accent)" }}>treinar hoje?</span>
        </h1>
      </header>

      <div className="flex flex-col gap-6">
        {divisions.length === 0 ? (
          <div className="text-center p-4 text-sm" style={{ color: "var(--color-neutral-600)" }}>
            Nenhuma divisão cadastrada. Vá para a Home para criar uma!
          </div>
        ) : (
          divisions.map((division) => (
            <div key={division.id} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <h6>{division.name}</h6>
                <button
                  onClick={() => handleDeleteDivision(division.id)}
                  title="Excluir Divisão"
                  style={{ color: "var(--color-accent-700)" }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="border bg-base-200" style={{ borderColor: "var(--color-divider)" }}>
                {division.workout_splits.map((split: any, i: number) => (
                  <button
                    key={split.id}
                    onClick={() => router.push(`/workout?split=${split.id}`)}
                    className="w-full text-left flex items-center justify-between px-[18px] py-[18px]"
                    style={{
                      borderBottom: i < division.workout_splits.length - 1 ? "1px solid var(--color-divider)" : "none",
                    }}
                  >
                    <span className="font-display font-extrabold text-base">{split.name}</span>
                    <ChevronRight className="w-[18px] h-[18px]" style={{ color: "var(--color-neutral-600)" }} />
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
  const [newExerciseTargetReps, setNewExerciseTargetReps] = useState(12);
  const [newExerciseRepRange, setNewExerciseRepRange] = useState("");
  const [newExerciseDescription, setNewExerciseDescription] = useState("");
  const [newExerciseVideoUrl, setNewExerciseVideoUrl] = useState("");

  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editName, setEditName] = useState("");
  const [editMuscle, setEditMuscle] = useState("");
  const [editRestTime, setEditRestTime] = useState(90);
  const [editTargetSets, setEditTargetSets] = useState(3);
  const [editTargetReps, setEditTargetReps] = useState(12);
  const [editRepRange, setEditRepRange] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");

  const [showComplete, setShowComplete] = useState(false);

  const { session, isTraining, loaded: sessionLoaded, startSession, endSession } = useWorkoutSession(splitId);
  const { autoFinish } = useAutoFinishSetting();
  const workoutId = session?.workoutId ?? "none";

  const logs = useLiveQuery(
    () => workoutId !== "none" ? db.workout_logs.where("workout_id").equals(workoutId).toArray() : [],
    [workoutId]
  );

  const currentVolume = logs?.reduce((acc, log) => acc + log.weight * log.reps, 0) || 0;

  // Auto-finish: when all exercises have their target sets completed
  useEffect(() => {
    if (!autoFinish || !isTraining || showComplete || !logs || exercises.length === 0) return;

    const allCompleted = exercises.every((ex) => {
      const count = logs.filter((log) => log.exercise_id === ex.id).length;
      return count >= (ex.target_sets || 3);
    });

    if (allCompleted) {
      endSession();
      setShowComplete(true);
    }
  }, [autoFinish, isTraining, showComplete, logs, exercises, endSession]);

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
              target_reps: ex.target_reps ?? undefined,
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
        target_reps: newExerciseTargetReps,
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
      setNewExerciseTargetReps(12);
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
    setEditTargetReps(ex.target_reps ?? 12);
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
      target_reps: editTargetReps,
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
    <div className="px-5 pt-6 pb-2 flex flex-col gap-4">
      <header className="flex justify-between items-start gap-3">
        <div className="flex items-center gap-3.5">
          <button onClick={() => {
            if (isTraining) {
              if (!confirm("Você tem um treino em andamento. Deseja sair? Seu progresso será mantido.")) return;
            }
            router.push(divisionId ? `/division/${divisionId}` : "/");
          }} aria-label="Voltar">
            <ArrowLeft className="w-[22px] h-[22px]" />
          </button>
          <div>
            <h1 className="text-[22px] font-display leading-none">
              Treino {splitName}
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--color-neutral-600)" }}>
              {isTraining ? "Em andamento" : "Visualização"}
            </p>
          </div>
        </div>
        <SyncBadge />
      </header>

      {isTraining && (
        <div
          className="grid grid-cols-2 gap-px border"
          style={{ background: "var(--color-divider)", borderColor: "var(--color-divider)" }}
        >
          <div className="bg-base-100 p-3.5">
            <div className="font-display text-[19px] leading-none">{currentVolume.toFixed(1)}<span className="text-[11px] font-normal font-sans opacity-60 ml-0.5">kg</span></div>
            <div className="text-[10.5px] uppercase tracking-wider mt-1" style={{ color: "var(--color-neutral-600)" }}>Volume Total</div>
          </div>
          <div className="bg-base-100 p-3.5">
            <div className="font-display text-[19px] leading-none">{logs?.length || 0}</div>
            <div className="text-[10.5px] uppercase tracking-wider mt-1" style={{ color: "var(--color-neutral-600)" }}>Séries Concluídas</div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex justify-center p-8">
            <span className="loading loading-spinner text-primary"></span>
          </div>
        ) : exercises.length === 0 ? (
          <div className="bg-base-200 border p-8 text-center" style={{ borderColor: "var(--color-divider)" }}>
            <p className="text-sm" style={{ color: "var(--color-neutral-600)" }}>Nenhum exercício encontrado para este treino.</p>
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
            className="w-full flex items-center justify-start gap-2 p-4 bg-transparent font-display font-extrabold text-sm"
            style={{ border: "2px dashed var(--color-divider)" }}
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Adicionar Exercício
          </button>
        )}
      </div>

      <div className="mt-6 mb-4">
        {!isTraining ? (
          <button
            onClick={() => startSession()}
            className="w-full flex items-center justify-start gap-2 py-4 px-5 font-display text-lg"
            style={{ background: "var(--color-accent)", color: "var(--color-primary-content)" }}
          >
            <Play className="w-5 h-5" fill="currentColor" />
            Iniciar Treino
          </button>
        ) : (
          <button
            onClick={() => {
              if (!confirm("Deseja finalizar o treino?")) return;
              endSession();
              setShowComplete(true);
            }}
            className="w-full py-4 px-5 font-display text-lg text-left"
            style={{ background: "var(--color-accent)", color: "var(--color-primary-content)" }}
          >
            Finalizar Treino
          </button>
        )}
      </div>

      {showComplete && (
        <WorkoutCompleteModal
          numSets={logs?.length ?? 0}
          sessionVolume={currentVolume}
        />
      )}

      {/* Modal de Edição de Exercício */}
      {editingExercise && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "color-mix(in srgb, var(--color-base-content) 50%, transparent)" }}
          onClick={() => setEditingExercise(null)}
        >
          <div
            className="w-full max-w-lg flex flex-col bg-base-100 max-h-[85vh]"
            style={{ border: "1px solid var(--color-divider)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: "2px solid var(--color-divider)" }}>
              <div className="flex items-center gap-3">
                <Dumbbell className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                <div>
                  <h3 className="font-display text-xl leading-none">Editar Exercício</h3>
                  <p className="text-xs mt-1.5" style={{ color: "var(--color-neutral-600)" }}>{editingExercise.name}</p>
                </div>
              </div>
              <button type="button" onClick={() => setEditingExercise(null)} aria-label="Fechar modal" style={{ color: "var(--color-neutral-600)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditExercise} className="p-5 flex flex-col gap-4 overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "var(--color-neutral-600)" }}>Nome do Exercício</label>
                <input required type="text" className="input" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "var(--color-neutral-600)" }}>Grupo Muscular (Opcional)</label>
                <input type="text" className="input" value={editMuscle} onChange={e => setEditMuscle(e.target.value)} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs" style={{ color: "var(--color-neutral-600)" }}>Descanso (s)</label>
                  <input required type="number" min="0" step="15" className="input" value={editRestTime} onChange={e => setEditRestTime(parseInt(e.target.value))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs" style={{ color: "var(--color-neutral-600)" }}>Séries alvo</label>
                  <input required type="number" min="1" className="input" value={editTargetSets} onChange={e => setEditTargetSets(parseInt(e.target.value))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs" style={{ color: "var(--color-neutral-600)" }}>Reps alvo</label>
                  <input required type="number" min="1" className="input" value={editTargetReps} onChange={e => setEditTargetReps(parseInt(e.target.value))} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "var(--color-neutral-600)" }}>Faixa de Repetições (Opcional)</label>
                <input type="text" placeholder="Ex: 8-12" className="input" value={editRepRange} onChange={e => setEditRepRange(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "var(--color-neutral-600)" }}>Descrição (Opcional)</label>
                <textarea rows={3} className="input" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "var(--color-neutral-600)" }}>Vídeo / GIF (Opcional)</label>
                <input type="url" placeholder="Ex: https://youtube.com/watch?v=..." className="input" value={editVideoUrl} onChange={e => setEditVideoUrl(e.target.value)} />
                <p className="text-[10px]" style={{ color: "var(--color-neutral-600)" }}>Suporta YouTube, Shorts, links de vídeo (.mp4) e GIFs</p>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingExercise(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary px-6">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Criação de Exercício */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "color-mix(in srgb, var(--color-base-content) 50%, transparent)" }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg flex flex-col bg-base-100 max-h-[85vh]"
            style={{ border: "1px solid var(--color-divider)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: "2px solid var(--color-divider)" }}>
              <div className="flex items-center gap-3">
                <Dumbbell className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                <div>
                  <h3 className="font-display text-xl leading-none">Adicionar Exercício</h3>
                  <p className="text-xs mt-1.5" style={{ color: "var(--color-neutral-600)" }}>Crie um novo exercício para este treino</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} aria-label="Fechar modal" style={{ color: "var(--color-neutral-600)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExercise} className="p-5 flex flex-col gap-4 overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "var(--color-neutral-600)" }}>Nome do Exercício</label>
                <input required type="text" placeholder="Ex: Supino reto" className="input" value={newExerciseName} onChange={e => setNewExerciseName(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "var(--color-neutral-600)" }}>Grupo Muscular (Opcional)</label>
                <input type="text" placeholder="Ex: Peito" className="input" value={newExerciseMuscle} onChange={e => setNewExerciseMuscle(e.target.value)} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs" style={{ color: "var(--color-neutral-600)" }}>Séries alvo</label>
                  <input required type="number" min="1" className="input" value={newExerciseTargetSets} onChange={e => setNewExerciseTargetSets(parseInt(e.target.value))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs" style={{ color: "var(--color-neutral-600)" }}>Reps alvo</label>
                  <input required type="number" min="1" className="input" value={newExerciseTargetReps} onChange={e => setNewExerciseTargetReps(parseInt(e.target.value))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs" style={{ color: "var(--color-neutral-600)" }}>Descanso (s)</label>
                  <input required type="number" min="0" step="15" className="input" value={newExerciseRestTime} onChange={e => setNewExerciseRestTime(parseInt(e.target.value))} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "var(--color-neutral-600)" }}>Descrição / Observações (Opcional)</label>
                <textarea rows={3} placeholder="Ex: Foco na contração, descer controlado..." className="input" value={newExerciseDescription} onChange={e => setNewExerciseDescription(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "var(--color-neutral-600)" }}>Faixa de Repetições (Opcional)</label>
                <input type="text" placeholder="Ex: 8-12" className="input" value={newExerciseRepRange} onChange={e => setNewExerciseRepRange(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "var(--color-neutral-600)" }}>Vídeo / GIF (Opcional)</label>
                <input type="url" placeholder="Ex: https://youtube.com/watch?v=..." className="input" value={newExerciseVideoUrl} onChange={e => setNewExerciseVideoUrl(e.target.value)} />
                <p className="text-[10px]" style={{ color: "var(--color-neutral-600)" }}>Suporta YouTube, Shorts, links de vídeo (.mp4) e GIFs</p>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary px-6">
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
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
