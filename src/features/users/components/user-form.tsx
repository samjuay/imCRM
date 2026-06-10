"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { ROUTES } from "@/utils/constants";
import {
  userFormSchema,
  type UserFormValues,
} from "@/features/users/schemas/user.schema";
import type { CompanyUser } from "@/types/lead";
import type { Team } from "@/types/team";
import type { CreateCompanyUserInput } from "@/types/user-management";

type UserFormProps = {
  teams: Team[];
  teamLeaders: CompanyUser[];
};

export function UserForm({ teams, teamLeaders }: UserFormProps) {
  const router = useRouter();
  const profile = useUser();
  const [selectedRole, setSelectedRole] =
    useState<UserFormValues["role"]>("sales_executive");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      full_name: "",
      email: "",
      mobile: "",
      role: "sales_executive",
      team_id: "",
      team_leader_id: "",
      new_team_name: "",
      status: "active",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: UserFormValues) => {
    if (!profile?.company_id) return;

    const teamId = data.team_id || null;

    if (!teamId && teams.length === 0 && !data.new_team_name?.trim()) {
      toast.error("Team name is required");
      return;
    }

    const payload: CreateCompanyUserInput = {
      full_name: data.full_name,
      email: data.email,
      mobile: data.mobile.replace(/\D/g, "").slice(-10),
      role: data.role,
      team_id: teamId,
      team_leader_id:
        data.role === "sales_executive" ? data.team_leader_id || null : null,
      new_team_name: data.new_team_name?.trim() || null,
      status: data.status,
      password: data.password,
    };

    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as { error?: string; id?: string };

    if (!response.ok) {
      toast.error(result.error ?? "Failed to create user");
      return;
    }

    toast.success("User created successfully");
    router.push(ROUTES.users);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-lg space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Name *</Label>
        <Input
          id="full_name"
          {...register("full_name")}
          aria-invalid={!!errors.full_name}
        />
        {errors.full_name && (
          <p className="text-sm text-destructive">{errors.full_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="mobile">Phone *</Label>
        <Input
          id="mobile"
          type="tel"
          {...register("mobile")}
          aria-invalid={!!errors.mobile}
        />
        {errors.mobile && (
          <p className="text-sm text-destructive">{errors.mobile.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role *</Label>
        <Select
          id="role"
          {...register("role", {
            onChange: (e) =>
              setSelectedRole(e.target.value as UserFormValues["role"]),
          })}
          aria-invalid={!!errors.role}
        >
          <option value="team_leader">Team Leader</option>
          <option value="sales_executive">Sales Executive</option>
        </Select>
        {errors.role && (
          <p className="text-sm text-destructive">{errors.role.message}</p>
        )}
      </div>

      {teams.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="team_id">Team</Label>
          <Select id="team_id" {...register("team_id")}>
            <option value="">Select team (optional)</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.team_name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {selectedRole === "sales_executive" && teamLeaders.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="team_leader_id">Team Leader</Label>
          <Select id="team_leader_id" {...register("team_leader_id")}>
            <option value="">Auto-assign from team</option>
            {teamLeaders.map((leader) => (
              <option key={leader.id} value={leader.id}>
                {leader.full_name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="new_team_name">
          {teams.length === 0 ? "Team Name *" : "Or create new team"}
        </Label>
        <Input
          id="new_team_name"
          {...register("new_team_name")}
          placeholder="e.g. Sales Team A"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status *</Label>
        <Select id="status" {...register("status")} aria-invalid={!!errors.status}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        {errors.status && (
          <p className="text-sm text-destructive">{errors.status.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password *</Label>
        <Input
          id="password"
          type="password"
          {...register("password")}
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password *</Label>
        <Input
          id="confirmPassword"
          type="password"
          {...register("confirmPassword")}
          aria-invalid={!!errors.confirmPassword}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="gold" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create User"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(ROUTES.users)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}