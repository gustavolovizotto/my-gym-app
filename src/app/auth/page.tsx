"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      router.push("/");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-base-200 rounded-2xl border border-base-300 p-6 shadow-xl">
        <div className="text-center mb-8">
          <h2 className="font-display text-4xl text-primary tracking-wide mb-2">FitEvo</h2>
          <p className="text-sm text-neutral-content">Acesse sua conta para continuar</p>
        </div>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              className="w-full bg-base-300 border border-base-300 text-base-content placeholder:text-neutral-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider mb-1.5 block">
              Senha
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full bg-base-300 border border-base-300 text-base-content placeholder:text-neutral-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full rounded-xl font-display text-xl tracking-wide h-12 mt-2" 
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
          
          {errorMsg && <p className="text-xs text-center mt-2 text-error font-medium">{errorMsg}</p>}
          {message && <p className="text-xs text-center mt-2 text-primary font-medium">{message}</p>}
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-neutral-content">
            Ainda não tem uma conta?{" "}
            <Link href="/auth/register" className="text-primary font-medium hover:underline">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
