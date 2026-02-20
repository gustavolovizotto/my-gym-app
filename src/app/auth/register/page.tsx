"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setErrorMsg("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          date_of_birth: dateOfBirth || null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setMessage("Conta criada com sucesso! Verifique seu email para confirmar.");
      // Se o Supabase estiver configurado para auto-confirmar, podemos redirecionar
      if (data.session) {
        router.push("/");
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-base-200 rounded-2xl border border-base-300 p-6 shadow-xl">
        <div className="text-center mb-8">
          <h2 className="font-display text-4xl text-primary tracking-wide mb-2">FitEvo</h2>
          <p className="text-sm text-neutral-content">Crie sua conta para começar</p>
        </div>
        
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-semibold text-neutral-content uppercase tracking-wider mb-1.5 block">
              Nome Completo
            </label>
            <input
              type="text"
              placeholder="Seu nome"
              className="w-full bg-base-300 border border-base-300 text-base-content placeholder:text-neutral-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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
              Data de Nascimento
            </label>
            <input
              type="date"
              className="w-full bg-base-300 border border-base-300 text-base-content placeholder:text-neutral-content rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
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
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full rounded-xl font-display text-xl tracking-wide h-12 mt-2" 
            disabled={loading}
          >
            {loading ? "Criando..." : "Criar Conta"}
          </button>
          
          {errorMsg && <p className="text-xs text-center mt-2 text-error font-medium">{errorMsg}</p>}
          {message && <p className="text-xs text-center mt-2 text-primary font-medium">{message}</p>}
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-neutral-content">
            Já tem uma conta?{" "}
            <Link href="/auth" className="text-primary font-medium hover:underline">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
