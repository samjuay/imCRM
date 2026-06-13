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
    console.log('[AUTH] authService.getSession() - creating client');
    const supabase = createClient();
    console.log('[AUTH] authService.getSession() - calling supabase.auth.getSession()');
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        console.log('[AUTH] authService.getSession() - TIMEOUT after 5000ms!');
        reject(new Error('getSession() timeout after 5000ms'));
      }, 5000);
    });

    try {
      const result = await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise,
      ]);
      console.log('[AUTH] authService.getSession() - got response:', { error: !!result.error, session: !!result.data?.session });
      return result;
    } catch (e) {
      console.log('[AUTH] authService.getSession() - ERROR:', e);
      throw e;
    }
  },

  async getUser(): Promise<User | null> {
    console.log('[AUTH] authService.getUser() - creating client');
    const supabase = createClient();
    console.log('[AUTH] authService.getUser() - calling supabase.auth.getUser()');
    
    // Add 5-second timeout to detect hang
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        console.log('[AUTH] authService.getUser() - TIMEOUT after 5000ms!');
        reject(new Error('getUser() timeout after 5000ms'));
      }, 5000);
    });

    try {
      const { data, error } = await Promise.race([
        supabase.auth.getUser(),
        timeoutPromise,
      ]);
      console.log('[AUTH] authService.getUser() - got response:', { error: !!error, user: !!data?.user });

      if (error || !data.user) {
        console.log('[AUTH] authService.getUser() - returning null');
        return null;
      }

      console.log('[AUTH] authService.getUser() - returning user');
      return data.user;
    } catch (e) {
      console.log('[AUTH] authService.getUser() - ERROR:', e);
      throw e;
    }
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