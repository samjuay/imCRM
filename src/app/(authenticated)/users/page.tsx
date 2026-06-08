"use client";

import { UserPermissionGate } from "@/features/users/components/user-permission-gate";
import { UsersListContainer } from "@/features/users/components/users-list";

export default function UsersPage() {
  return (
    <UserPermissionGate action="view">
      <UsersListContainer />
    </UserPermissionGate>
  );
}