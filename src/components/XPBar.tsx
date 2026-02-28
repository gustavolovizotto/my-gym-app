"use client";

import { getLevelFromXP, getNextLevel, getProgressPercent } from "@/lib/xp";

interface XPBarProps {
  xp: number;
  compact?: boolean;
}

export function XPBar({ xp, compact = false }: XPBarProps) {
  const level = getLevelFromXP(xp);
  const next = getNextLevel(xp);
  const percent = getProgressPercent(xp);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">{level.emoji}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-bold ${level.colorClass}`}>{level.name}</span>
            <span className="text-[10px] text-neutral-content">{xp.toLocaleString("pt-BR")} XP</span>
          </div>
          <div className="h-1.5 bg-base-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-xl border border-base-300 p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl leading-none">{level.emoji}</span>
        <div>
          <p className={`font-display text-xl tracking-wide leading-none ${level.colorClass}`}>
            {level.name}
          </p>
          <p className="text-xs text-neutral-content mt-0.5">
            {xp.toLocaleString("pt-BR")} XP total
          </p>
        </div>
      </div>
      <div className="h-2 bg-base-300 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-neutral-content">{percent}%</span>
        {next ? (
          <span className="text-[10px] text-neutral-content">
            {next.emoji} {next.name} em {(next.minXP - xp).toLocaleString("pt-BR")} XP
          </span>
        ) : (
          <span className="text-[10px] text-primary font-semibold">Nível máximo!</span>
        )}
      </div>
    </div>
  );
}
