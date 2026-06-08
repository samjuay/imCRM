"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useUsers } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPermissionGate } from "@/features/users/components/user-permission-gate";
import { UserForm } from "@/features/users/components/user-form";
import { ROUTES } from "@/utils/constants";

function NewUserContent() {
  const { users, teams, isLoading, refresh } = useUsers();
  const teamLeaders = users.filter((user) => user.role === "team_leader");

  if (isLoading) {
    return <Skeleton className="h-64 w-full max-w-lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={ROUTES.users}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-primary">New User</h1>
          <p className="text-sm text-muted-foreground">
            Create a Team Leader or Sales Executive
          </p>
        </div>
      </div>

      <UserForm
        teams={teams}
        teamLeaders={teamLeaders}
        onTeamCreated={() => void refresh()}
      />
    </div>
  );
}

export default function NewUserPage() {
  return (
    <UserPermissionGate action="create">
      <NewUserContent />
    </UserPermissionGate>
  );
}