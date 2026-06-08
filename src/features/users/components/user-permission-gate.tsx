"use client";

import Link from "next/link";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/utils/constants";
import type { PermissionAction } from "@/types/permissions";

type UserPermissionGateProps = {
  action: PermissionAction;
  children: React.ReactNode;
};

export function UserPermissionGate({
  action,
  children,
}: UserPermissionGateProps) {
  const { can, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!can("users", action)) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to {action} users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href={ROUTES.home}>Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}