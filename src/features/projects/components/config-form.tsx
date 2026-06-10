"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import {
  configFormSchema,
  type ConfigFormValues,
} from "@/features/projects/schemas/project.schema";
import { PROJECT_STATUSES } from "@/types/project";
import type { ProjectConfiguration } from "@/types/project";

type ConfigFormProps = {
  projectId: string;
  config?: ProjectConfiguration;
  onSubmit: (data: ConfigFormValues, id?: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
};

export function ConfigForm({
  projectId,
  config,
  onSubmit,
  onCancel,
  isSubmitting,
}: ConfigFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConfigFormValues>({
    resolver: zodResolver(configFormSchema),
    defaultValues: {
      configuration_name: config?.configuration_name ?? "",
      carpet_area: config?.carpet_area != null ? String(config.carpet_area) : "",
      saleable_area: config?.saleable_area != null ? String(config.saleable_area) : "",
      starting_price: config?.starting_price != null ? String(config.starting_price) : "",
      status: config?.status ?? "active",
    },
  });

  const handleFormSubmit = async (data: ConfigFormValues) => {
    try {
      await onSubmit(data, config?.id);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save configuration");
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="configuration_name">Configuration Name *</Label>
        <Input
          id="configuration_name"
          {...register("configuration_name")}
          aria-invalid={!!errors.configuration_name}
          placeholder="e.g. 2BHK Deluxe"
        />
        {errors.configuration_name && (
          <p className="text-sm text-destructive">{errors.configuration_name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="carpet_area">Carpet Area (sq ft)</Label>
          <Input
            id="carpet_area"
            type="number"
            step="0.01"
            {...register("carpet_area")}
            placeholder="850"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="saleable_area">Saleable Area (sq ft)</Label>
          <Input
            id="saleable_area"
            type="number"
            step="0.01"
            {...register("saleable_area")}
            placeholder="1050"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="starting_price">Base Price</Label>
          <Input
            id="starting_price"
            type="number"
            step="0.01"
            {...register("starting_price")}
            placeholder="4500000"
          />
        </div>
      </div>

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

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="gold" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : config ? "Update Configuration" : "Add Configuration"}
        </Button>
      </div>
    </form>
  );
}
