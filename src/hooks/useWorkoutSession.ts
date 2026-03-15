"use client";

import { useState, useCallback, useEffect } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";

interface WorkoutSession {
  workoutId: string;
  splitId: string;
  startedAt: string;
}

const STORAGE_KEY = "active_workout_session";
const CONFIG_AUTO_FINISH = "auto_finish_workout";

function getStoredSession(): WorkoutSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkoutSession;
  } catch {
    return null;
  }
}

export function useAutoFinishSetting() {
  const [autoFinish, setAutoFinish] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load from Dexie first, then sync from Supabase
  useEffect(() => {
    const load = async () => {
      // 1. Dexie (offline-first)
      try {
        const local = await db.config.where("name").equals(CONFIG_AUTO_FINISH).first();
        if (local) {
          setAutoFinish(local.value);
        }
      } catch (err) {
        console.error("Erro ao carregar config do Dexie:", err);
      }
      setLoaded(true);

      // 2. Supabase em background
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data } = await supabase
          .from("config")
          .select("pkconfig, value")
          .eq("user_id", session.user.id)
          .eq("name", CONFIG_AUTO_FINISH)
          .single();

        if (data) {
          setAutoFinish(data.value);
          await db.config.put({
            pkconfig: data.pkconfig,
            user_id: session.user.id,
            name: CONFIG_AUTO_FINISH,
            value: data.value,
          });
        }
      } catch (err) {
        console.error("Erro ao buscar config do Supabase (offline?):", err);
      }
    };
    load();
  }, []);

  const toggleAutoFinish = useCallback(async (value: boolean) => {
    setAutoFinish(value);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      // Upsert no Supabase
      const { data } = await supabase
        .from("config")
        .upsert(
          { user_id: userId, name: CONFIG_AUTO_FINISH, value },
          { onConflict: "user_id,name" }
        )
        .select("pkconfig")
        .single();

      // Atualizar Dexie
      await db.config.put({
        pkconfig: data?.pkconfig,
        user_id: userId,
        name: CONFIG_AUTO_FINISH,
        value,
      });
    } catch (err) {
      console.error("Erro ao salvar config:", err);
    }
  }, []);

  return { autoFinish, toggleAutoFinish, loaded };
}

export function useWorkoutSession(splitId: string | null) {
  const [session, setSession] = useState<WorkoutSession | null>(() => {
    const stored = getStoredSession();
    if (stored && stored.splitId === splitId) return stored;
    return null;
  });
  const loaded = true;

  const startSession = useCallback(() => {
    if (!splitId) return null;
    const newSession: WorkoutSession = {
      workoutId:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `workout-${Date.now()}`,
      splitId,
      startedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
    setSession(newSession);
    return newSession;
  }, [splitId]);

  const endSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  return {
    session,
    isTraining: !!session,
    loaded,
    startSession,
    endSession,
  };
}
