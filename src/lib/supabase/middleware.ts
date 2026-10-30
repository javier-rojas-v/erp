import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isAuthPage = request.nextUrl.pathname.startsWith("/login");

  // Fail closed: nunca se considera autenticado por una cookie local falsificable.
  if (!supabaseUrl || !supabaseKey) {
    if (isAuthPage) return supabaseResponse;
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // CRÍTICO: getUser() previene suplantación validando contra el servidor directamente
  let user = null;
  try {
    user = (await supabase.auth.getUser()).data.user;
  } catch {
    if (!isAuthPage) return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/"; // Dashboard
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
