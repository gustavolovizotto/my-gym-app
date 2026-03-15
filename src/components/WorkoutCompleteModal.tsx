"use client";

import { useRouter } from "next/navigation";
import { Trophy, Zap, Flame } from "lucide-react";

interface WorkoutCompleteModalProps {
  numSets: number;
  sessionVolume: number;
}

export function WorkoutCompleteModal({
  numSets,
  sessionVolume,
}: WorkoutCompleteModalProps) {
  const router = useRouter();

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-sm rounded-2xl border border-base-300 bg-base-200 p-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-linear-to-b from-primary/20 to-transparent px-6 pt-8 pb-5 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h2 className="font-display text-3xl text-base-content tracking-wide">
            TREINO
          </h2>
          <h2 className="font-display text-3xl text-primary tracking-wide -mt-1">
            CONCLUÍDO!
          </h2>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 px-5 mb-4">
          <div className="bg-base-300 rounded-xl p-3 flex flex-col gap-0.5">
            <Zap className="w-3.5 h-3.5 text-primary mb-1" />
            <span className="font-display text-lg text-base-content leading-none">
              {numSets}
            </span>
            <span className="text-[10px] text-neutral-content">Séries</span>
          </div>
          <div className="bg-base-300 rounded-xl p-3 flex flex-col gap-0.5">
            <Flame className="w-3.5 h-3.5 text-orange-400 mb-1" />
            <span className="font-display text-lg text-base-content leading-none">
              {sessionVolume.toLocaleString("pt-BR")}
              <span className="text-[10px] text-neutral-content ml-0.5">kg</span>
            </span>
            <span className="text-[10px] text-neutral-content">Volume</span>
          </div>
        </div>

        {/* Action */}
        <div className="px-5 pb-6">
          <button
            onClick={() => router.push("/")}
            className="btn btn-primary w-full rounded-xl font-display text-xl tracking-wide h-12"
          >
            Concluir
          </button>
        </div>
      </div>
    </dialog>
  );
}
