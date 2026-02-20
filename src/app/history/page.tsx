"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { SyncBadge } from "@/components/SyncBadge";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const router = useRouter();
  const logs = useLiveQuery(() => db.workout_logs.orderBy("timestamp").reverse().toArray());

  const totalVolume = logs?.reduce((acc, log) => acc + log.weight * log.reps, 0) || 0;
  const totalWorkouts = new Set(logs?.map((log) => log.workout_id)).size;

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="btn btn-circle btn-sm btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl text-base-content tracking-wide leading-none">
              Histórico
            </h1>
            <p className="text-xs text-neutral-content">Sua evolução</p>
          </div>
        </div>
        <SyncBadge />
      </header>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="bg-base-200 rounded-xl p-3 border border-base-300 flex flex-col gap-1">
          <div className="flex items-baseline gap-0.5">
            <span className="font-display text-xl text-primary leading-none">{totalVolume.toFixed(1)}</span>
            <span className="text-[10px] text-neutral-content">kg</span>
          </div>
          <p className="text-[10px] text-neutral-content leading-tight">Volume Total</p>
        </div>
        <div className="bg-base-200 rounded-xl p-3 border border-base-300 flex flex-col gap-1">
          <div className="flex items-baseline gap-0.5">
            <span className="font-display text-xl text-base-content leading-none">{totalWorkouts}</span>
          </div>
          <p className="text-[10px] text-neutral-content leading-tight">Treinos Realizados</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {logs?.length === 0 ? (
          <div className="bg-base-200 rounded-xl border border-base-300 p-8 text-center">
            <p className="text-sm text-neutral-content">Nenhum treino registrado ainda.</p>
          </div>
        ) : (
          logs?.map((log) => (
            <div key={log.id} className="bg-base-200 rounded-xl border border-base-300 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg text-base-content tracking-wide">Exercício ID: {log.exercise_id}</h3>
                <p className="text-xs text-neutral-content font-medium">
                  {new Date(log.timestamp).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-baseline justify-end gap-1">
                  <span className="font-display text-xl text-primary leading-none">{log.weight}</span>
                  <span className="text-xs text-neutral-content">kg</span>
                </div>
                <p className="text-xs text-neutral-content mt-0.5">{log.reps} reps</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
