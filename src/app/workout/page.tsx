"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { SyncBadge } from "@/components/SyncBadge";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ArrowLeft } from "lucide-react";
import { Suspense, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

// Mock data for exercises based on workout type
const MOCK_EXERCISES = {
  PPL: [
    { id: "1", name: "Supino Reto", muscleGroup: "Peito" },
    { id: "2", name: "Desenvolvimento", muscleGroup: "Ombro" },
    { id: "3", name: "Tríceps Testa", muscleGroup: "Tríceps" },
  ],
  "PPL+UP": [
    { id: "4", name: "Puxada Alta", muscleGroup: "Costas" },
    { id: "5", name: "Remada Curvada", muscleGroup: "Costas" },
    { id: "6", name: "Rosca Direta", muscleGroup: "Bíceps" },
  ],
  UP: [
    { id: "1", name: "Supino Reto", muscleGroup: "Peito" },
    { id: "4", name: "Puxada Alta", muscleGroup: "Costas" },
  ],
  ABC: [
    { id: "7", name: "Agachamento Livre", muscleGroup: "Pernas" },
    { id: "8", name: "Leg Press", muscleGroup: "Pernas" },
  ],
};

function WorkoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get("type") as keyof typeof MOCK_EXERCISES | null;

  const workoutId = useMemo(() => `workout-${Date.now()}`, []); // Mock workout ID for this session

  const logs = useLiveQuery(
    () => db.workout_logs.where("workout_id").equals(workoutId).toArray(),
    [workoutId]
  );

  const currentVolume = logs?.reduce((acc, log) => acc + log.weight * log.reps, 0) || 0;

  if (!type || !MOCK_EXERCISES[type]) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p>Treino não encontrado.</p>
        <button onClick={() => router.push("/")} className="btn btn-primary mt-4">
          Voltar
        </button>
      </div>
    );
  }

  const exercises = MOCK_EXERCISES[type];

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="btn btn-circle btn-sm btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl text-base-content tracking-wide leading-none">
              Treino {type}
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
        {exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exerciseId={ex.id}
            name={ex.name}
            muscleGroup={ex.muscleGroup}
            workoutId={workoutId}
          />
        ))}
      </div>

      <div className="mt-8 mb-4">
        <button onClick={() => router.push("/")} className="btn btn-primary w-full rounded-xl font-display text-xl tracking-wide h-14">
          Finalizar Treino
        </button>
      </div>
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
