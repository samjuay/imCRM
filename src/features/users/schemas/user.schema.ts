import { z } from "zod";

export const userFormSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  mobile: z
    .string()
    .min(10, "Phone must be at least 10 digits")
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone number format"),
  role: z.enum(["team_leader", "sales_executive"], {
    message: "Role is required",
  }),
  team_id: z.string().optional().or(z.literal("")),
  new_team_name: z.string().optional(),
  status: z.enum(["active", "inactive"], {
    message: "Status is required",
  }),
});

export type UserFormValues = z.infer<typeof userFormSchema>;