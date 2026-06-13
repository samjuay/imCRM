"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter, ModalDescription } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { useMasterDataStore } from "@/store/master-data-store";

const sourceSchema = z.object({
  source_name: z
    .string()
    .min(1, "Source name is required")
    .max(100, "Source name must be 100 characters or less")
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, "Source name cannot be empty or just whitespace"),
});

type SourceFormValues = z.infer<typeof sourceSchema>;

type LeadSourceFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SourceFormValues, id?: string) => Promise<void>;
  onCancel: () => void;
  initialData?: { id?: string; source_name: string; company_id?: string; archived_at?: string | null };
};

export function LeadSourceForm({ open, onOpenChange, onSubmit, onCancel, initialData }: LeadSourceFormProps) {
  const isEditing = !!initialData;
  const { leadSources } = useMasterDataStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<SourceFormValues>({
    resolver: zodResolver(sourceSchema),
    defaultValues: {
      source_name: initialData?.source_name || "",
    },
  });

  const handleFormSubmit = async (data: SourceFormValues) => {
    try {
      await onSubmit(data, initialData?.id);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save source");
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      reset();
    }
    onOpenChange(o);
  };

  // Check for duplicate as user types
  const sourceName = watch("source_name");
  const isDuplicate = Boolean(sourceName) && leadSources.some(
    (s) => 
      s.source_name.toLowerCase().trim() === sourceName.toLowerCase().trim() &&
      s.id !== initialData?.id &&
      !s.archived_at
  );

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle>{isEditing ? "Edit Source" : "Add Source"}</ModalTitle>
          <ModalDescription>
            {isEditing
              ? "Update the source name. Changes will apply to new leads only."
              : "Create a new lead source for your pipeline."}
          </ModalDescription>
        </ModalHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source_name">Source Name *</Label>
            <Input
              id="source_name"
              {...register("source_name")}
              placeholder="e.g. Google Ads, Referral, Website"
              aria-invalid={!!errors.source_name || isDuplicate ? "true" : "false"}
              disabled={isSubmitting}
            />
            {isDuplicate && (
              <p className="text-sm text-destructive">
                A source with this name already exists (case-insensitive)
              </p>
            )}
            {errors.source_name && (
              <p className="text-sm text-destructive">{errors.source_name.message}</p>
            )}
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={isSubmitting || isDuplicate}>
              {isSubmitting ? "Saving..." : isEditing ? "Update Source" : "Create Source"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}