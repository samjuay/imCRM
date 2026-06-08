"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { userService } from "@/services/user.service";
import { teamService } from "@/services/teams";
import type { CompanyUser } from "@/types/lead";
import type { Team } from "@/types/team";

export function useUsers() {
  const profile = useUser();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!profile?.company_id) return;

    setIsLoading(true);
    setError(null);

    const [usersResult, teamsResult] = await Promise.all([
      userService.getByCompany(profile.company_id),
      teamService.getByCompany(profile.company_id),
    ]);

    if (usersResult.error) {
      setError(usersResult.error.message);
      setUsers([]);
    } else {
      setUsers((usersResult.data ?? []) as CompanyUser[]);
    }

    if (!teamsResult.error) {
      setTeams((teamsResult.data ?? []) as Team[]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!profile?.company_id) return;

      setIsLoading(true);
      setError(null);

      const [usersResult, teamsResult] = await Promise.all([
        userService.getByCompany(profile.company_id),
        teamService.getByCompany(profile.company_id),
      ]);

      if (cancelled) return;

      if (usersResult.error) {
        setError(usersResult.error.message);
        setUsers([]);
      } else {
        setUsers((usersResult.data ?? []) as CompanyUser[]);
      }

      if (!teamsResult.error) {
        setTeams((teamsResult.data ?? []) as Team[]);
      }

      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.company_id]);

  return {
    users,
    teams,
    isLoading,
    error,
    refresh: load,
  };
}