"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAutoFinishSetting } from "@/hooks/useWorkoutSession";
import { useTheme } from "@/components/ThemeProvider";
import { Switch } from "@/components/ui/Switch";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState("Atleta");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { isSupported, permission, subscribeToPush } = usePushNotifications();
  const { autoFinish, toggleAutoFinish } = useAutoFinishSetting();
  const { theme, toggleTheme } = useTheme();
  const [offlineSync, setOfflineSync] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", session.user.id)
          .single();
        if (profile?.name) setUserName(profile.name);
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

  const rowStyle = { borderBottom: "1px solid var(--color-divider)" };
  const mutedStyle = { color: "var(--color-neutral-600)" };

  return (
    <div className="px-5 pt-7 pb-2 flex flex-col gap-[22px]">
      <header>
        <h1 className="text-[28px] font-display leading-none">Perfil</h1>
        <p className="text-[13px] mt-0.5" style={mutedStyle}>Sua jornada</p>
      </header>

      <div className="border bg-base-200" style={{ borderColor: "var(--color-divider)" }}>
        <div className="flex items-center gap-3.5 p-[18px]" style={rowStyle}>
          <span
            className="w-11 h-11 shrink-0 flex items-center justify-center font-display text-lg"
            style={{ background: "var(--color-neutral-200)" }}
          >
            {userName.charAt(0).toUpperCase()}
          </span>
          <div>
            <div className="font-display text-[17px]">{userName}</div>
            <p className="text-[13px] mt-0.5" style={mutedStyle}>{user.email}</p>
          </div>
        </div>

        <div className="flex items-center justify-between px-[18px] py-4" style={rowStyle}>
          <div>
            <div className="text-sm font-semibold">Modo Escuro</div>
            <p className="text-xs mt-0.5" style={mutedStyle}>Interface com fundo escuro</p>
          </div>
          <Switch checked={theme === "dark"} onChange={toggleTheme} label="Modo Escuro" />
        </div>

        <div className="flex items-center justify-between px-[18px] py-4" style={rowStyle}>
          <div className="text-sm font-semibold">Sincronização Offline</div>
          <Switch checked={offlineSync} onChange={setOfflineSync} label="Sincronização Offline" />
        </div>

        {isSupported && (
          <div className="flex items-center justify-between px-[18px] py-4" style={rowStyle}>
            <div className="text-sm font-semibold">Notificações Push</div>
            {permission === "granted" ? (
              <Switch checked onChange={() => {}} label="Notificações Push" />
            ) : (
              <button onClick={subscribeToPush} className="text-xs font-bold" style={{ color: "var(--color-accent)" }}>
                Ativar
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between px-[18px] py-4" style={rowStyle}>
          <div>
            <div className="text-sm font-semibold">Finalizar treino automaticamente</div>
            <p className="text-xs mt-0.5" style={mutedStyle}>Encerra ao completar todos os exercícios</p>
          </div>
          <Switch checked={autoFinish} onChange={toggleAutoFinish} label="Finalizar treino automaticamente" />
        </div>

        <div className="flex items-center justify-between px-[18px] py-4">
          <div className="text-sm font-semibold">Versão do App</div>
          <div className="text-[13px]" style={mutedStyle}>1.0.0</div>
        </div>
      </div>

      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 py-4 bg-transparent font-display font-extrabold text-sm"
        style={{ border: "1px solid var(--color-accent)", color: "var(--color-accent-700)" }}
      >
        <LogOut className="w-4 h-4" />
        Sair da Conta
      </button>
    </div>
  );
}
