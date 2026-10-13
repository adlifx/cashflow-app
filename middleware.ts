import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const onLogin = req.nextUrl.pathname.startsWith("/login");

  if (!url || !key) {
    console.error("Missing Supabase env vars", { hasUrl: !!url, hasKey: !!key });
    return onLogin ? NextResponse.next() : NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    let res = NextResponse.next({ request: req });
    const sb = createServerClient(url, key, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list: CookieToSet[]) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user && !onLogin) return NextResponse.redirect(new URL("/login", req.url));
    if (user && req.nextUrl.pathname === "/login") return NextResponse.redirect(new URL("/dashboard", req.url));
    return res;
  } catch (err) {
    console.error("Middleware error:", err);
    return onLogin ? NextResponse.next() : NextResponse.redirect(new URL("/login", req.url));
  }
}

// Icons, manifest and other public files must load without logging in (the login page needs its favicon too).
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|.*\\.(?:svg|png|ico|jpg|jpeg|webp)$).*)"] };
