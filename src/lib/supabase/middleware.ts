import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPostLoginRedirect } from "@/lib/auth/redirects";
import {
  AUTH_ERROR_PARAM,
  DISABLED_STATUS,
  PUBLIC_ROUTES,
  UNAUTHORIZED_ROUTE,
} from "@/lib/auth/constants";
import { ROUTES } from "@/utils/constants";
import type { UserRole } from "@/types/auth";

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isProtectedRoute(pathname: string): boolean {
  return !isPublicRoute(pathname) && pathname !== UNAUTHORIZED_ROUTE;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user) {
    if (isProtectedRoute(pathname)) {
      const loginUrl = new URL(ROUTES.login, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, role, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profile?.status?.toLowerCase() === DISABLED_STATUS) {
    await supabase.auth.signOut();
    const loginUrl = new URL(ROUTES.login, request.url);
    loginUrl.searchParams.set(AUTH_ERROR_PARAM, "disabled");
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === UNAUTHORIZED_ROUTE) {
    return supabaseResponse;
  }

  if (isPublicRoute(pathname)) {
    if (profile) {
      return NextResponse.redirect(
        new URL(getPostLoginRedirect(profile.role as UserRole), request.url),
      );
    }
    return NextResponse.redirect(new URL(UNAUTHORIZED_ROUTE, request.url));
  }

  if (!profile) {
    return NextResponse.redirect(new URL(UNAUTHORIZED_ROUTE, request.url));
  }

  return supabaseResponse;
}