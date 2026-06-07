import { ROUTES } from "@/utils/constants";
import type { UserRole } from "@/types/auth";

export function getPostLoginRedirect(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return ROUTES.platform;
    case "company_admin":
    case "team_leader":
    case "sales_executive":
      return ROUTES.home;
    default:
      return ROUTES.home;
  }
}