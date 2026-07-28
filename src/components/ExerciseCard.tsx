"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { workoutLogSchema, WorkoutLogFormData } from "@/lib/schemas";
import { db } from "@/lib/db";
import { useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, Pencil, PlayCircle, ChevronUp, GripVertical } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { DraggableAttributes } from "@dnd-kit/core";

interface ExerciseCardProps {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  workoutId: string;
  splitId: string;
  restTime: number;
  targetSets: number;
  targetReps?: number;
  repRange?: string;
  description?: string;
  videoUrl?: string;
  onDeleted?: () => void;
  onEdit?: () => void;
  isTraining?: boolean;
  dragHandleListeners?: Record<string, (...args: unknown[]) => void>;
  dragHandleAttributes?: DraggableAttributes;
}

function getYoutubeEmbedUrl(url: string): string | null {
  const watchMatch = url.match(/youtube\.com\/watch\?v=([\w-]+)/);
  if (watchMatch) return `https://www.youtube-nocookie.com/embed/${watchMatch[1]}`;
  const shortMatch = url.match(/youtu\.be\/([\w-]+)/);
  if (shortMatch) return `https://www.youtube-nocookie.com/embed/${shortMatch[1]}`;
  const shortsMatch = url.match(/youtube\.com\/shorts\/([\w-]+)/);
  if (shortsMatch) return `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}`;
  return null;
}

function VideoPreview({ url }: { url: string }) {
  const youtubeEmbed = getYoutubeEmbedUrl(url);
  const isGif = /\.(gif)$/i.test(url) || url.includes("giphy.com") || url.includes("tenor.com");
  const isVideo = /\.(mp4|webm|ogg)$/i.test(url);

  if (youtubeEmbed) {
    return (
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={youtubeEmbed}
          className="absolute inset-0 w-full h-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  if (isGif) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Execucao do exercicio"
        className="w-full rounded-lg object-contain max-h-64"
        loading="lazy"
      />
    );
  }

  if (isVideo) {
    return (
      <video
        src={url}
        className="w-full rounded-lg max-h-64"
        controls
        playsInline
        loop
      />
    );
  }

  // Fallback: link externo
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary text-sm underline break-all"
    >
      Ver vídeo externo
    </a>
  );
}

