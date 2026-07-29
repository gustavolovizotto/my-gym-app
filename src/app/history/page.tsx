"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SyncBadge } from "@/components/SyncBadge";
import { ArrowLeft, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";

interface WorkoutSession {
  workout_id: string;
  split_name: string;
  date: string;
  timestamp: number;
  total_volume: number;
  exercises: {
    [exercise_id: string]: {
      name: string;
      sets: {
        weight: number;
        reps: number;
        timestamp: string;
      }[];
    };
  };
}

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("workout_logs")
        .select(`
          *,
          exercises (
            name
          ),
          workout_splits (
            name
          )
        `)
        .eq("user_id", session.user.id)
        .order("timestamp", { ascending: false });

      if (data) {
        // Group by workout_id
        const grouped = data.reduce((acc: { [key: string]: WorkoutSession }, log) => {
          if (!acc[log.workout_id]) {
            acc[log.workout_id] = {
              workout_id: log.workout_id,
              split_name: log.workout_splits?.name || "Treino",
              date: new Date(log.timestamp).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              }),
              timestamp: new Date(log.timestamp).getTime(),
              total_volume: 0,
              exercises: {}
            };
          }

          const sessionObj = acc[log.workout_id];
          sessionObj.total_volume += log.weight * log.reps;

          if (!sessionObj.exercises[log.exercise_id]) {
            sessionObj.exercises[log.exercise_id] = {
              name: log.exercises?.name || `Exercício ID: ${log.exercise_id}`,
              sets: []
            };
          }

          sessionObj.exercises[log.exercise_id].sets.push({
            weight: log.weight,
            reps: log.reps,
            timestamp: log.timestamp
          });

          return acc;
        }, {});

        // Sort sessions by timestamp descending
        const sortedSessions = Object.values(grouped).sort((a, b) => b.timestamp - a.timestamp);
        
        // Sort sets by timestamp ascending within each exercise
        sortedSessions.forEach(sessionObj => {
          Object.values(sessionObj.exercises).forEach(exercise => {
            exercise.sets.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          });
        });

        setSessions(sortedSessions);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [router]);

  const toggleSession = (workoutId: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(workoutId)) {
        next.delete(workoutId);
      } else {
        next.add(workoutId);
      }
      return next;
    });
  };

  const totalVolume = sessions.reduce((acc, session) => acc + session.total_volume, 0);
  const totalWorkouts = sessions.length;

  return (
    <div className="px-5 pt-6 pb-2 flex flex-col gap-[18px]">
      <header className="flex justify-between items-start gap-3">
        <div className="flex items-center gap-3.5">
          <button onClick={() => router.push("/")} aria-label="Voltar">
            <ArrowLeft className="w-[22px] h-[22px]" />
          </button>
          <div>
            <h1 className="text-[22px] font-display leading-none">Histórico</h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--color-neutral-600)" }}>Seus treinos passados</p>
          </div>
        </div>
        <SyncBadge />
      </header>

      <div
        className="grid grid-cols-2 gap-px border"
        style={{ background: "var(--color-divider)", borderColor: "var(--color-divider)" }}
      >
        <div className="bg-base-100 p-3.5">
          <div className="font-display text-[19px] leading-none">{totalVolume.toLocaleString('pt-BR')}</div>
          <div className="text-[10.5px] uppercase tracking-wider mt-1" style={{ color: "var(--color-neutral-600)" }}>Volume Total</div>
        </div>
        <div className="bg-base-100 p-3.5">
          <div className="font-display text-[19px] leading-none">{totalWorkouts}</div>
          <div className="text-[10.5px] uppercase tracking-wider mt-1" style={{ color: "var(--color-neutral-600)" }}>Treinos Realizados</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="flex justify-center p-8">
            <span className="loading loading-spinner text-primary"></span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-base-200 border p-8 text-center" style={{ borderColor: "var(--color-divider)" }}>
            <p className="text-sm" style={{ color: "var(--color-neutral-600)" }}>Nenhum treino registrado ainda.</p>
          </div>
        ) : (
          sessions.map((session) => {
            const isExpanded = expandedSessions.has(session.workout_id);
            return (
              <div key={session.workout_id} className="bg-base-200 border" style={{ borderColor: "var(--color-divider)" }}>
                <button
                  onClick={() => toggleSession(session.workout_id)}
                  className="w-full p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-[34px] h-[34px] shrink-0 flex items-center justify-center"
                      style={{ background: "var(--color-accent-100)", color: "var(--color-accent-700)" }}
                    >
                      <Calendar className="w-[17px] h-[17px]" />
                    </span>
                    <div className="text-left">
                      <div className="font-display text-[15px]">{session.split_name}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--color-neutral-600)" }}>
                        {session.date} · {session.total_volume.toLocaleString('pt-BR')} kg
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-[18px] h-[18px]" style={{ color: "var(--color-neutral-600)" }} />
                  ) : (
                    <ChevronDown className="w-[18px] h-[18px]" style={{ color: "var(--color-neutral-600)" }} />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-3.5 flex flex-col gap-3.5" style={{ borderTop: "1px solid var(--color-divider)" }}>
                    {Object.values(session.exercises).map((exercise, idx) => (
                      <div key={idx}>
                        <div className="text-[13px] font-bold mb-2">{exercise.name}</div>
                        <div className="flex flex-wrap gap-2">
                          {exercise.sets.map((set, setIdx) => (
                            <div key={setIdx} className="border px-3 py-2 min-w-[76px]" style={{ borderColor: "var(--color-divider)" }}>
                              <div className="text-[9.5px] uppercase tracking-wider" style={{ color: "var(--color-neutral-600)" }}>
                                Série {setIdx + 1}
                              </div>
                              <div className="font-display text-[15px] mt-0.5" style={{ color: "var(--color-accent-700)" }}>
                                {set.weight}<span className="text-[10px] font-normal font-sans" style={{ color: "var(--color-base-content)" }}> kg</span>
                              </div>
                              <div className="text-[11px] mt-0.5" style={{ color: "var(--color-neutral-600)" }}>
                                {set.reps} reps
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
