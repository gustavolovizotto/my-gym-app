"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { SyncBadge } from "@/components/SyncBadge";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
    <div className="px-5 pt-6 pb-2 flex flex-col gap-[18px]">
      <header className="flex justify-between items-start gap-3">
        <div className="flex items-center gap-3.5">
          <button onClick={() => router.push("/")} aria-label="Voltar">
            <ArrowLeft className="w-[22px] h-[22px]" />
          </button>
          <div>
            <h1 className="text-[22px] font-display leading-none">Evolução</h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--color-neutral-600)" }}>Suas métricas</p>
          </div>
        </div>
        <SyncBadge />
      </header>

      {loading ? (
        <div className="flex justify-center p-8">
          <span className="loading loading-spinner text-primary"></span>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-base-200 border p-8 text-center" style={{ borderColor: "var(--color-divider)" }}>
          <p className="text-sm" style={{ color: "var(--color-neutral-600)" }}>Nenhum treino registrado para gerar métricas.</p>
        </div>
      ) : (
        <div className="bg-base-200 border p-4 flex flex-col gap-3.5" style={{ borderColor: "var(--color-divider)" }}>
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-[18px] h-[18px]" style={{ color: "var(--color-accent)" }} />
            <div>
              <div className="font-display text-base leading-none">Carga Máxima</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-neutral-600)" }}>Evolução de peso por exercício</div>
            </div>
          </div>

          <select
            className="input font-display font-bold"
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
                    <CartesianGrid strokeDasharray="2 3" stroke="var(--color-divider)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--color-neutral-600)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: 'var(--color-neutral-600)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--color-base-100)', borderColor: 'var(--color-divider)', borderRadius: 0, fontSize: '12px' }}
                      itemStyle={{ color: 'var(--color-accent)', fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="maxWeight" name="Carga Máx (kg)" stroke="var(--color-accent)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--color-accent)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-sm" style={{ color: "var(--color-neutral-600)" }}>
                Dados insuficientes para este exercício.
              </div>
            )
          ) : (
            <div className="h-[150px] flex items-center justify-center text-sm" style={{ color: "var(--color-neutral-600)", border: "2px dashed var(--color-divider)" }}>
              Selecione um exercício acima para ver o gráfico.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
