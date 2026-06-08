import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateCompanyUserInput } from "@/types/user-management";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("users")
      .select("id, company_id, role")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();

    if (!adminProfile || adminProfile.role !== "company_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as CreateCompanyUserInput;

    if (!["team_leader", "sales_executive"].includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const admin = createAdminClient();
    const tempPassword = crypto.randomUUID();

    const { data: createdAuth, error: authError } =
      await admin.auth.admin.createUser({
        email: body.email,
        password: tempPassword,
        email_confirm: true,
      });

    if (authError || !createdAuth.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Failed to create auth user" },
        { status: 400 },
      );
    }

    const { data: createdProfile, error: profileError } = await supabase
      .from("users")
      .insert({
        auth_user_id: createdAuth.user.id,
        company_id: adminProfile.company_id,
        team_id: body.team_id,
        role: body.role,
        full_name: body.full_name,
        mobile: body.mobile,
        email: body.email,
        status: body.status,
      })
      .select("id")
      .single();

    if (profileError) {
      await admin.auth.admin.deleteUser(createdAuth.user.id);
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 },
      );
    }

    if (body.role === "team_leader" && body.team_id) {
      await supabase
        .from("teams")
        .update({ team_leader_id: createdProfile.id })
        .eq("id", body.team_id)
        .eq("company_id", adminProfile.company_id);
    }

    return NextResponse.json({ id: createdProfile.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}