"use client";

import { SyncBadge } from "@/components/SyncBadge";
import { WorkoutSelector } from "@/components/WorkoutSelector";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Zap, Calendar, Flame } from "lucide-react";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [userName, setUserName] = useState<string>("Atleta");
  const [stats, setStats] = useState({ volume: 0, lastWorkout: "-", streak: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchProfileAndStats = async (userId: string) => {
      // Fetch Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", userId)
        .single();
      
      if (profile && profile.name) {
        setUserName(profile.name);
      }

      // Fetch Workout Logs for Stats and Activity
      const { data: logs } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", userId)
        .order("timestamp", { ascending: false });

      if (logs && logs.length > 0) {
        // Calculate Total Volume
        const totalVolume = logs.reduce((acc, log) => acc + (log.weight * log.reps), 0);
        
        // Calculate Last Workout Date
        const lastDate = new Date(logs[0].timestamp);
        const today = new Date();
        const isToday = lastDate.toDateString() === today.toDateString();
        const isYesterday = new Date(today.setDate(today.getDate() - 1)).toDateString() === lastDate.toDateString();
        
        let lastWorkoutStr = lastDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        if (isToday) lastWorkoutStr = "Hoje";
        else if (isYesterday) lastWorkoutStr = "Ontem";

        setStats({
          volume: totalVolume,
          lastWorkout: lastWorkoutStr,
          streak: 1, // Simplified streak calculation
        });

        // Group logs by workout_id for Recent Activity
        const groupedLogs = logs.reduce((acc: any, log) => {
          if (!acc[log.workout_id]) {
            acc[log.workout_id] = {
              id: log.workout_id,
              date: new Date(log.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
              type: "Treino", // We could fetch the split name here, but for now just "Treino"
              volume: 0,
              sets: 0,
              timestamp: log.timestamp
            };
          }
          acc[log.workout_id].volume += (log.weight * log.reps);
          acc[log.workout_id].sets += 1;
          return acc;
        }, {});

        const activityArray = Object.values(groupedLogs)
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 3);

        setRecentActivity(activityArray);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        router.push("/auth");
      } else {
        fetchProfileAndStats(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        router.push("/auth");
      } else {
        fetchProfileAndStats(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (!session) return null;

  const todayStats = [
    { label: "Volume Total", value: stats.volume.toLocaleString('pt-BR'), unit: "kg", icon: Zap },
    { label: "Último Treino", value: stats.lastWorkout, unit: "", icon: Calendar },
    { label: "Sequência", value: stats.streak.toString(), unit: "dias", icon: Flame },
  ];

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-neutral-content text-sm font-medium mb-1">Bom treino,</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-base-content">
            {userName} 👊
          </h1>
        </div>
        <SyncBadge />
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-3 gap-2 mb-8">
        {todayStats.map(({ label, value, unit, icon: Icon }) => (
          <div
            key={label}
            className="bg-base-200 rounded-xl p-3 border border-base-300 flex flex-col gap-1"
          >
            <Icon className="w-3.5 h-3.5 text-primary mb-0.5" />
            <div className="flex items-baseline gap-0.5">
              <span className="font-display text-xl text-base-content leading-none">{value}</span>
              {unit && <span className="text-[10px] text-neutral-content">{unit}</span>}
            </div>
            <p className="text-[10px] text-neutral-content leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Section Title */}
      <div className="mb-4">
        <h2 className="font-display text-3xl text-base-content tracking-wide">
          O QUE TREINARÁ
        </h2>
        <h2 className="font-display text-3xl text-primary tracking-wide -mt-1">
          HOJE?
        </h2>
      </div>

      {/* Workout Type Cards */}
      <WorkoutSelector />

      {/* Recent Activity */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-neutral-content uppercase tracking-wider mb-3">
          Atividade Recente
        </h3>
        <div className="bg-base-200 rounded-xl border border-base-300 divide-y divide-base-300">
          {recentActivity.length === 0 ? (
            <div className="p-4 text-center text-sm text-neutral-content">
              Nenhum treino registrado ainda.
            </div>
          ) : (
            recentActivity.map((entry, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-base-content">{entry.type}</p>
                  <p className="text-xs text-neutral-content">{entry.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary">{entry.volume.toLocaleString('pt-BR')} kg</p>
                  <p className="text-xs text-neutral-content">{entry.sets} séries</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
