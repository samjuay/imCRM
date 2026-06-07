export const PROJECT_STATUSES = ["active", "inactive"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const INVENTORY_STATUSES = ["available", "limited", "sold_out"] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export type Project = {
  id: string;
  company_id: string;
  project_name: string;
  developer_name: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  project_type: string | null;
  launch_date: string | null;
  possession_date: string | null;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
};

export type ProjectConfiguration = {
  id: string;
  company_id: string;
  project_id: string;
  configuration_name: string;
  carpet_area: number | null;
  saleable_area: number | null;
  starting_price: number | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
};

export type ProjectInventory = {
  id: string;
  company_id: string;
  project_id: string;
  configuration_id: string;
  available_units: number;
  min_price: number | null;
  max_price: number | null;
  inventory_status: InventoryStatus;
  created_at: string;
  updated_at: string;
};

export type CreateProjectInput = {
  project_name: string;
  developer_name?: string | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  project_type?: string | null;
  launch_date?: string | null;
  possession_date?: string | null;
  description?: string | null;
  status?: ProjectStatus;
};

export type UpdateProjectInput = Partial<CreateProjectInput>;

export type CreateProjectConfigurationInput = {
  project_id: string;
  configuration_name: string;
  carpet_area?: number | null;
  saleable_area?: number | null;
  starting_price?: number | null;
  status?: ProjectStatus;
};

export type UpdateProjectConfigurationInput = Partial<
  Omit<CreateProjectConfigurationInput, "project_id">
>;

export type CreateProjectInventoryInput = {
  project_id: string;
  configuration_id: string;
  available_units?: number;
  min_price?: number | null;
  max_price?: number | null;
  inventory_status?: InventoryStatus;
};

export type UpdateProjectInventoryInput = Partial<
  Omit<CreateProjectInventoryInput, "project_id" | "configuration_id">
>;