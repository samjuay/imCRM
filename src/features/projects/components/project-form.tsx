"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import {
  projectFormSchema,
  type ProjectFormValues,
} from "@/features/projects/schemas/project.schema";
import { PROJECT_STATUSES } from "@/types/project";
import type { Project } from "@/types/project";

type ProjectFormProps = {
  project?: Project;
  onSubmit: (data: ProjectFormValues, id?: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
};

export function ProjectForm({
  project,
  onSubmit,
  onCancel,
  isSubmitting,
}: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      project_name: project?.project_name ?? "",
      developer_name: project?.developer_name ?? "",
      location: project?.location ?? "",
      status: project?.status ?? "active",
      possession_date: project?.possession_date ?? "",
    },
  });

  const handleFormSubmit = async (data: ProjectFormValues) => {
    try {
      await onSubmit(data, project?.id);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save project");
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="project_name">Project Name *</Label>
        <Input
          id="project_name"
          {...register("project_name")}
          aria-invalid={!!errors.project_name}
          placeholder="e.g. Green Valley Residency"
        />
        {errors.project_name && (
          <p className="text-sm text-destructive">{errors.project_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="developer_name">Developer Name</Label>
        <Input
          id="developer_name"
          {...register("developer_name")}
          placeholder="e.g. ABC Developers"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          {...register("location")}
          placeholder="e.g. Andheri West, Mumbai"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" {...register("status")}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="possession_date">Possession Date</Label>
          <Input
            id="possession_date"
            type="date"
            {...register("possession_date")}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="gold" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : project ? "Update Project" : "Create Project"}
        </Button>
      </div>
    </form>
  );
}
