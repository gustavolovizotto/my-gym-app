"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { workoutLogSchema, WorkoutLogFormData } from "@/lib/schemas";
import { db } from "@/lib/db";
import { useState } from "react";

interface ExerciseCardProps {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  workoutId: string;
}

export function ExerciseCard({ exerciseId, name, muscleGroup, workoutId }: ExerciseCardProps) {
  const [saved, setSaved] = useState(false);

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
        exercise_id: exerciseId,
        weight: data.weight,
        reps: data.reps,
        timestamp: new Date().toISOString(),
        is_synced: 0,
      });
      setSaved(true);
      reset();
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save log locally:", error);
    }
  };

  return (
    <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
      <div className="p-4 border-b border-base-300 flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl text-base-content tracking-wide">{name}</h3>
          <p className="text-xs text-neutral-content font-medium">{muscleGroup}</p>
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
                : "bg-primary text-primary-content hover:brightness-110 active:scale-[0.98]"
            }`}
          >
            {saved ? "Série Registrada!" : "Registrar Série"}
          </button>
        </form>
      </div>
    </div>
  );
}
