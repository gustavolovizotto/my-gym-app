"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useXP } from "@/hooks/useXP";
import { useAutoFinishSetting } from "@/hooks/useWorkoutSession";
import { XPBar } from "@/components/XPBar";
import { ACHIEVEMENTS, AchievementDef } from "@/lib/xp";
import { Lock } from "lucide-react";

const CATEGORIES: { key: AchievementDef["category"]; label: string }[] = [
  { key: "treinos",   label: "Treinos"   },
  { key: "sequencia", label: "Sequência" },
  { key: "volume",    label: "Volume"    },
  { key: "nivel",     label: "Nível"     },
];

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { isSupported, permission, subscribeToPush } = usePushNotifications();
  const { profile, unlockedAchievements } = useXP();
  const { autoFinish, toggleAutoFinish } = useAutoFinishSetting();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      } else {
        router.push("/auth");
      }
      setLoading(false);
    };
    getUser();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!user) return null;

  const unlockedKeys = unlockedAchievements.map((a) => a.achievement_key);
  const allAchievements = Object.values(ACHIEVEMENTS);
  const unlockedCount = unlockedKeys.length;
  const totalCount = allAchievements.length;

  return (
    <div className="p-4 pb-24 animate-fade-in">
      <header className="mb-6">
        <h1 className="font-display text-4xl text-primary tracking-wide mb-1">Perfil</h1>
        <p className="text-sm text-neutral-content">Sua jornada e conquistas</p>
      </header>

      <div className="space-y-4">
        {/* User Info */}
        <div className="bg-base-200 rounded-2xl border border-base-300 p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full bg-base-300 flex items-center justify-center border border-base-100">
              <span className="font-display text-2xl text-primary">
                {user.email?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div>
              <h2 className="font-display text-2xl tracking-wide">Atleta</h2>
              <p className="text-sm text-neutral-content">{user.email}</p>
            </div>
          </div>

          {/* XP Bar */}
          {profile && <XPBar xp={profile.xp} />}

          <div className="space-y-3 mt-4">
            <div className="flex justify-between items-center py-3 border-b border-base-300">
              <span className="text-sm font-medium">Sequência atual</span>
              <span className="text-sm font-bold text-orange-400">
                🔥 {profile?.streak ?? 0} dias
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-base-300">
              <span className="text-sm font-medium">Conquistas</span>
              <span className="text-sm font-bold text-primary">
                {unlockedCount} / {totalCount}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-base-300">
              <span className="text-sm font-medium">Sincronização Offline</span>
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-md font-medium">Ativa</span>
            </div>
            {isSupported && (
              <div className="flex justify-between items-center py-3 border-b border-base-300">
                <span className="text-sm font-medium">Notificações Push</span>
                {permission === "granted" ? (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-md font-medium">Ativas</span>
                ) : (
                  <button
                    onClick={subscribeToPush}
                    className="text-xs bg-warning/20 text-warning px-3 py-1.5 rounded-md font-medium hover:bg-warning/30 transition-colors"
                  >
                    Ativar
                  </button>
                )}
              </div>
            )}
            <div className="flex justify-between items-center py-3 border-b border-base-300">
              <div>
                <span className="text-sm font-medium">Finalizar treino automaticamente</span>
                <p className="text-[10px] text-neutral-content mt-0.5">Encerra ao completar todos os exercícios</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={autoFinish}
                onChange={(e) => toggleAutoFinish(e.target.checked)}
              />
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm font-medium">Versão do App</span>
              <span className="text-xs text-neutral-content">1.0.0</span>
            </div>
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="bg-base-200 rounded-2xl border border-base-300 p-5">
          <h3 className="font-display text-2xl tracking-wide mb-4">Conquistas</h3>

          <div className="space-y-5">
            {CATEGORIES.map(({ key, label }) => {
              const items = allAchievements.filter((a) => a.category === key);
              return (
                <div key={key}>
                  <p className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider mb-2">
                    {label}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map((achievement) => {
                      const isUnlocked = unlockedKeys.includes(achievement.key);
                      const unlockedData = unlockedAchievements.find(
                        (a) => a.achievement_key === achievement.key
                      );
                      return (
                        <div
                          key={achievement.key}
                          className={`rounded-xl p-3 border flex flex-col gap-1 transition-all ${
                            isUnlocked
                              ? "bg-base-300 border-primary/30"
                              : "bg-base-300/40 border-base-300 opacity-50"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-2xl leading-none">
                              {isUnlocked
                                ? achievement.icon
                                : <Lock className="w-5 h-5 text-neutral-content" />}
                            </span>
                            {achievement.xpBonus > 0 && isUnlocked && (
                              <span className="text-[10px] text-primary font-bold">
                                +{achievement.xpBonus} XP
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-base-content leading-tight mt-1">
                            {achievement.title}
                          </p>
                          <p className="text-[10px] text-neutral-content leading-tight">
                            {achievement.description}
                          </p>
                          {isUnlocked && unlockedData && (
                            <p className="text-[10px] text-primary mt-0.5">
                              {new Date(unlockedData.unlocked_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full bg-base-200 border border-error/30 text-error rounded-xl py-4 font-display text-xl tracking-wide hover:bg-error/10 transition-colors"
        >
          Sair da Conta
        </button>
      </div>
    </div>
  );
}
