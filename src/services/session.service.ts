import { createClient } from "@/lib/supabase/client";

export const sessionService = {
  async createLoginSession(userId: string) {
    const supabase = createClient();
    return supabase.from("user_sessions").insert({
      user_id: userId,
      login_at: new Date().toISOString(),
    });
  },

  async closeLatestSession(userId: string) {
    const supabase = createClient();

    const { data: activeSession, error: fetchError } = await supabase
      .from("user_sessions")
      .select("id")
      .eq("user_id", userId)
      .is("logout_at", null)
      .order("login_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !activeSession) {
      return { error: fetchError };
    }

    return supabase
      .from("user_sessions")
      .update({ logout_at: new Date().toISOString() })
      .eq("id", activeSession.id);
  },
};