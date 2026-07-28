"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
      <h2 className="text-xl font-bold text-error">Algo deu errado</h2>
      <p className="text-sm text-neutral-content max-w-xs">{error.message || "Ocorreu um erro inesperado."}</p>
      <button className="btn btn-primary btn-sm" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}
