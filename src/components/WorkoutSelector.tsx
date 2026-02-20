"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

const workoutTypes = [
  {
    id: "PPL",
    label: "PPL",
    sublabel: "Push / Pull / Legs",
    description: "3 dias de divisão clássica",
    color: "from-primary/20 to-primary/5",
    borderColor: "border-primary/40",
    icon: "💪",
    days: "3–6 dias/sem",
  },
  {
    id: "PPL+UP",
    label: "PPL+UP",
    sublabel: "Push Pull Legs + Upper",
    description: "Alta frequência e volume",
    color: "from-warning/20 to-warning/5",
    borderColor: "border-warning/40",
    icon: "🔥",
    days: "5–6 dias/sem",
  },
  {
    id: "UP",
    label: "UP",
    sublabel: "Upper / Lower",
    description: "Divisão superior e inferior",
    color: "from-info/20 to-info/5",
    borderColor: "border-info/40",
    icon: "⚡",
    days: "4 dias/sem",
  },
  {
    id: "ABC",
    label: "ABC",
    sublabel: "Treino A / B / C",
    description: "Divisão por grupos musculares",
    color: "from-secondary/20 to-secondary/5",
    borderColor: "border-secondary/40",
    icon: "🏆",
    days: "3–6 dias/sem",
  },
];

export function WorkoutSelector() {
  const router = useRouter();

  const handleSelect = (type: string) => {
    router.push(`/workout?type=${type}`);
  };

  return (
    <div className="flex flex-col gap-3">
      {workoutTypes.map((type) => (
        <button
          key={type.id}
          onClick={() => handleSelect(type.id)}
          className={`w-full text-left rounded-xl border bg-gradient-to-r ${type.color} ${type.borderColor} p-4 transition-all duration-200 active:scale-[0.98] hover:brightness-110`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{type.icon}</span>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-2xl text-base-content tracking-wide">
                    {type.label}
                  </span>
                  <span className="text-xs text-neutral-content font-medium">
                    {type.sublabel}
                  </span>
                </div>
                <p className="text-xs text-neutral-content mt-0.5">{type.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-content bg-base-100/40 px-2 py-1 rounded-full">
                {type.days}
              </span>
              <ChevronRight className="w-4 h-4 text-neutral-content flex-shrink-0" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
