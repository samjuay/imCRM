"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { leadService } from "@/services/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { LeadEmptyState } from "@/features/leads/components/lead-empty-state";
import {
  leadSiteVisitSchema,
  type LeadSiteVisitFormValues,
} from "@/features/leads/schemas/lead.schema";
import type { LeadSiteVisit, SiteVisitStatus } from "@/types/lead";
import type { Project } from "@/types/project";

const STATUS_LABELS: Record<SiteVisitStatus, string> = {
  planned: "Planned",
  done: "Done",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
};

function toDatetimeLocalValue(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

type LeadSiteVisitsTabProps = {
  leadId: string;
  siteVisits: LeadSiteVisit[];
  projects: Project[];
  onAdded: () => void;
  onUpdated: () => void;
};

export function LeadSiteVisitsTab({
  leadId,
  siteVisits,
  projects,
  onAdded,
  onUpdated,
}: LeadSiteVisitsTabProps) {
  const user = useUser();
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'planned' | 'done'>('planned');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadSiteVisitFormValues>({
    resolver: zodResolver(leadSiteVisitSchema),
    defaultValues: {
      project_id: "",
      visit_date: "",
      remarks: "",
    },
  });

  const onSubmit = async (data: LeadSiteVisitFormValues) => {
    if (!user?.company_id || !user.user_id) return;

    const { error } = await leadService.addSiteVisit(user.company_id, {
      lead_id: leadId,
      visit_date: new Date(data.visit_date).toISOString(),
      project_id: data.project_id || null,
      remarks: data.remarks || null,
      created_by: user.user_id,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Site visit scheduled");
    reset();
    onAdded();
  };

  const updateVisitStatus = async (
    visitId: string,
    visitStatus: SiteVisitStatus,
    visitDate?: string,
  ) => {
    if (!user?.company_id) return;

    setUpdatingId(visitId);
    const { error } = await leadService.updateSiteVisit(user.company_id, visitId, {
      visit_status: visitStatus,
      ...(visitDate ? { visit_date: new Date(visitDate).toISOString() } : {}),
    });
    setUpdatingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Visit marked as ${STATUS_LABELS[visitStatus]}`);
    setReschedulingId(null);
    setRescheduleDate("");
    onUpdated();
  };

  const startReschedule = (visit: LeadSiteVisit) => {
    setReschedulingId(visit.id);
    setRescheduleDate(toDatetimeLocalValue(visit.visit_date));
  };

  const plannedVisits = [...siteVisits]
    .filter((v) => v.visit_status === "planned" || v.visit_status === "rescheduled")
    .sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime());

  const doneVisits = [...siteVisits]
    .filter((v) => v.visit_status === "done")
    .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());

  const currentVisits = activeView === "planned" ? plannedVisits : doneVisits;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="project_id">Project</Label>
          <Select id="project_id" {...register("project_id")}>
            <option value="">Select project (optional)</option>
            {projects
              .filter((p) => p.status === "active")
              .map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_name}
                </option>
              ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="visit_date">Visit Date & Time *</Label>
          <Input
            id="visit_date"
            type="datetime-local"
            {...register("visit_date")}
            aria-invalid={!!errors.visit_date}
          />
          {errors.visit_date && (
            <p className="text-sm text-destructive">
              {errors.visit_date.message}
            </p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="visit_remarks">Remarks</Label>
          <Textarea id="visit_remarks" rows={2} {...register("remarks")} />
        </div>

        <div className="sm:col-span-2">
          <Button type="submit" variant="gold" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Scheduling..." : "Schedule Visit"}
          </Button>
        </div>
      </form>

      <div className="flex gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveView("planned")}
          className={cn(
            "px-3 py-1 text-sm font-medium rounded",
            activeView === "planned"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Planned
        </button>
        <button
          type="button"
          onClick={() => setActiveView("done")}
          className={cn(
            "px-3 py-1 text-sm font-medium rounded",
            activeView === "done"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Done
        </button>
      </div>

      {currentVisits.length === 0 ? (
        <LeadEmptyState
          title={activeView === "planned" ? "No upcoming visits" : "No completed visits"}
          description={
            activeView === "planned"
              ? "Schedule a visit using the form above."
              : "Visits you mark Done will appear here."
          }
        />
      ) : (
        <div className="space-y-3">
          {currentVisits.map((visit) => {
            const isDoneView = activeView === "done";
            return (
              <div
                key={visit.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {visit.project_name ?? "No project selected"}
                  </span>
                  <Badge variant="outline">
                    {STATUS_LABELS[visit.visit_status]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(visit.visit_date).toLocaleString("en-IN")}
                </p>
                {visit.remarks && (
                  <p className="mt-2 text-sm">{visit.remarks}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  by {visit.created_by_name ?? "Unknown"}
                </p>

                {reschedulingId === visit.id ? (
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`reschedule-${visit.id}`} className="text-xs">
                        New date & time
                      </Label>
                      <Input
                        id={`reschedule-${visit.id}`}
                        type="datetime-local"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="gold"
                      disabled={!rescheduleDate || updatingId === visit.id}
                      onClick={() =>
                        void updateVisitStatus(
                          visit.id,
                          "rescheduled",
                          rescheduleDate,
                        )
                      }
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReschedulingId(null);
                        setRescheduleDate("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!isDoneView && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingId === visit.id}
                        onClick={() => void updateVisitStatus(visit.id, "done")}
                      >
                        Mark Done
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingId === visit.id}
                      onClick={() => startReschedule(visit)}
                    >
                      Reschedule
                    </Button>
                    {!isDoneView && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingId === visit.id}
                        onClick={() => void updateVisitStatus(visit.id, "cancelled")}
                      >
                        Cancel
                      </Button>
                    )}
                    {isDoneView && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingId === visit.id}
                        onClick={() => void updateVisitStatus(visit.id, "planned")}
                      >
                        Reopen as Planned
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
