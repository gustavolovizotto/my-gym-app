import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// --- PUSH NOTIFICATIONS REMOTAS ---
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "FitEvo";
  const options = {
    body: data.body || "Você tem uma nova notificação!",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// --- CLIQUE NA NOTIFICAÇÃO ---
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// --- TIMER DE DESCANSO LOCAL (OFFLINE) ---
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "START_REST_TIMER") {
    const delay = event.data.delay || 90000; // 90 segundos padrão
    
    setTimeout(() => {
      self.registration.showNotification("⏳ Fim do descanso!", {
        body: "Bora para a próxima série. O descanso acabou!",
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        vibrate: [300, 100, 300, 100, 300],
        data: { url: "/workout" },
      } as any);
    }, delay);
  }
});
