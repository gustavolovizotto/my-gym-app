"use client";

import { useWorkoutSync } from "@/hooks/useWorkoutSync";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

export function SyncBadge() {
  const { syncStatus } = useWorkoutSync();

  let badgeClass = "bg-base-300 text-neutral-content border-base-300";
  let Icon = WifiOff;

  if (syncStatus === "Sincronizado") {
    badgeClass = "bg-primary/10 text-primary border-primary/20";
    Icon = Wifi;
  } else if (syncStatus === "Sincronizando...") {
    badgeClass = "bg-warning/10 text-warning border-warning/20";
    Icon = RefreshCw;
  }

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium transition-colors ${badgeClass}`}>
      <Icon size={12} className={syncStatus === "Sincronizando..." ? "animate-spin" : ""} />
      {syncStatus}
    </div>
  );
}
