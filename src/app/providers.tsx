"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

const OFFLINE_CACHE_WARMUP_KEY = "offline_cache_warmup_v1";
const OFFLINE_WARMUP_URLS = [
  "/",
  "/auth",
  "/workout",
  "/history",
  "/evolution",
  "/profile",
  "/manifest.json",
  "/icon.png",
];

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );
  const [offlineReadyToast, setOfflineReadyToast] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    });
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    let toastTimer: ReturnType<typeof setTimeout> | undefined;

    const warmupOfflineCache = async () => {
      if (!navigator.onLine) return;
      if (localStorage.getItem(OFFLINE_CACHE_WARMUP_KEY) === "1") return;

      try {
        await navigator.serviceWorker.ready;

        await Promise.allSettled(
          OFFLINE_WARMUP_URLS.map((url) =>
            fetch(url, {
              method: "GET",
              credentials: "include",
            })
          )
        );

        if (cancelled) return;

        localStorage.setItem(OFFLINE_CACHE_WARMUP_KEY, "1");
        setOfflineReadyToast("Modo offline preparado. Você já pode usar sem internet.");
        toastTimer = setTimeout(() => setOfflineReadyToast(null), 3500);
      } catch {
        // Ignora falhas silenciosamente; tentará novamente no próximo online
      }
    };

    warmupOfflineCache();

    const onOnline = () => {
      warmupOfflineCache();
    };

    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {offlineReadyToast && (
        <div className="toast toast-top toast-center z-70">
          <div className="alert alert-success shadow-lg">
            <span>{offlineReadyToast}</span>
          </div>
        </div>
      )}
    </QueryClientProvider>
  );
}
