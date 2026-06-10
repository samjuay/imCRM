import { z } from "zod";

import {
  INVENTORY_STATUSES,
  PROJECT_STATUSES,
} from "@/types/project";

export const projectFormSchema = z.object({
  project_name: z.string().min(1, "Project name is required"),
  developer_name: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  status: z.enum(PROJECT_STATUSES),
  possession_date: z.string().optional().or(z.literal("")),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const configFormSchema = z.object({
  configuration_name: z.string().min(1, "Configuration name is required"),
  carpet_area: z.string().optional().or(z.literal("")),
  saleable_area: z.string().optional().or(z.literal("")),
  starting_price: z.string().optional().or(z.literal("")),
  status: z.enum(PROJECT_STATUSES),
});

export type ConfigFormValues = z.infer<typeof configFormSchema>;

export const inventoryFormSchema = z.object({
  configuration_id: z.string().min(1, "Configuration is required"),
  available_units: z.string().min(1, "Available units is required"),
  min_price: z.string().optional().or(z.literal("")),
  max_price: z.string().optional().or(z.literal("")),
  inventory_status: z.enum(INVENTORY_STATUSES),
});

export type InventoryFormValues = z.infer<typeof inventoryFormSchema>;
