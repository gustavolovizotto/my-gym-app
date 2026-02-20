import { NextResponse } from "next/server";
import webpush from "web-push";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Configuração do Web Push
// O email deve ser um contato válido para que os provedores de push possam contatar em caso de problemas
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:contato@fitevo.com", 
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(request: Request) {
  try {
    const { userId, title, body, url } = await request.json();

    if (!userId || !title || !body) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    // Buscar a inscrição de push do usuário no Supabase
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("push_subscription")
      .eq("id", userId)
      .single();

    if (error || !profile?.push_subscription) {
      return NextResponse.json({ error: "Usuário não possui inscrição de push" }, { status: 404 });
    }

    const subscription = profile.push_subscription;

    // Enviar a notificação push
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title,
        body,
        url: url || "/",
      })
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao enviar notificação push:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
