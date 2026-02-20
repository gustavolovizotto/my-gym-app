"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export type SyncStatus = "Sincronizado" | "Sincronizando..." | "Modo Offline";

export function useWorkoutSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("Sincronizado");

  const syncPendingLogs = useCallback(async () => {
    if (!navigator.onLine) return;

    setSyncStatus("Sincronizando...");

    try {
      const pendingLogs = await db.workout_logs
        .where("is_synced")
        .equals(0)
        .toArray();

      if (pendingLogs.length === 0) {
        setSyncStatus("Sincronizado");
        return;
      }

      // Prepare data for Supabase (remove local id if it's auto-incremented, or keep if UUID)
      const { error } = await supabase.from("workout_logs").insert(
        pendingLogs.map((log) => ({
          workout_id: log.workout_id,
          exercise_id: log.exercise_id,
          weight: log.weight,
          reps: log.reps,
          timestamp: log.timestamp,
        }))
      );

      if (error) throw error;

      // Mark as synced in Dexie
      await db.transaction("rw", db.workout_logs, async () => {
        for (const log of pendingLogs) {
          if (log.id) {
            await db.workout_logs.update(log.id, { is_synced: 1 });
          }
        }
      });

      setSyncStatus("Sincronizado");
    } catch (error) {
      console.error("Sync failed:", error);
      // Keep status as offline or error state
      setSyncStatus("Modo Offline");
    }
  }, []);

  useEffect(() => {
    // Initial check
    setIsOnline(navigator.onLine);
    if (navigator.onLine) {
      syncPendingLogs();
    } else {
      setSyncStatus("Modo Offline");
    }

    const handleOnline = () => {
      setIsOnline(true);
      syncPendingLogs();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus("Modo Offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic sync attempt every 30 seconds if online
    const interval = setInterval(() => {
      if (navigator.onLine) {
        syncPendingLogs();
      }
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [syncPendingLogs]);

  return { isOnline, syncStatus, syncPendingLogs };
}
