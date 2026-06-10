import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateCompanyUserInput } from "@/types/user-management";

async function resolveTeamLeaderId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  body: CreateCompanyUserInput,
) {
  if (body.role !== "sales_executive") {
    return null;
  }

  if (body.team_leader_id) {
    const { data: leader } = await supabase
      .from("users")
      .select("id")
      .eq("id", body.team_leader_id)
      .eq("company_id", companyId)
      .eq("role", "team_leader")
      .neq("status", "disabled")
      .maybeSingle();

    return leader?.id ?? null;
  }

  if (!body.team_id) {
    return null;
  }

  const { data: team } = await supabase
    .from("teams")
    .select("team_leader_id")
    .eq("id", body.team_id)
    .eq("company_id", companyId)
    .maybeSingle();

  return team?.team_leader_id ?? null;
}

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

    const admin = createAdminClient();

    const body = (await request.json()) as CreateCompanyUserInput;

    if (!["team_leader", "sales_executive"].includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    let finalTeamId: string | null = body.team_id || null;
    let createdTeamId: string | null = null;

    if (!finalTeamId && body.new_team_name && body.new_team_name.trim()) {
      const { data: createdTeam, error: teamError } = await supabase
        .from("teams")
        .insert({
          team_name: body.new_team_name.trim(),
          company_id: adminProfile.company_id,
        })
        .select("id")
        .single();

      if (teamError || !createdTeam) {
        return NextResponse.json(
          { error: teamError?.message ?? "Failed to create team" },
          { status: 400 },
        );
      }

      finalTeamId = createdTeam.id;
      createdTeamId = finalTeamId;
    }

    const teamLeaderId = await resolveTeamLeaderId(
      supabase,
      adminProfile.company_id,
      { ...body, team_id: finalTeamId },
    );

    let createdAuthId: string | null = null;

    try {
      const { data: createdAuth, error: authError } =
        await admin.auth.admin.createUser({
          email: body.email,
          password: body.password,
          email_confirm: true,
        });

      if (authError || !createdAuth.user) {
        if (createdTeamId) {
          await supabase
            .from("teams")
            .delete()
            .eq("id", createdTeamId)
            .eq("company_id", adminProfile.company_id);
        }
        return NextResponse.json(
          { error: authError?.message ?? "Failed to create auth user" },
          { status: 400 },
        );
      }

      createdAuthId = createdAuth.user.id;

      const { data: createdProfile, error: profileError } = await admin
        .from("users")
        .insert({
          auth_user_id: createdAuthId,
          company_id: adminProfile.company_id,
          team_id: finalTeamId,
          team_leader_id: teamLeaderId,
          role: body.role,
          full_name: body.full_name,
          mobile: body.mobile,
          email: body.email,
          status: body.status,
        })
        .select("id")
        .single();

      if (profileError) {
        await admin.auth.admin.deleteUser(createdAuthId);
        if (createdTeamId) {
          await supabase
            .from("teams")
            .delete()
            .eq("id", createdTeamId)
            .eq("company_id", adminProfile.company_id);
        }
        return NextResponse.json(
          { error: profileError.message },
          { status: 400 },
        );
      }

      if (body.role === "team_leader" && finalTeamId) {
        const { error: updateError } = await admin
          .from("teams")
          .update({ team_leader_id: createdProfile.id })
          .eq("id", finalTeamId)
          .eq("company_id", adminProfile.company_id);

        if (updateError) {
          // rollback user and auth and team
          await admin.from("users").delete().eq("id", createdProfile.id);
          await admin.auth.admin.deleteUser(createdAuthId);
          if (createdTeamId) {
            await admin
              .from("teams")
              .delete()
              .eq("id", createdTeamId)
              .eq("company_id", adminProfile.company_id);
          }
          return NextResponse.json(
            { error: updateError.message },
            { status: 400 },
          );
        }
      }

      return NextResponse.json({ id: createdProfile.id });
    } catch (innerError) {
      if (createdAuthId) {
        try {
          await admin.auth.admin.deleteUser(createdAuthId);
        } catch {}
      }
      if (createdTeamId) {
        try {
          await supabase
            .from("teams")
            .delete()
            .eq("id", createdTeamId)
            .eq("company_id", adminProfile.company_id);
        } catch {}
      }
      const message =
        innerError instanceof Error ? innerError.message : "Internal server error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}