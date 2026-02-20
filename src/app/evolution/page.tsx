"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { SyncBadge } from "@/components/SyncBadge";
import { ArrowLeft, TrendingUp, Activity } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

export default function EvolutionPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
        return;
      }

      // Fetch logs
      const { data: logsData } = await supabase
        .from("workout_logs")
        .select(`
          *,
          exercises (
            name
          )
        `)
        .eq("user_id", session.user.id)
        .order("timestamp", { ascending: true });

      if (logsData) {
        setLogs(logsData);
        
        // Extract unique exercises
        const uniqueExercises = Array.from(
          new Map(
            logsData
              .filter(log => log.exercises)
              .map(log => [log.exercise_id, { id: log.exercise_id, name: log.exercises.name }])
          ).values()
        );
        setExercises(uniqueExercises);
      }
      setLoading(false);
    };

    fetchData();
  }, [router]);

  // Process data for Total Volume Chart
  const volumeData = useMemo(() => {
    if (!logs.length) return [];
    
    const grouped = logs.reduce((acc, log) => {
      const date = new Date(log.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!acc[date]) acc[date] = { date, volume: 0 };
      acc[date].volume += log.weight * log.reps;
      return acc;
    }, {});

    return Object.values(grouped);
  }, [logs]);

  // Process data for Specific Exercise Max Weight Chart
  const exerciseData = useMemo(() => {
    if (selectedExercise === "all" || !logs.length) return [];
    
    const filteredLogs = logs.filter(log => log.exercise_id === selectedExercise);
    
    const grouped = filteredLogs.reduce((acc, log) => {
      const date = new Date(log.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!acc[date]) acc[date] = { date, maxWeight: 0 };
      if (log.weight > acc[date].maxWeight) {
        acc[date].maxWeight = log.weight;
      }
      return acc;
    }, {});

    return Object.values(grouped);
  }, [logs, selectedExercise]);

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="btn btn-circle btn-sm btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl text-base-content tracking-wide leading-none">
              Evolução
            </h1>
            <p className="text-xs text-neutral-content">Suas métricas</p>
          </div>
        </div>
        <SyncBadge />
      </header>

      {loading ? (
        <div className="flex justify-center p-8">
          <span className="loading loading-spinner text-primary"></span>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-base-200 rounded-xl border border-base-300 p-8 text-center">
          <p className="text-sm text-neutral-content">Nenhum treino registrado para gerar métricas.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Volume Total Chart */}
          <div className="bg-base-200 rounded-xl border border-base-300 p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display text-lg text-base-content leading-none">Volume Total</h2>
                <p className="text-[10px] text-neutral-content">Carga x Repetições por dia</p>
              </div>
            </div>
            
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-300)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-neutral-content)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-neutral-content)' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-base-100)', borderColor: 'var(--color-base-300)', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#22c55e', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="volume" name="Volume (kg)" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Progresso por Exercício Chart */}
          <div className="bg-base-200 rounded-xl border border-base-300 p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-lg text-base-content leading-none">Carga Máxima</h2>
                <p className="text-[10px] text-neutral-content">Evolução de peso por exercício</p>
              </div>
            </div>

            <select 
              className="select select-bordered select-sm w-full mb-4 bg-base-100 text-sm"
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
            >
              <option value="all" disabled>Selecione um exercício...</option>
              {exercises.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>

            {selectedExercise !== "all" ? (
              exerciseData.length > 0 ? (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={exerciseData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-300)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-neutral-content)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--color-neutral-content)' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--color-base-100)', borderColor: 'var(--color-base-300)', borderRadius: '8px', fontSize: '12px' }}
                        itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                      />
                      <Line type="monotone" dataKey="maxWeight" name="Carga Máx (kg)" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[150px] flex items-center justify-center text-neutral-content text-sm">
                  Dados insuficientes para este exercício.
                </div>
              )
            ) : (
              <div className="h-[150px] flex items-center justify-center text-neutral-content text-sm border-2 border-dashed border-base-300 rounded-lg">
                Selecione um exercício acima para ver o gráfico.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
