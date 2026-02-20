"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  return (
    <div className="p-4 pb-24 animate-fade-in">
      <header className="mb-8">
        <h1 className="font-display text-4xl text-primary tracking-wide mb-2">Perfil</h1>
        <p className="text-sm text-neutral-content">Gerencie sua conta e configurações</p>
      </header>

      <div className="space-y-6">
        <div className="bg-base-200 rounded-2xl border border-base-300 p-6">
          <div className="flex items-center gap-4 mb-6">
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

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-base-300">
              <span className="text-sm font-medium">Sincronização Offline</span>
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-md font-medium">Ativa</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-base-300">
              <span className="text-sm font-medium">Versão do App</span>
              <span className="text-xs text-neutral-content">1.0.0</span>
            </div>
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
