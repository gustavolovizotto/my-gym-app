"use client";

import { useState, useEffect, useCallback } from "react";

interface WorkoutSession {
  workoutId: string;
  splitId: string;
  startedAt: string;
}

const STORAGE_KEY = "active_workout_session";

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

export function useWorkoutSession(splitId: string | null) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load session from localStorage on mount
  useEffect(() => {
    const stored = getStoredSession();
    if (stored && stored.splitId === splitId) {
      setSession(stored);
    }
    setLoaded(true);
  }, [splitId]);

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
