"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Dumbbell, TrendingUp, User, History } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Dumbbell, label: "Treino", path: "/workout" },
  { icon: History, label: "Histórico", path: "/history" },
  { icon: TrendingUp, label: "Evolução", path: "/evolution" },
  { icon: User, label: "Perfil", path: "/profile" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isAuthenticated) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <div
        className="w-full max-w-[430px] flex bg-base-100 pb-safe"
        style={{ borderTop: "2px solid var(--color-divider)" }}
      >
        {navItems.map(({ icon: Icon, label, path }) => {
          const active = pathname === path || (path !== "/" && pathname.startsWith(path));
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              className="flex-1 flex flex-col items-center gap-1 pt-2.5 pb-3 active:scale-95"
              style={{
                color: active ? "var(--color-accent)" : "var(--color-neutral-600)",
                transition: "color 200ms ease-out, transform 150ms ease-out",
              }}
            >
              <div
                className="h-0.5 w-[22px] mb-0.5 origin-center"
                style={{
                  background: "var(--color-accent)",
                  opacity: active ? 1 : 0,
                  transform: active ? "scaleX(1)" : "scaleX(0.3)",
                  transition: "opacity 200ms ease-out, transform 200ms ease-out",
                }}
              />
              <Icon
                className="w-5 h-5"
                strokeWidth={2}
                style={{
                  transform: active ? "scale(1.08)" : "scale(1)",
                  transition: "transform 200ms ease-out",
                }}
              />
              <span className="text-[10.5px]" style={{ fontWeight: active ? 600 : 400 }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
