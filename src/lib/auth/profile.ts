import { DISABLED_STATUS } from "@/lib/auth/constants";
import type { UserProfile } from "@/types/auth";

export function isUserDisabled(profile: UserProfile): boolean {
  return profile.status.toLowerCase() === DISABLED_STATUS;
}