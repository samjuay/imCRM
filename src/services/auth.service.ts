import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export const authService = {
  async signInWithEmail(email: string, password: string) {
    const supabase = createClient();
    return supabase.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    const supabase = createClient();
    return supabase.auth.signOut();
  },

  async resetPassword(email: string) {
    const supabase = createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectTo = `${appUrl}/login`;
    return supabase.auth.resetPasswordForEmail(email, { redirectTo });
  },

  async getSession() {
    const supabase = createClient();
    return supabase.auth.getSession();
  },

  async getUser(): Promise<User | null> {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return data.user;
  },

  onAuthStateChange(
    callback: Parameters<
      ReturnType<typeof createClient>["auth"]["onAuthStateChange"]
    >[0],
  ) {
    const supabase = createClient();
    return supabase.auth.onAuthStateChange(callback);
  },
};