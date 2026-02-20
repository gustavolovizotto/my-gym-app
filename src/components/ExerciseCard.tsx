"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { workoutLogSchema, WorkoutLogFormData } from "@/lib/schemas";
import { db } from "@/lib/db";
import { useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ExerciseCardProps {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  workoutId: string;
  splitId: string;
  restTime: number;
  targetSets: number;
  onDeleted?: () => void;
}

export function ExerciseCard({ exerciseId, name, muscleGroup, workoutId, splitId, restTime, targetSets, onDeleted }: ExerciseCardProps) {
  const [saved, setSaved] = useState(false);
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
      reset();
      
      // Inicia o timer de descanso local
      if (restTime > 0) {
        scheduleLocalRestTimer(restTime);
      }

      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save log locally:", error);
    }
  };

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja remover este exercício?")) {
      const { error } = await supabase.from("exercises").delete().eq("id", exerciseId);
      if (!error && onDeleted) {
        onDeleted();
      } else if (error) {
        console.error("Erro ao deletar exercício:", error);
      }
    }
  };

  return (
    <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
      <div className="p-4 border-b border-base-300 flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-display text-xl text-base-content tracking-wide">{name}</h3>
          <p className="text-xs text-neutral-content font-medium">{muscleGroup}</p>
        </div>
        <div className="flex items-center gap-4 text-right">
          {restTime > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider block">Descanso</span>
              <span className="text-sm font-display text-primary">{restTime}s</span>
            </div>
          )}
          <div>
            <span className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider block">Séries</span>
            <span className={`text-sm font-display ${isCompleted ? 'text-success' : 'text-primary'}`}>
              {completedCount}/{targetSets}
            </span>
          </div>
          <button 
            onClick={handleDelete} 
            className="btn btn-ghost btn-sm btn-circle text-error ml-1"
            title="Remover exercício"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

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
    </div>
  );
}
