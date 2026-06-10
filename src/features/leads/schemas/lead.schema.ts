import { z } from "zod";

export const leadFormSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .min(1, "Phone is required")
    .min(10, "Phone must be at least 10 digits")
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone number format"),
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  lead_source_id: z.string().min(1, "Source is required"),
  status_id: z.string().min(1, "Status is required"),
  budget: z.string().optional(),
  location: z.string().optional(),
  requirement: z.string().optional(),
  remarks: z.string().optional(),
  assigned_user_id: z.string().min(1, "Assigned To is required"),
  // Sprint 3B: optional assignment reason (max 500 chars, enforced in UI for assignment actions)
  assignment_reason: z.string().max(500, "Assignment reason must be 500 characters or less").optional().or(z.literal("")),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

export const leadNoteSchema = z.object({
  note: z.string().min(1, "Note is required"),
});

export type LeadNoteFormValues = z.infer<typeof leadNoteSchema>;

export const leadFollowupSchema = z.object({
  followup_type_id: z.string().min(1, "Follow-up type is required"),
  followup_date: z.string().min(1, "Date is required"),
  remarks: z.string().optional(),
});

export type LeadFollowupFormValues = z.infer<typeof leadFollowupSchema>;

export const leadSiteVisitSchema = z.object({
  project_id: z.string().optional().or(z.literal("")),
  visit_date: z.string().min(1, "Date is required"),
  remarks: z.string().optional(),
});

export type LeadSiteVisitFormValues = z.infer<typeof leadSiteVisitSchema>;

// ---------------------------------------------------------------------------
// Status Update form (Sprint 2B - dependent stage/outcome + conditionals)
// ---------------------------------------------------------------------------

export const leadStatusUpdateSchema = z.object({
  stage: z.string().min(1, "Stage is required"),
  outcome: z.string().optional().or(z.literal("")),
  remark: z.string().min(1, "Remark is required"),
  next_followup_date: z.string().optional().or(z.literal("")),
  project_id: z.string().optional().or(z.literal("")),
  visit_date: z.string().optional().or(z.literal("")),
  followup_type_id: z.string().optional().or(z.literal("")),
});

export type LeadStatusUpdateFormValues = z.infer<typeof leadStatusUpdateSchema>;
