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
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, streak")
        .eq("id", userId)
        .single();

      if (profile) {
        if (profile.name) setUserName(profile.name);
      }

      // Fetch Workout Logs for Stats and Activity
      const { data: logs } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", userId)
        .order("timestamp", { ascending: false });

      if (logs && logs.length > 0) {
        const totalVolume = logs.reduce((acc, log) => acc + (log.weight * log.reps), 0);

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
          streak: profile?.streak ?? 0,
        });

        const groupedLogs = logs.reduce((acc: any, log) => {
          if (!acc[log.workout_id]) {
            acc[log.workout_id] = {
              id: log.workout_id,
              date: new Date(log.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
              type: "Treino",
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
      } else {
        setStats((s) => ({ ...s, streak: profile?.streak ?? 0 }));
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
    <div className="px-5 pt-7 pb-2 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm" style={{ color: "var(--color-neutral-600)" }}>Bom treino,</p>
          <h1 className="font-display text-[26px] mt-0.5">{userName}</h1>
        </div>
        <SyncBadge />
      </div>

      {/* Today's Stats */}
      <div
        className="grid grid-cols-3 gap-px border"
        style={{ background: "var(--color-divider)", borderColor: "var(--color-divider)" }}
      >
        {todayStats.map(({ label, value, unit, icon: Icon }) => (
          <div key={label} className="bg-base-100 px-2.5 py-3.5 flex flex-col gap-2">
            <Icon className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
            <div className="font-display text-[19px] leading-none">
              {value}
              {unit && <span className="text-[11px] font-normal font-sans opacity-60 ml-0.5">{unit}</span>}
            </div>
            <div
              className="text-[10.5px] uppercase tracking-wider"
              style={{ color: "var(--color-neutral-600)" }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Section Title */}
      <div className="font-display text-[30px] leading-[1.08] -tracking-[0.01em]">
        O QUE TREINARÁ
        <br />
        <span style={{ color: "var(--color-accent)" }}>HOJE?</span>
      </div>

      {/* Workout Type Cards */}
      <WorkoutSelector />

      {/* Recent Activity */}
      <div>
        <h6 className="mb-2.5">Atividade Recente</h6>
        <div className="border bg-base-200" style={{ borderColor: "var(--color-divider)" }}>
          {recentActivity.length === 0 ? (
            <div className="p-4 text-center text-sm" style={{ color: "var(--color-neutral-600)" }}>
              Nenhum treino registrado ainda.
            </div>
          ) : (
            recentActivity.map((entry, i) => (
              <div
                key={i}
                className="flex items-start justify-between px-4 py-4"
                style={{
                  borderBottom: i < recentActivity.length - 1 ? "1px solid var(--color-divider)" : "none",
                }}
              >
                <div>
                  <div className="font-display text-[15px]">{entry.type}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--color-neutral-600)" }}>{entry.date}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[15px]" style={{ color: "var(--color-accent-700)" }}>
                    {entry.volume.toLocaleString('pt-BR')} kg
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--color-neutral-600)" }}>{entry.sets} séries</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
