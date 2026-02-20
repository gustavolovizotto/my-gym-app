"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // Check existing subscription
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setSubscription(sub);
        });
      });
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    if (!isSupported) return;

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        throw new Error("Permissão negada para notificações.");
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        throw new Error("VAPID Public Key não configurada no .env.local");
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      setSubscription(sub);

      // Save to Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from("profiles")
          .update({ push_subscription: JSON.parse(JSON.stringify(sub)) })
          .eq("id", session.user.id);
      }

      return sub;
    } catch (error) {
      console.error("Erro ao assinar push notifications:", error);
      throw error;
    }
  };

  const scheduleLocalRestTimer = (seconds = 90) => {
    if ("serviceWorker" in navigator && permission === "granted") {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.active) {
          registration.active.postMessage({
            type: "START_REST_TIMER",
            delay: seconds * 1000,
          });
        }
      });
    }
  };

  return {
    isSupported,
    permission,
    subscription,
    subscribeToPush,
    scheduleLocalRestTimer,
  };
}
