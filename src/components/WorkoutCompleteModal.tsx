"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Zap, Flame, Star } from "lucide-react";
import { CompleteWorkoutResult } from "@/hooks/useXP";

interface WorkoutCompleteModalProps {
  result: CompleteWorkoutResult;
  numSets: number;
  sessionVolume: number;
}

export function WorkoutCompleteModal({
  result,
  numSets,
  sessionVolume,
}: WorkoutCompleteModalProps) {
  const router = useRouter();
  const [displayedXP, setDisplayedXP] = useState(0);

  // Animate XP counter up
  useEffect(() => {
    const target = result.xpEarned;
    const duration = 1200;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplayedXP(target);
        clearInterval(interval);
      } else {
        setDisplayedXP(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [result.xpEarned]);

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

        {/* XP Earned */}
        <div className="mx-5 mb-4 bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
          <p className="text-xs text-neutral-content uppercase tracking-wider mb-1">
            XP Ganho
          </p>
          <p className="font-display text-4xl text-primary tracking-wide">
            +{displayedXP}
          </p>
        </div>

        {/* Level Up */}
        {result.leveledUp && (
          <div className="mx-5 mb-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-3 flex items-center gap-3">
            <span className="text-2xl">{result.newLevel.emoji}</span>
            <div>
              <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider">
                Level Up!
              </p>
              <p className="text-sm font-display text-base-content tracking-wide">
                {result.newLevel.name}
              </p>
            </div>
          </div>
        )}

        {/* New Achievements */}
        {result.newAchievements.length > 0 && (
          <div className="mx-5 mb-4">
            <p className="text-[10px] text-neutral-content uppercase tracking-wider mb-2 flex items-center gap-1">
              <Star className="w-3 h-3" />
              Conquistas desbloqueadas
            </p>
            <div className="flex flex-col gap-2">
              {result.newAchievements.map((a) => (
                <div
                  key={a.key}
                  className="bg-base-300 rounded-xl p-3 flex items-center gap-3"
                >
                  <span className="text-xl">{a.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-base-content">{a.title}</p>
                    <p className="text-[10px] text-neutral-content">{a.description}</p>
                  </div>
                  {a.xpBonus > 0 && (
                    <span className="ml-auto text-xs font-bold text-primary">
                      +{a.xpBonus} XP
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
