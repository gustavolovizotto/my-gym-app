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
    <div className="px-5 pt-6 pb-2 flex flex-col gap-[22px]">
      <header className="flex items-center gap-3.5">
        <button onClick={() => router.push("/")} aria-label="Voltar">
          <ArrowLeft className="w-[22px] h-[22px]" />
        </button>
        <div>
          <h1 className="text-[22px] font-display leading-none">{divisionName}</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--color-neutral-600)" }}>Selecione o dia do treino</p>
        </div>
      </header>

      {splits.length === 0 ? (
        <div className="text-center p-4 text-sm" style={{ color: "var(--color-neutral-600)" }}>
          Nenhuma separação encontrada para esta divisão.
        </div>
      ) : (
        <div className="border bg-base-200" style={{ borderColor: "var(--color-divider)" }}>
          {splits.map((split, i) => (
            <button
              key={split.id}
              onClick={() => router.push(`/workout?split=${split.id}`)}
              className="w-full text-left flex items-center justify-between px-[18px] py-[18px]"
              style={{ borderBottom: i < splits.length - 1 ? "1px solid var(--color-divider)" : "none" }}
            >
              <span className="font-display font-extrabold text-base">{split.name}</span>
              <ChevronRight className="w-[18px] h-[18px]" style={{ color: "var(--color-neutral-600)" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}