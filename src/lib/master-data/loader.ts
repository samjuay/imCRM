import { useMasterDataStore } from "@/store/master-data-store";
import { usePermissionStore } from "@/store/permission-store";
import type { UserProfile } from "@/types/auth";

export async function loadMasterDataForUser(profile: UserProfile) {
  const { loadByCompany } = useMasterDataStore.getState();
  const { loadByRole } = usePermissionStore.getState();

  await Promise.all([
    loadByCompany(profile.company_id),
    loadByRole(profile.role),
  ]);
}

export function resetMasterDataStores() {
  useMasterDataStore.getState().reset();
  usePermissionStore.getState().reset();
}