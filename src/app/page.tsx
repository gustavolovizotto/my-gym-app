"use client";

import { SyncBadge } from "@/components/SyncBadge";
import { WorkoutSelector } from "@/components/WorkoutSelector";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Zap, Calendar, Flame } from "lucide-react";

const todayStats = [
  { label: "Volume Total", value: "4.200", unit: "kg", icon: Zap },
  { label: "Último Treino", value: "Ontem", unit: "", icon: Calendar },
  { label: "Sequência", value: "5", unit: "dias", icon: Flame },
];

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        router.push("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        router.push("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (!session) return null;

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-neutral-content text-sm font-medium mb-1">Bom treino,</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-base-content">
            João Silva 👊
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
          {[
            { date: "Ontem", type: "PPL — Push", volume: "3.800 kg", sets: 18 },
            { date: "Ter, 18 Fev", type: "PPL — Pull", volume: "2.950 kg", sets: 15 },
            { date: "Seg, 17 Fev", type: "PPL — Legs", volume: "5.200 kg", sets: 16 },
          ].map((entry, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-base-content">{entry.type}</p>
                <p className="text-xs text-neutral-content">{entry.date}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-primary">{entry.volume}</p>
                <p className="text-xs text-neutral-content">{entry.sets} séries</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
