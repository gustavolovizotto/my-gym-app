"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";

interface Split {
  id: string;
  name: string;
  order_index: number;
}

export default function DivisionPage() {
  const router = useRouter();
  const params = useParams();
  const divisionId = params.id as string;

  const [divisionName, setDivisionName] = useState("");
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDivisionAndSplits = async () => {
      if (!divisionId) return;

      // Fetch Division Name
      const { data: division } = await supabase
        .from("workout_divisions")
        .select("name")
        .eq("id", divisionId)
        .single();

      if (division) {
        setDivisionName(division.name);
      }

      // Fetch Splits
      const { data: splitsData } = await supabase
        .from("workout_splits")
        .select("*")
        .eq("division_id", divisionId)
        .order("order_index");

      if (splitsData) {
        setSplits(splitsData);
      }

      setLoading(false);
    };

    fetchDivisionAndSplits();
  }, [divisionId]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <span className="loading loading-spinner text-primary"></span>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/")} className="btn btn-circle btn-sm btn-ghost">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl text-base-content tracking-wide leading-none">
            {divisionName}
          </h1>
          <p className="text-xs text-neutral-content">Selecione o dia do treino</p>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        {splits.length === 0 ? (
          <div className="text-center p-4 text-neutral-content text-sm">
            Nenhuma separação encontrada para esta divisão.
          </div>
        ) : (
          splits.map((split) => (
            <button
              key={split.id}
              onClick={() => router.push(`/workout?split=${split.id}`)}
              className="w-full text-left rounded-xl border bg-base-200 border-base-300 p-4 transition-all duration-200 active:scale-[0.98] hover:brightness-110"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-xl text-base-content tracking-wide">
                  {split.name}
                </span>
                <ChevronRight className="w-5 h-5 text-neutral-content" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}