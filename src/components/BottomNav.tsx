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
      <div className="w-full max-w-[500px] bg-base-200 border-t border-base-300 pb-safe">
        <div className="flex items-center justify-around px-2 pt-2 pb-2">
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = pathname === path || (path !== "/" && pathname.startsWith(path));
            return (
              <button
                key={path}
                onClick={() => router.push(path)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[60px] ${
                  active ? "text-primary" : "text-neutral-content hover:text-base-content"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg transition-all duration-200 ${
                    active ? "bg-primary/15" : ""
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      active ? "drop-shadow-[0_0_6px_var(--color-primary)]" : ""
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-medium ${
                    active ? "text-primary" : ""
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
