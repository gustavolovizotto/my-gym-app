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
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="btn btn-circle btn-sm btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl text-base-content tracking-wide leading-none">
              Histórico
            </h1>
            <p className="text-xs text-neutral-content">Seus treinos passados</p>
          </div>
        </div>
        <SyncBadge />
      </header>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="bg-base-200 rounded-xl p-3 border border-base-300 flex flex-col gap-1">
          <div className="flex items-baseline gap-0.5">
            <span className="font-display text-xl text-primary leading-none">{totalVolume.toLocaleString('pt-BR')}</span>
            <span className="text-[10px] text-neutral-content">kg</span>
          </div>
          <p className="text-[10px] text-neutral-content leading-tight">Volume Total</p>
        </div>
        <div className="bg-base-200 rounded-xl p-3 border border-base-300 flex flex-col gap-1">
          <div className="flex items-baseline gap-0.5">
            <span className="font-display text-xl text-base-content leading-none">{totalWorkouts}</span>
          </div>
          <p className="text-[10px] text-neutral-content leading-tight">Treinos Realizados</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="flex justify-center p-8">
            <span className="loading loading-spinner text-primary"></span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-base-200 rounded-xl border border-base-300 p-8 text-center">
            <p className="text-sm text-neutral-content">Nenhum treino registrado ainda.</p>
          </div>
        ) : (
          sessions.map((session) => {
            const isExpanded = expandedSessions.has(session.workout_id);
            return (
              <div key={session.workout_id} className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
                <button 
                  onClick={() => toggleSession(session.workout_id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-base-300/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-display text-lg text-base-content tracking-wide">
                        {session.split_name}
                      </h3>
                      <p className="text-xs text-neutral-content font-medium">
                        {session.date} • {session.total_volume.toLocaleString('pt-BR')} kg
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-neutral-content" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-neutral-content" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-base-300/50 bg-base-100/30">
                    <div className="flex flex-col gap-4 mt-4">
                      {Object.values(session.exercises).map((exercise, idx) => (
                        <div key={idx} className="flex flex-col gap-2">
                          <h4 className="font-display text-sm text-base-content/80">
                            {exercise.name}
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            {exercise.sets.map((set, setIdx) => (
                              <div key={setIdx} className="bg-base-100 rounded-lg p-2 border border-base-300 flex flex-col items-center justify-center">
                                <span className="text-[10px] text-neutral-content uppercase tracking-wider mb-0.5">
                                  Série {setIdx + 1}
                                </span>
                                <div className="flex items-baseline gap-0.5">
                                  <span className="font-display text-primary">{set.weight}</span>
                                  <span className="text-[10px] text-neutral-content">kg</span>
                                </div>
                                <span className="text-xs text-base-content font-medium">
                                  {set.reps} reps
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
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
