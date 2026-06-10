"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import {
  inventoryFormSchema,
  type InventoryFormValues,
} from "@/features/projects/schemas/project.schema";
import { INVENTORY_STATUSES } from "@/types/project";
import type { ProjectConfiguration, ProjectInventory } from "@/types/project";

type InventoryFormProps = {
  projectId: string;
  configurations: ProjectConfiguration[];
  inventory?: ProjectInventory;
  onSubmit: (data: InventoryFormValues, id?: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
};

export function InventoryForm({
  projectId,
  configurations,
  inventory,
  onSubmit,
  onCancel,
  isSubmitting,
}: InventoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      configuration_id: inventory?.configuration_id ?? "",
      available_units: inventory ? String(inventory.available_units) : "",
      min_price: inventory?.min_price != null ? String(inventory.min_price) : "",
      max_price: inventory?.max_price != null ? String(inventory.max_price) : "",
      inventory_status: inventory?.inventory_status ?? "available",
    },
  });

  const handleFormSubmit = async (data: InventoryFormValues) => {
    try {
      await onSubmit(data, inventory?.id);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save inventory");
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="configuration_id">Configuration *</Label>
        <Select
          id="configuration_id"
          {...register("configuration_id")}
          disabled={!!inventory}
        >
          <option value="">Select configuration</option>
          {configurations.map((c) => (
            <option key={c.id} value={c.id}>
              {c.configuration_name}
            </option>
          ))}
        </Select>
        {errors.configuration_id && (
          <p className="text-sm text-destructive">{errors.configuration_id.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="available_units">Available Units *</Label>
          <Input
            id="available_units"
            type="number"
            min="0"
            {...register("available_units")}
            aria-invalid={!!errors.available_units}
          />
          {errors.available_units && (
            <p className="text-sm text-destructive">{errors.available_units.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="min_price">Min Price</Label>
          <Input
            id="min_price"
            type="number"
            step="0.01"
            {...register("min_price")}
            placeholder="4500000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_price">Max Price</Label>
          <Input
            id="max_price"
            type="number"
            step="0.01"
            {...register("max_price")}
            placeholder="6500000"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="inventory_status">Status</Label>
        <Select id="inventory_status" {...register("inventory_status")}>
          {INVENTORY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="gold" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : inventory ? "Update Inventory" : "Add Inventory"}
        </Button>
      </div>
    </form>
  );
}
