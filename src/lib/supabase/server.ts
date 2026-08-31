import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

/**
 * Server-side Supabase client bound to the user's auth cookies (RLS-enforced).
 * Use in Route Handlers, Server Components, and Server Actions.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getSupabaseCookieOptions(),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll throws inside Server Components (read-only). The session
            // is refreshed by middleware on every request, so this is fine.
          }
        },
      },
    },
  );
}

/** Returns the authenticated user's row or null. */
export async function getCurrentUser() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
