"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@/hooks/use-user";
import { usePermissions } from "@/hooks/use-permissions";
import { useMasterData } from "@/hooks/use-master-data";
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
  leadStatusUpdateSchema,
  type LeadStatusUpdateFormValues,
} from "@/features/leads/schemas/lead.schema";
import type { LeadDetail, LeadStatusUpdate } from "@/types/lead";
import type { Project } from "@/types/project";

const LEAD_STAGES = [
  "Fresh",
  "Contacted",
  "Follow Up",
  "Site Visit Planned",
  "Site Visit Done",
  "Interested",
  "Booked",
  "Lost",
  "Not Interested",
] as const;

const OUTCOME_MAP: Record<string, string[]> = {
  Fresh: ["Not Dialed", "Ringing", "Busy", "No Answer", "Wrong Number"],
  Contacted: ["Interested", "Need Followup", "Call Back", "Not Interested"],
  "Follow Up": ["Ringing", "Call Back", "Interested", "Site Visit Planned", "Lost"],
  "Site Visit Planned": ["Confirmed", "Rescheduled", "Cancelled", "Site Visit Done"],
  "Site Visit Done": ["Interested", "Negotiation", "Booked", "Dropped"],
  Interested: ["Budget Discussion", "Negotiation", "Token Pending", "Booked", "Lost"],
  Booked: ["Token Paid", "Agreement Done", "Completed"],
  Lost: ["Other"],
  "Not Interested": ["Other"],
};

const TRANSITION_MAP: Record<string, string[]> = {
  Fresh: ["Fresh", "Contacted", "Lost", "Not Interested"],
  Contacted: ["Contacted", "Follow Up", "Interested", "Lost", "Not Interested"],
  "Follow Up": ["Follow Up", "Interested", "Site Visit Planned", "Lost", "Not Interested"],
  Interested: ["Interested", "Site Visit Planned", "Lost", "Not Interested"],
  "Site Visit Planned": ["Site Visit Planned", "Site Visit Done", "Lost", "Not Interested"],
  "Site Visit Done": ["Site Visit Done", "Booked", "Follow Up", "Lost"],
  Booked: ["Booked"],
  Lost: ["Lost"],
  "Not Interested": ["Not Interested"],
};

type LeadActivityTimelineTabProps = {
  leadId: string;
  lead: LeadDetail;
  statusUpdates: LeadStatusUpdate[];
  projects: Project[];
  onUpdated: () => void;
};

type FollowupType = { id: string; type_name: string; is_active: boolean };

