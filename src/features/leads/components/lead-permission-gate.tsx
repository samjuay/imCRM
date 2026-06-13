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

type LeadPermissionGateProps = {
  action: PermissionAction;
  children: React.ReactNode;
};

export function LeadPermissionGate({
  action,
  children,
}: LeadPermissionGateProps) {
  const { can, isLoading } = usePermissions();

  if (isLoading) {
    console.log('[SKELETON_RENDER] LeadPermissionGate', { source: 'permissions.isLoading', isLoading, action });
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!can("leads", action)) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to {action} leads.
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