export function ExerciseCard({ exerciseId, name, muscleGroup, workoutId, splitId, restTime, targetSets, targetReps, repRange, description, videoUrl, onDeleted, onEdit, isTraining = false, dragHandleListeners, dragHandleAttributes }: ExerciseCardProps) {
  const [saved, setSaved] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { scheduleLocalRestTimer } = usePushNotifications();

  const completedLogs = useLiveQuery(
    () => db.workout_logs.where("workout_id").equals(workoutId).filter(log => log.exercise_id === exerciseId).toArray(),
    [workoutId, exerciseId]
  );

  const completedCount = completedLogs?.length || 0;
  const isCompleted = completedCount >= targetSets;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<WorkoutLogFormData>({
    resolver: zodResolver(workoutLogSchema),
  });

  const onSubmit = async (data: WorkoutLogFormData) => {
    try {
      await db.workout_logs.add({
        workout_id: workoutId,
        split_id: splitId,
        exercise_id: exerciseId,
        weight: data.weight,
        reps: data.reps,
        timestamp: new Date().toISOString(),
        is_synced: 0,
      });
      setSaved(true);
      setErrorMsg(null);
      reset();

      if (restTime > 0) {
        scheduleLocalRestTimer(restTime);
      }

      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save log locally:", error);
      setErrorMsg("Falha ao salvar a série. Tente novamente.");
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    const { error } = await supabase.from("exercises").delete().eq("id", exerciseId);
    if (!error && onDeleted) {
      onDeleted();
    } else if (error) {
      console.error("Erro ao deletar exercício:", error);
      setErrorMsg("Erro ao remover exercício. Tente novamente.");
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  return (
    <>
      <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
        <div className="p-4 border-b border-base-300 flex items-center justify-between">
          {dragHandleListeners && (
            <button
              {...dragHandleListeners}
              {...dragHandleAttributes}
              className="btn btn-ghost btn-sm btn-circle cursor-grab active:cursor-grabbing text-neutral-content mr-2 shrink-0 touch-none"
              aria-label="Arrastar para reordenar"
              tabIndex={0}
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          <div className="flex-1">
            <h3 className="font-display text-xl text-base-content tracking-wide">{name}</h3>
            <p className="text-xs text-neutral-content font-medium">{muscleGroup}</p>
            {repRange && (
              <p className="text-xs text-primary font-semibold mt-0.5">{repRange} reps</p>
            )}
            {description && (
              <p className="text-xs text-neutral-content/70 mt-1 leading-snug">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-right">
            {restTime > 0 && (
              <div>
                <span className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider block">Descanso</span>
                <span className="text-sm font-display text-primary">{restTime}s</span>
              </div>
            )}
            {targetReps && (
              <div>
                <span className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider block">Reps</span>
                <span className="text-sm font-display text-base-content">{targetReps}</span>
              </div>
            )}
            {isTraining && (
              <div>
                <span className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider block">Séries</span>
                <span className={`text-sm font-display ${isCompleted ? 'text-success' : 'text-primary'}`}>
                  {completedCount}/{targetSets}
                </span>
              </div>
            )}
            {!isTraining && onEdit && (
              <button
                onClick={onEdit}
                className="btn btn-ghost btn-sm btn-circle text-neutral-content ml-1"
                title="Editar exercício"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {!isTraining && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-ghost btn-sm btn-circle text-error"
                title="Remover exercício"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {videoUrl && (
          <div className="border-b border-base-300">
            <button
              onClick={() => setShowVideo(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-primary hover:bg-base-300/50 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <PlayCircle className="w-3.5 h-3.5" />
                Ver execução
              </span>
              <ChevronUp className={`w-3.5 h-3.5 transition-transform duration-200 ${showVideo ? "" : "rotate-180"}`} />
            </button>
            {showVideo && (
              <div className="px-4 pb-4">
                <VideoPreview url={videoUrl} />
              </div>
            )}
          </div>
        )}

        {isTraining && (
        <div className="p-4 bg-base-100/50">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider mb-1.5 block">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  className={`w-full bg-base-300 border border-base-300 text-base-content placeholder:text-neutral-content rounded-lg px-3 py-2.5 text-lg font-display tracking-wide focus:outline-none focus:ring-1 focus:ring-primary ${errors.weight ? "border-error focus:ring-error" : ""}`}
                  {...register("weight", { valueAsNumber: true })}
                />
                {errors.weight && (
                  <span className="text-error text-[10px] mt-1 block">{errors.weight.message}</span>
                )}
              </div>

              <div className="flex-1">
                <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider mb-1.5 block">
                  Repetições
                </label>
                <input
                  type="number"
                  placeholder="0"
                  className={`w-full bg-base-300 border border-base-300 text-base-content placeholder:text-neutral-content rounded-lg px-3 py-2.5 text-lg font-display tracking-wide focus:outline-none focus:ring-1 focus:ring-primary ${errors.reps ? "border-error focus:ring-error" : ""}`}
                  {...register("reps", { valueAsNumber: true })}
                />
                {errors.reps && (
                  <span className="text-error text-[10px] mt-1 block">{errors.reps.message}</span>
                )}
              </div>
            </div>

            {errorMsg && (
              <p className="text-error text-xs text-center">{errorMsg}</p>
            )}

            <button
              type="submit"
              className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                saved
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : isCompleted
                    ? "bg-base-300 text-base-content hover:brightness-110 active:scale-[0.98]"
                    : "bg-primary text-primary-content hover:brightness-110 active:scale-[0.98]"
              }`}
            >
              {saved ? "Série Registrada!" : isCompleted ? "Adicionar Série Extra" : "Registrar Série"}
            </button>
          </form>
        </div>
        )}
      </div>

      {showDeleteModal && (
        <dialog className="modal modal-open" aria-modal="true">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Remover exercício</h3>
            <p className="py-4">Tem certeza que deseja remover <strong>{name}</strong>?</p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
              <button className="btn btn-error" onClick={confirmDelete}>Remover</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)} />
        </dialog>
      )}
    </>
  );
}
