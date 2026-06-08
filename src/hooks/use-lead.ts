"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { leadService } from "@/services/leads";
import { userService } from "@/services/user.service";
import { projectService } from "@/services/projects";
import type {
  CompanyUser,
  LeadDetail,
  LeadFollowup,
  LeadNote,
  LeadSiteVisit,
} from "@/types/lead";
import type { Project } from "@/types/project";

export function useLead(leadId: string) {
  const user = useUser();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [followups, setFollowups] = useState<LeadFollowup[]>([]);
  const [siteVisits, setSiteVisits] = useState<LeadSiteVisit[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const companyId = user?.company_id;

  useEffect(() => {
    if (!companyId || !leadId) {
      return;
    }

    let cancelled = false;

    const scopedCompanyId = companyId;

    async function loadLead() {
      setIsLoading(true);
      setError(null);

      const [leadResult, notesResult, followupsResult, visitsResult] =
        await Promise.all([
          leadService.getById(scopedCompanyId, leadId),
          leadService.listNotes(scopedCompanyId, leadId),
          leadService.listFollowups(scopedCompanyId, leadId),
          leadService.listSiteVisits(scopedCompanyId, leadId),
        ]);

      if (cancelled) return;

      if (leadResult.error || !leadResult.data) {
        setError(leadResult.error?.message ?? "Lead not found");
        setIsLoading(false);
        return;
      }

      setLead(leadResult.data);
      setNotes(notesResult.data ?? []);
      setFollowups(followupsResult.data ?? []);
      setSiteVisits(visitsResult.data ?? []);
      setIsLoading(false);
    }

    void loadLead();

    return () => {
      cancelled = true;
    };
  }, [companyId, leadId, refreshKey]);

  useEffect(() => {
    if (!companyId) return;

    void Promise.all([
      userService.getByCompany(companyId),
      projectService.getByCompany(companyId),
    ]).then(([usersResult, projectsResult]) => {
      if (usersResult.data) {
        setCompanyUsers(usersResult.data as CompanyUser[]);
      }
      if (projectsResult.data) {
        setProjects(projectsResult.data as Project[]);
      }
    });
  }, [companyId]);

  const refresh = () => {
    setRefreshKey((k) => k + 1);
  };

  return {
    lead,
    notes,
    followups,
    siteVisits,
    companyUsers,
    projects,
    isLoading,
    error,
    refresh,
  };
}