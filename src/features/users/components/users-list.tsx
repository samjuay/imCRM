"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useUsers } from "@/hooks/use-users";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/utils/constants";
import type { CompanyUser } from "@/types/lead";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  company_admin: "Company Admin",
  team_leader: "Team Leader",
  sales_executive: "Sales Executive",
};

function getTeamName(user: CompanyUser, teams: { id: string; team_name: string }[]) {
  if (!user.team_id) return "—";
  return teams.find((t) => t.id === user.team_id)?.team_name ?? "—";
}

type UsersListProps = {
  users: CompanyUser[];
  teams: { id: string; team_name: string }[];
};

export function UsersList({ users, teams }: UsersListProps) {
  const { can } = usePermissions();
  const canCreate = can("users", "create");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Users</h1>
          <p className="text-sm text-muted-foreground">
            Company Admin → Team Leader → Sales Executive
          </p>
        </div>
        {canCreate && (
          <Button asChild variant="gold" size="sm">
            <Link href={ROUTES.usersNew}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">New User</span>
              <span className="sm:hidden">New</span>
            </Link>
          </Button>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Phone</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Team</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-border last:border-0 hover:bg-muted/20"
              >
                <td className="px-4 py-3 font-medium">{user.full_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {user.mobile ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {getTeamName(user, teams)}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={user.status === "active" ? "default" : "secondary"}
                  >
                    {user.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {users.map((user) => (
          <div
            key={user.id}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-primary">{user.full_name}</p>
              <Badge
                variant={user.status === "active" ? "default" : "secondary"}
              >
                {user.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
            <p className="text-sm text-muted-foreground">{user.mobile ?? "—"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">
                {ROLE_LABELS[user.role] ?? user.role}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Team: {getTeamName(user, teams)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UsersListContainer() {
  const { users, teams, isLoading, error, refresh } = useUsers();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void refresh()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="space-y-4">
        <UsersList users={[]} teams={teams} />
        <p className="text-center text-sm text-muted-foreground">
          No users found. Create your first team member.
        </p>
      </div>
    );
  }

  return <UsersList users={users} teams={teams} />;
}