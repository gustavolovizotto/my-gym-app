"use client";

import { useWorkoutSync } from "@/hooks/useWorkoutSync";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

export function SyncBadge() {
  const { syncStatus } = useWorkoutSync();

  const isSynced = syncStatus === "Sincronizado";
  const Icon = isSynced ? Wifi : syncStatus === "Sincronizando..." ? RefreshCw : WifiOff;

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] whitespace-nowrap"
      style={{
        background: isSynced ? "var(--color-accent-100)" : "var(--color-neutral-200)",
        color: isSynced ? "var(--color-accent-800)" : "var(--color-neutral-600)",
      }}
    >
      <Icon size={12} strokeWidth={2.5} className={syncStatus === "Sincronizando..." ? "animate-spin" : ""} />
      {syncStatus}
    </div>
  );
}
