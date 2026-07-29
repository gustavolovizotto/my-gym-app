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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "color-mix(in srgb, var(--color-base-content) 50%, transparent)" }}
    >
      <div className="w-full max-w-sm bg-base-100" style={{ border: "1px solid var(--color-divider)" }}>
        {/* Header */}
        <div className="px-6 pt-8 pb-5 text-center">
          <div
            className="w-14 h-14 mx-auto mb-4 flex items-center justify-center"
            style={{ background: "var(--color-accent-100)", color: "var(--color-accent-700)" }}
          >
            <Trophy className="w-7 h-7" />
          </div>
          <h2 className="font-display text-3xl leading-[1.08]">
            TREINO
            <br />
            <span style={{ color: "var(--color-accent)" }}>CONCLUÍDO!</span>
          </h2>
        </div>

        {/* Stats */}
        <div
          className="grid grid-cols-2 gap-px mx-5 mb-5 border"
          style={{ background: "var(--color-divider)", borderColor: "var(--color-divider)" }}
        >
          <div className="bg-base-100 p-3.5 flex flex-col gap-1.5">
            <Zap className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
            <div className="font-display text-lg leading-none">{numSets}</div>
            <div className="text-[10.5px] uppercase tracking-wider" style={{ color: "var(--color-neutral-600)" }}>Séries</div>
          </div>
          <div className="bg-base-100 p-3.5 flex flex-col gap-1.5">
            <Flame className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
            <div className="font-display text-lg leading-none">
              {sessionVolume.toLocaleString("pt-BR")}
              <span className="text-[11px] font-normal font-sans opacity-60 ml-0.5">kg</span>
            </div>
            <div className="text-[10.5px] uppercase tracking-wider" style={{ color: "var(--color-neutral-600)" }}>Volume</div>
          </div>
        </div>

        {/* Action */}
        <div className="px-5 pb-5">
          <button
            onClick={() => router.push("/")}
            className="w-full py-3.5 px-5 text-left font-display text-lg"
            style={{ background: "var(--color-accent)", color: "var(--color-primary-content)" }}
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
