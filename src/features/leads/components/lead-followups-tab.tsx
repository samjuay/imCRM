"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@/hooks/use-user";
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
  leadFollowupSchema,
  type LeadFollowupFormValues,
} from "@/features/leads/schemas/lead.schema";
import {
  FOLLOWUP_OUTCOMES,
  type FollowupOutcome,
  type LeadFollowup,
} from "@/types/lead";

const OUTCOME_LABELS: Record<FollowupOutcome, string> = {
  pending: "Pending",
  connected: "Connected",
  no_response: "No Response",
  interested: "Interested",
  not_interested: "Not Interested",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
};

type LeadFollowupsTabProps = {
  leadId: string;
  followups: LeadFollowup[];
  onAdded: () => void;
  onUpdated: () => void;
};

export function LeadFollowupsTab({
  leadId,
  followups,
  onAdded,
  onUpdated,
}: LeadFollowupsTabProps) {
  const user = useUser();
  const { followupTypes } = useMasterData();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadFollowupFormValues>({
    resolver: zodResolver(leadFollowupSchema),
    defaultValues: {
      followup_type_id: "",
      followup_date: "",
      remarks: "",
    },
  });

  const onSubmit = async (data: LeadFollowupFormValues) => {
    if (!user?.company_id || !user.user_id) return;

    const { error } = await leadService.addFollowup(user.company_id, {
      lead_id: leadId,
      followup_type_id: data.followup_type_id,
      followup_date: new Date(data.followup_date).toISOString(),
      remarks: data.remarks || null,
      created_by: user.user_id,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Follow-up scheduled");
    reset();
    onAdded();
  };

  const handleOutcomeChange = async (
    followupId: string,
    outcome: FollowupOutcome,
  ) => {
    if (!user?.company_id) return;

    const status =
      outcome === "cancelled"
        ? "cancelled"
        : outcome === "rescheduled" || outcome === "pending"
          ? "pending"
          : "completed";

    const { error } = await leadService.updateFollowup(
      user.company_id,
      followupId,
      { outcome, status },
    );

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Outcome updated");
    onUpdated();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="followup_type_id">Follow-up Type *</Label>
          <Select
            id="followup_type_id"
            {...register("followup_type_id")}
            aria-invalid={!!errors.followup_type_id}
          >
            <option value="">Select type</option>
            {followupTypes
              .filter((t) => t.is_active)
              .map((type) => (
                <option key={type.id} value={type.id}>
                  {type.type_name}
                </option>
              ))}
          </Select>
          {errors.followup_type_id && (
            <p className="text-sm text-destructive">
              {errors.followup_type_id.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="followup_date">Date & Time *</Label>
          <Input
            id="followup_date"
            type="datetime-local"
            {...register("followup_date")}
            aria-invalid={!!errors.followup_date}
          />
          {errors.followup_date && (
            <p className="text-sm text-destructive">
              {errors.followup_date.message}
            </p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="followup_remarks">Remarks</Label>
          <Textarea id="followup_remarks" rows={2} {...register("remarks")} />
        </div>

        <div className="sm:col-span-2">
          <Button type="submit" variant="gold" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Scheduling..." : "Schedule Follow-up"}
          </Button>
        </div>
      </form>

      {followups.length === 0 ? (
        <LeadEmptyState
          title="No follow-ups yet"
          description="Schedule the first follow-up for this lead."
        />
      ) : (
        <div className="space-y-3">
          {followups.map((followup) => (
            <div
              key={followup.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {followup.followup_type_name}
                </span>
                <Badge variant="outline">{followup.status}</Badge>
                {followup.outcome && followup.outcome !== "pending" && (
                  <Badge variant="secondary">
                    {OUTCOME_LABELS[followup.outcome]}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(followup.followup_date).toLocaleString("en-IN")}
              </p>
              {followup.remarks && (
                <p className="mt-2 text-sm">{followup.remarks}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                by {followup.created_by_name ?? "Unknown"}
              </p>

              <div className="mt-3 max-w-xs space-y-1">
                <Label htmlFor={`outcome-${followup.id}`} className="text-xs">
                  Outcome
                </Label>
                <Select
                  id={`outcome-${followup.id}`}
                  value={followup.outcome ?? "pending"}
                  onChange={(e) =>
                    void handleOutcomeChange(
                      followup.id,
                      e.target.value as FollowupOutcome,
                    )
                  }
                >
                  {FOLLOWUP_OUTCOMES.map((outcome) => (
                    <option key={outcome} value={outcome}>
                      {OUTCOME_LABELS[outcome]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}