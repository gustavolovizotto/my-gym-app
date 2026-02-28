"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  ACHIEVEMENTS,
  AchievementDef,
  calcSessionXP,
  checkLevelAchievements,
  checkNewAchievements,
  getLevelFromXP,
  Level,
} from "@/lib/xp";

export interface UserProfile {
  xp: number;
  streak: number;
  last_workout_date: string | null;
}

export interface UnlockedAchievement {
  achievement_key: string;
  unlocked_at: string;
}

export interface CompleteWorkoutResult {
  xpEarned: number;
  previousXP: number;
  newXP: number;
  previousLevel: Level;
  newLevel: Level;
  leveledUp: boolean;
  newAchievements: AchievementDef[];
}

export function useXP() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("xp, streak, last_workout_date")
      .eq("id", session.user.id)
      .single();

    if (profileError) {
      console.error("[useXP] Erro ao buscar perfil:", profileError.message);
      // If columns don't exist (migration not run), use safe defaults
      setProfile({ xp: 0, streak: 0, last_workout_date: null });
    } else if (profileData) {
      // Normalize null values from DB to safe defaults
      setProfile({
        xp: profileData.xp ?? 0,
        streak: profileData.streak ?? 0,
        last_workout_date: profileData.last_workout_date ?? null,
      });
    } else {
      // Row doesn't exist yet — create it
      const { error: upsertError } = await supabase.from("profiles").upsert(
        { id: session.user.id, xp: 0, streak: 0, last_workout_date: null },
        { onConflict: "id" }
      );
      if (upsertError) {
        console.error("[useXP] Erro ao criar perfil:", upsertError.message);
      }
      setProfile({ xp: 0, streak: 0, last_workout_date: null });
    }

    const { data: achievementsData, error: achievementsError } = await supabase
      .from("achievements")
      .select("achievement_key, unlocked_at")
      .eq("user_id", session.user.id);

    if (achievementsError) {
      console.error("[useXP] Erro ao buscar conquistas:", achievementsError.message);
    } else if (achievementsData) {
      setUnlockedAchievements(achievementsData);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const completeWorkout = useCallback(
    async (numSets: number, sessionVolume: number): Promise<CompleteWorkoutResult | null> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      // Use safe defaults if profile not loaded yet
      const currentXP = profile?.xp ?? 0;
      const currentStreak = profile?.streak ?? 0;
      const currentLastDate = profile?.last_workout_date ?? null;

      // 1. Calculate new streak
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const lastDate = currentLastDate
        ? new Date(currentLastDate + "T00:00:00")
        : null;

      let newStreak = 1;
      if (lastDate) {
        const lastTime = lastDate.getTime();
        if (lastTime === today.getTime()) {
          newStreak = currentStreak; // Already trained today — keep streak
        } else if (lastTime === yesterday.getTime()) {
          newStreak = currentStreak + 1; // Trained yesterday — increment
        }
        // else: gap > 1 day → reset to 1
      }

      // 2. Calculate XP
      const streakForBonus = lastDate?.getTime() === today.getTime()
        ? currentStreak
        : newStreak - 1;
      const xpEarned = calcSessionXP(numSets, streakForBonus);

      const previousXP = currentXP;
      const newXP = previousXP + xpEarned;
      const previousLevel = getLevelFromXP(previousXP);

      // 3. Fetch totals for achievement checking
      const { data: logsData, error: logsError } = await supabase
        .from("workout_logs")
        .select("workout_id, weight, reps")
        .eq("user_id", session.user.id);

      if (logsError) {
        console.error("[useXP] Erro ao buscar logs:", logsError.message);
      }

      const distinctWorkouts = new Set(logsData?.map((l) => l.workout_id) ?? []).size;
      const totalVolume = (logsData ?? []).reduce(
        (acc, l) => acc + l.weight * l.reps,
        0
      );

      // 4. Check achievements
      const existingKeys = unlockedAchievements.map((a) => a.achievement_key);
      const statsAchievements = checkNewAchievements(
        {
          totalWorkouts: distinctWorkouts + 1,
          streak: newStreak,
          sessionVolume,
          totalVolume: totalVolume + sessionVolume,
        },
        existingKeys
      );
      const levelAchievements = checkLevelAchievements(previousXP, newXP, [
        ...existingKeys,
        ...statsAchievements.map((a) => a.key),
      ]);
      const newAchievements = [...statsAchievements, ...levelAchievements];

      // 5. Calculate achievement bonus XP
      const achievementBonusXP = newAchievements.reduce((acc, a) => acc + a.xpBonus, 0);
      const finalXP = newXP + achievementBonusXP;
      const todayStr = today.toISOString().split("T")[0];

      // 6. Upsert profile — check error
      const { error: profileUpsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: session.user.id,
            xp: finalXP,
            streak: newStreak,
            last_workout_date: todayStr,
          },
          { onConflict: "id" }
        );

      if (profileUpsertError) {
        console.error("[useXP] Erro ao salvar XP:", profileUpsertError.message);
        // Return null to indicate failure — caller can fallback to router.push("/")
        return null;
      }

      // 7. Insert new achievements
      if (newAchievements.length > 0) {
        const { error: achievError } = await supabase.from("achievements").upsert(
          newAchievements.map((a) => ({
            user_id: session.user.id,
            achievement_key: a.key,
            unlocked_at: new Date().toISOString(),
            seen: false,
          })),
          { onConflict: "user_id,achievement_key" }
        );
        if (achievError) {
          console.error("[useXP] Erro ao salvar conquistas:", achievError.message);
        }
      }

      // 8. Update local state
      setProfile({ xp: finalXP, streak: newStreak, last_workout_date: todayStr });
      setUnlockedAchievements((prev) => [
        ...prev,
        ...newAchievements.map((a) => ({
          achievement_key: a.key,
          unlocked_at: new Date().toISOString(),
        })),
      ]);

      return {
        xpEarned: xpEarned + achievementBonusXP,
        previousXP,
        newXP: finalXP,
        previousLevel,
        newLevel: getLevelFromXP(finalXP),
        leveledUp: previousLevel.name !== getLevelFromXP(finalXP).name,
        newAchievements,
      };
    },
    [profile, unlockedAchievements]
  );

  return {
    profile,
    unlockedAchievements,
    loading,
    completeWorkout,
    refetch: fetchProfile,
    allAchievements: ACHIEVEMENTS,
  };
}
