"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { ROUTES } from "@/utils/constants";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading, isAuthenticated, profile } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace(ROUTES.login);
      return;
    }

    if (!profile) {
      router.replace(ROUTES.unauthorized);
    }
  }, [isLoading, isAuthenticated, profile, router]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return null;
  }

  return <>{children}</>;
}