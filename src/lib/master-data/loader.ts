import { useMasterDataStore } from "@/store/master-data-store";
import { usePermissionStore } from "@/store/permission-store";
import type { UserProfile } from "@/types/auth";

export async function loadMasterDataForUser(profile: UserProfile) {
  console.log('[AUTH] MASTER_DATA_START');
  const { loadByCompany } = useMasterDataStore.getState();
  const { loadByRole } = usePermissionStore.getState();

  await Promise.all([
    loadByCompany(profile.company_id),
    loadByRole(profile.role),
  ]);
  console.log('[AUTH] MASTER_DATA_COMPLETE');
}

export function resetMasterDataStores() {
  useMasterDataStore.getState().reset();
  usePermissionStore.getState().reset();
}