export function LeadActivityTimelineTab({
  leadId,
  lead,
  statusUpdates,
  projects,
  onUpdated,
}: LeadActivityTimelineTabProps) {
  const user = useUser();
  const { can } = usePermissions();
  const { leadStatuses, followupTypes = [] } = useMasterData();
  const canEdit = can("leads", "edit");

  const [selectedStage, setSelectedStage] = useState<string>(
    lead.status_name || "Fresh"
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LeadStatusUpdateFormValues>({
    resolver: zodResolver(leadStatusUpdateSchema),
    defaultValues: {
      stage: lead.status_name || "Fresh",
      outcome: "",
      remark: "",
      next_followup_date: "",
      project_id: "",
      visit_date: "",
      followup_type_id: "",
    },
  });

  const currentOutcomes = OUTCOME_MAP[selectedStage] ?? [];

  const currentStage = lead.status_name || "Fresh";
  const allowedStages = TRANSITION_MAP[currentStage] || LEAD_STAGES;

  const onStageChange = (stage: string) => {
    setSelectedStage(stage);
    setValue("stage", stage);
    setValue("outcome", ""); // reset dependent
    setValue("next_followup_date", "");
    setValue("project_id", "");
    setValue("visit_date", "");
    setValue("followup_type_id", "");
  };

  const onSubmit = async (data: LeadStatusUpdateFormValues) => {
    if (!user?.company_id || !user.user_id || !canEdit) return;

    const isStageChange = data.stage !== lead.status_name;

    if (data.next_followup_date && !data.followup_type_id) {
      toast.error("Follow-up Type is required when a Next Followup Date is provided");
      return;
    }

    if (isStageChange) {
      const statusRecord = leadStatuses.find((s) => s.status_name === data.stage);
      if (!statusRecord) {
        toast.error("Selected stage is not available in master data");
        return;
      }

      // Update lead status only on actual change
      const { error: updateErr } = await leadService.update(
        user.company_id,
        leadId,
        { status_id: statusRecord.id }
      );
      if (updateErr) {
        toast.error(updateErr.message);
        return;
      }
    }

    // Always create the activity log entry (supports same-stage for Option B)
    const { error: logErr } = await leadService.addStatusUpdate(
      user.company_id,
      {
        lead_id: leadId,
        previous_status: lead.status_name ?? null,
        new_status: data.stage,
        outcome: data.outcome || null,
        remark: data.remark,
        next_followup_date: data.next_followup_date || null,
        project_id: data.project_id || null,
        visit_date: data.visit_date || null,
        created_by: user.user_id,
      }
    );

    if (logErr) {
      toast.error(logErr.message);
      onUpdated();
      return;
    }

    // Automatic side effects (create when date provided, regardless of stage change)
    if (data.next_followup_date && data.followup_type_id) {
      const { error: fuErr } = await leadService.addFollowup(user.company_id, {
        lead_id: leadId,
        followup_type_id: data.followup_type_id,
        followup_date: new Date(data.next_followup_date).toISOString(),
        remarks: data.remark || null,
        created_by: user.user_id,
      });
      if (fuErr) {
        toast.error("Activity logged but failed to create followup: " + fuErr.message);
      }
    }

    if (data.visit_date) {
      const visitStatus = data.stage === "Site Visit Done" ? "done" : "planned";
      const { error: svErr } = await leadService.addSiteVisit(user.company_id, {
        lead_id: leadId,
        visit_date: new Date(data.visit_date).toISOString(),
        project_id: data.project_id || null,
        remarks: data.remark || null,
        visit_status: visitStatus,
        created_by: user.user_id,
      });
      if (svErr) {
        toast.error("Activity logged but failed to create site visit: " + svErr.message);
      }
    }

    toast.success(isStageChange ? `Stage updated to ${data.stage}` : `Activity logged for ${data.stage}`);
    reset({
      stage: data.stage,
      outcome: "",
      remark: "",
      next_followup_date: "",
      project_id: "",
      visit_date: "",
      followup_type_id: "",
    });
    onUpdated();
  };

  const showNextFollowup =
    selectedStage === "Contacted" ||
    selectedStage === "Follow Up" ||
    selectedStage === "Interested";

  const showVisitFields =
    selectedStage === "Site Visit Planned" ||
    selectedStage === "Site Visit Done";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Current Stage:
        </span>
        <Badge variant="outline" className="font-medium">
          {lead.status_name}
        </Badge>
      </div>

      {canEdit && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stage">Lead Stage</Label>
              <Select
                id="stage"
                value={selectedStage}
                onChange={(e) => onStageChange(e.target.value)}
              >
                {allowedStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </Select>
              {errors.stage && (
                <p className="text-sm text-destructive">{errors.stage.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome</Label>
              <Select id="outcome" {...register("outcome")}>
                <option value="">Select outcome (optional)</option>
                {currentOutcomes.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {showNextFollowup && (
            <>
              <div className="space-y-2">
                <Label htmlFor="next_followup_date">Next Followup Date</Label>
                <Input
                  id="next_followup_date"
                  type="datetime-local"
                  {...register("next_followup_date")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="followup_type_id">Follow-up Type *</Label>
                <Select
                  id="followup_type_id"
                  {...register("followup_type_id")}
                >
                  <option value="">Select type</option>
                  {followupTypes
                    .filter((t: FollowupType) => t.is_active)
                    .map((type: FollowupType) => (
                      <option key={type.id} value={type.id}>
                        {type.type_name}
                      </option>
                    ))}
                </Select>
              </div>
            </>
          )}

          {showVisitFields && (
            <div className="grid gap-4 sm:grid-cols-2">
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
                <Label htmlFor="visit_date">Visit Date</Label>
                <Input
                  id="visit_date"
                  type="datetime-local"
                  {...register("visit_date")}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="remark">Remark</Label>
            <Textarea
              id="remark"
              rows={3}
              placeholder="What was discussed / next steps?"
              {...register("remark")}
              aria-invalid={!!errors.remark}
            />
            {errors.remark && (
              <p className="text-sm text-destructive">{errors.remark.message}</p>
            )}
          </div>

          <Button type="submit" variant="gold" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Recording..." : "Record Activity"}
          </Button>
        </form>
      )}

      <div className="space-y-3">
        <div className="text-sm font-medium text-muted-foreground">
          Activity History
        </div>

        {statusUpdates.length === 0 ? (
          <LeadEmptyState
            title="No activities yet"
            description="Use the form above to log the first interaction or stage update for this lead."
          />
        ) : (
          statusUpdates.map((update) => (
            <div
              key={update.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm">
                  {update.previous_status ? (
                    <>
                      <span className="font-medium">{update.previous_status}</span>
                      {" → "}
                    </>
                  ) : null}
                  <span className="font-medium">{update.new_status}</span>
                </span>
                {update.outcome && (
                  <Badge variant="outline">{update.outcome}</Badge>
                )}
              </div>

              {(update.next_followup_date ||
                update.project_name ||
                update.visit_date) && (
                <div className="mt-1 text-sm text-muted-foreground">
                  {update.next_followup_date && (
                    <div>
                      Next followup:{" "}
                      {new Date(update.next_followup_date).toLocaleString("en-IN")}
                    </div>
                  )}
                  {(update.project_name || update.visit_date) && (
                    <div>
                      {update.project_name ?? "No project"}{" "}
                      {update.visit_date
                        ? `@ ${new Date(update.visit_date).toLocaleString("en-IN")}`
                        : ""}
                    </div>
                  )}
                </div>
              )}

              {update.remark && (
                <p className="mt-2 text-sm whitespace-pre-wrap">{update.remark}</p>
              )}

              <p className="mt-2 text-xs text-muted-foreground">
                {update.created_by_name ?? "Unknown"} ·{" "}
                {new Date(update.created_at).toLocaleString("en-IN")}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
