"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@/hooks/use-user";
import { leadService } from "@/services/leads";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { LeadEmptyState } from "@/features/leads/components/lead-empty-state";
import {
  leadNoteSchema,
  type LeadNoteFormValues,
} from "@/features/leads/schemas/lead.schema";
import type { LeadNote } from "@/types/lead";

type LeadNotesTabProps = {
  leadId: string;
  notes: LeadNote[];
  onAdded: () => void;
};

export function LeadNotesTab({ leadId, notes, onAdded }: LeadNotesTabProps) {
  const user = useUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadNoteFormValues>({
    resolver: zodResolver(leadNoteSchema),
    defaultValues: { note: "" },
  });

  const onSubmit = async (data: LeadNoteFormValues) => {
    if (!user?.company_id || !user.user_id) return;

    const { error } = await leadService.addNote(user.company_id, {
      lead_id: leadId,
      note: data.note,
      created_by: user.user_id,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Note added");
    reset();
    onAdded();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="note">Add Note</Label>
          <Textarea
            id="note"
            placeholder="Write a note..."
            rows={3}
            {...register("note")}
            aria-invalid={!!errors.note}
          />
          {errors.note && (
            <p className="text-sm text-destructive">{errors.note.message}</p>
          )}
        </div>
        <Button type="submit" variant="gold" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add Note"}
        </Button>
      </form>

      {notes.length === 0 ? (
        <LeadEmptyState
          title="No notes yet"
          description="Add the first note for this lead."
        />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <p className="text-sm whitespace-pre-wrap">{note.note}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {note.created_by_name ?? "Unknown"} ·{" "}
                {new Date(note.created_at).toLocaleString("en-IN")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}