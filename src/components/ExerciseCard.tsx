"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { workoutLogSchema, WorkoutLogFormData } from "@/lib/schemas";
import { db } from "@/lib/db";
import { useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, Pencil, PlayCircle, ChevronUp, GripVertical, Check } from "lucide-react";
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
          className="absolute inset-0 w-full h-full"
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
        className="w-full object-contain max-h-64"
        loading="lazy"
      />
    );
  }

  if (isVideo) {
    return (
      <video
        src={url}
        className="w-full max-h-64"
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

  const mutedStyle = { color: "var(--color-neutral-600)" };
  const accentTextStyle = { color: "var(--color-accent-700)" };

  return (
    <>
      <div className="bg-base-200 border" style={{ borderColor: "var(--color-divider)" }}>
        <div className="p-4 flex justify-between items-start gap-2.5" style={{ borderBottom: "1px solid var(--color-divider)" }}>
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {dragHandleListeners && (
              <button
                {...dragHandleListeners}
                {...dragHandleAttributes}
                className="shrink-0 mt-0.5 cursor-grab active:cursor-grabbing touch-none"
                style={mutedStyle}
                aria-label="Arrastar para reordenar"
                tabIndex={0}
              >
                <GripVertical className="w-4 h-4" />
              </button>
            )}
            <div
              className="w-6 h-6 shrink-0 mt-0.5 border-2 flex items-center justify-center"
              style={{
                borderColor: isCompleted ? "var(--color-accent)" : "var(--color-divider)",
                background: isCompleted ? "var(--color-accent)" : "transparent",
                color: "var(--color-base-100)",
              }}
              aria-hidden="true"
            >
              {isCompleted && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
            </div>
            <div className="min-w-0" style={isCompleted ? { opacity: 0.5, textDecoration: "line-through" } : undefined}>
              <div className="font-display text-base">{name}</div>
              <div className="text-[12.5px] mt-0.5" style={mutedStyle}>
                {muscleGroup}
                {repRange && <> · <span style={{ ...accentTextStyle, fontWeight: 600 }}>{repRange}</span></>}
                {!repRange && targetReps ? <> · <span style={{ ...accentTextStyle, fontWeight: 600 }}>{targetReps} reps</span></> : null}
              </div>
              {description && (
                <div className="text-xs mt-1.5 leading-relaxed" style={mutedStyle}>{description}</div>
              )}
            </div>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-2">
            {restTime > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider" style={mutedStyle}>Descanso</div>
                <div className="font-bold text-sm mt-0.5" style={accentTextStyle}>{restTime}s</div>
              </div>
            )}
            {isTraining && (
              <div>
                <div className="text-[10px] uppercase tracking-wider" style={mutedStyle}>Séries</div>
                <div className="font-display text-sm mt-0.5" style={isCompleted ? { color: "var(--color-accent)" } : accentTextStyle}>
                  {completedCount}/{targetSets}
                </div>
              </div>
            )}
            {!isTraining && (
              <div className="flex gap-1.5">
                {onEdit && (
                  <button onClick={onEdit} title="Editar exercício" style={mutedStyle}>
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setShowDeleteModal(true)} title="Remover exercício" style={accentTextStyle}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {videoUrl && (
          <div style={{ borderBottom: "1px solid var(--color-divider)" }}>
            <button
              onClick={() => setShowVideo(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold"
              style={accentTextStyle}
            >
              <span className="flex items-center gap-1.5">
                <PlayCircle className="w-3.5 h-3.5" fill="currentColor" stroke="none" />
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
                <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={mutedStyle}>
                  Peso (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  className="input font-display text-lg"
                  style={errors.weight ? { borderColor: "var(--color-accent)" } : undefined}
                  {...register("weight", { valueAsNumber: true })}
                />
                {errors.weight && (
                  <span className="text-[10px] mt-1 block" style={accentTextStyle}>{errors.weight.message}</span>
                )}
              </div>

              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={mutedStyle}>
                  Repetições
                </label>
                <input
                  type="number"
                  placeholder="0"
                  className="input font-display text-lg"
                  style={errors.reps ? { borderColor: "var(--color-accent)" } : undefined}
                  {...register("reps", { valueAsNumber: true })}
                />
                {errors.reps && (
                  <span className="text-[10px] mt-1 block" style={accentTextStyle}>{errors.reps.message}</span>
                )}
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-center" style={accentTextStyle}>{errorMsg}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 text-sm font-semibold"
              style={
                saved
                  ? { background: "var(--color-accent-100)", color: "var(--color-accent-700)" }
                  : isCompleted
                    ? { background: "var(--color-base-300)", color: "var(--color-base-content)" }
                    : { background: "var(--color-accent)", color: "var(--color-primary-content)" }
              }
            >
              {saved ? "Série Registrada!" : isCompleted ? "Adicionar Série Extra" : "Registrar Série"}
            </button>
          </form>
        </div>
        )}
      </div>

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "color-mix(in srgb, var(--color-base-content) 50%, transparent)" }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="w-full max-w-sm bg-base-100 p-5 flex flex-col gap-3"
            style={{ border: "1px solid var(--color-divider)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg">Remover exercício</h3>
            <p className="text-sm" style={mutedStyle}>Tem certeza que deseja remover <strong style={{ color: "var(--color-base-content)" }}>{name}</strong>?</p>
            <div className="flex justify-end gap-2 mt-2">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
              <button className="btn" style={{ background: "var(--color-accent)", color: "var(--color-primary-content)" }} onClick={confirmDelete}>Remover</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
