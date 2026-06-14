"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useMasterData } from "@/hooks/use-master-data";
import { leadService } from "@/services/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import {
  leadFormSchema,
  type LeadFormValues,
} from "@/features/leads/schemas/lead.schema";
import type { CompanyUser, LeadDetail } from "@/types/lead";

type LeadFormProps = {
  mode: "create" | "edit";
  lead?: LeadDetail;
  companyUsers: CompanyUser[];
};

export function LeadForm({ mode, lead, companyUsers }: LeadFormProps) {
  const router = useRouter();
  const user = useUser();
  const isSalesExecutive = user?.role === "sales_executive";
  const { leadSources, leadStatuses } = useMasterData();
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const defaultStatus = leadStatuses.find((s) => s.status_name === "Fresh");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      full_name: lead?.full_name ?? "",
      phone: lead?.phone ?? "",
      email: lead?.email ?? "",
      lead_source_id: lead?.lead_source_id ?? "",
      status_id: lead?.status_id ?? defaultStatus?.id ?? "",
      budget: lead?.budget != null ? String(lead.budget) : "",
      location: lead?.location ?? "",
      requirement: lead?.requirement ?? "",
      remarks: lead?.remarks ?? "",
      assigned_user_id: lead?.assigned_user_id ?? "",
      assignment_reason: "",
    },
  });

  const checkDuplicatePhone = async (phone: string) => {
    if (!user?.company_id || phone.length < 10) {
      setDuplicateWarning(null);
      return;
    }

    const { exists, lead: existing } = await leadService.checkDuplicatePhone(
      user.company_id,
      phone,
      lead?.id,
    );

    if (exists && existing) {
      setDuplicateWarning(
        `A lead with this phone already exists: ${(existing as { full_name: string }).full_name}`,
      );
    } else {
      setDuplicateWarning(null);
    }
  };

  const onSubmit = async (data: LeadFormValues) => {
    if (!user?.company_id || !user.user_id) return;

    if (!user?.company_id || !user.user_id) return;

    // For create: explicit assignment is required (per Sprint 3B ownership model)
    // For edit: if assigned_user_id changed, use dedicated assignLead (never detection in update())
    const originalAssigned = lead?.assigned_user_id ?? null;
    const newAssigned = data.assigned_user_id || null;
    const reason = data.assignment_reason || null;

    const otherPayload = {
      full_name: data.full_name,
      phone: data.phone,
      email: data.email || null,
      lead_source_id: data.lead_source_id,
      status_id: data.status_id,
      budget: data.budget === "" ? null : Number(data.budget),
      location: data.location || null,
      requirement: data.requirement || null,
      remarks: data.remarks || null,
    };

    if (mode === "create") {
      // Creation requires explicit assignment (no auto to creator, no NULL)
      if (!newAssigned) {
        toast.error("Assigned To is required to create a lead");
        return;
      }
      const { data: created, error } = await leadService.create(
        user.company_id,
        { ...otherPayload, assigned_user_id: newAssigned, created_by: user.user_id } as any,
      );

      if (error) {
        toast.error(error.message);
        return;
      }

      // Optionally log initial assignment, but per plan creation itself is the event; subsequent re-assignments use assignLead
      toast.success("Lead created successfully");
      router.replace(`/leads/${created.id}`);
      return;
    }

    if (!lead) return;

    // Edit path: use dedicated assignLead if assignee changed (assignment logic only in assignLead)
    if (newAssigned !== originalAssigned) {
      const { success, error: assignErr } = await leadService.assignLead(
        user.company_id,
        lead.id,
        newAssigned,
        user.user_id,
        reason
      );
      if (!success) {
        toast.error(assignErr?.message || "Failed to assign lead");
        return;
      }
      // Still update other fields if any changed (non-assignment)
      const hasOtherChanges = Object.keys(otherPayload).some((k) => (otherPayload as any)[k] !== (lead as any)[k]);
      if (hasOtherChanges) {
        const { error: otherErr } = await leadService.update(user.company_id, lead.id, otherPayload as any);
        if (otherErr) {
          toast.error(otherErr.message);
          return;
        }
      }
      toast.success("Lead updated (assignment recorded)");
      router.replace(`/leads/${lead.id}`);
      return;
    }

    // No assignee change: normal update (assignment logic untouched)
    const { error } = await leadService.update(
      user.company_id,
      lead.id,
      { ...otherPayload, assigned_user_id: originalAssigned } as any,
    );

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Lead updated successfully");
    router.replace(`/leads/${lead.id}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
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
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            type="tel"
            {...register("phone", {
              onBlur: (e) => void checkDuplicatePhone(e.target.value),
            })}
            aria-invalid={!!errors.phone}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
          {duplicateWarning && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{duplicateWarning}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lead_source_id">Source *</Label>
          <Select
            id="lead_source_id"
            {...register("lead_source_id")}
            aria-invalid={!!errors.lead_source_id}
          >
            <option value="">Select source</option>
            {leadSources
              .filter((s) => s.is_active)
              .map((source) => (
                <option key={source.id} value={source.id}>
                  {source.source_name}
                </option>
              ))}
          </Select>
          {errors.lead_source_id && (
            <p className="text-sm text-destructive">
              {errors.lead_source_id.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status_id">Status *</Label>
          <Select
            id="status_id"
            {...register("status_id")}
            aria-invalid={!!errors.status_id}
          >
            <option value="">Select status</option>
            {leadStatuses
              .filter((s) => s.is_active)
              .map((status) => (
                <option key={status.id} value={status.id}>
                  {status.status_name}
                </option>
              ))}
          </Select>
          {errors.status_id && (
            <p className="text-sm text-destructive">{errors.status_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="assigned_user_id">Assigned To *</Label>
          <Select
            id="assigned_user_id"
            {...register("assigned_user_id")}
            disabled={mode === "edit" && isSalesExecutive}
          >
            {/* For create: no unassigned option (explicit assignment required per Sprint 3B model).
                For edit: allow keeping current (even if was null in legacy data). */}
            {mode === "create" ? null : <option value="">Unassigned (legacy)</option>}
            {companyUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </Select>
          {errors.assigned_user_id && (
            <p className="text-sm text-destructive">{errors.assigned_user_id.message}</p>
          )}
          {mode === "edit" && isSalesExecutive && (
            <p className="text-xs text-muted-foreground">Sales executives cannot change lead assignment.</p>
          )}
        </div>

        {/* Sprint 3B: optional assignment reason (max 500 chars, validated in UI) */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="assignment_reason">Assignment Reason (optional)</Label>
          <Textarea
            id="assignment_reason"
            rows={2}
            placeholder="e.g. Round robin distribution, Employee resigned, Manual reassignment"
            {...register("assignment_reason")}
            maxLength={500}
          />
          {errors.assignment_reason && (
            <p className="text-sm text-destructive">{errors.assignment_reason.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget">Budget</Label>
          <Input
            id="budget"
            type="number"
            min="0"
            step="1000"
            {...register("budget")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...register("location")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="requirement">Requirement</Label>
        <Textarea id="requirement" {...register("requirement")} rows={2} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="remarks">Remarks</Label>
        <Textarea id="remarks" {...register("remarks")} rows={2} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" variant="gold" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving..."
            : mode === "create"
              ? "Create Lead"
              : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}