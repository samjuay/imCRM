"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { ROUTES } from "@/utils/constants";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading, isAuthenticated, profile } = useAuth();

  console.log('[AUTH] AuthGuard render:', { isLoading, isAuthenticated, profile: !!profile });

  useEffect(() => {
    if (isLoading) {
      console.log('[AUTH] AuthGuard useEffect: isLoading=true, waiting for bootstrap...');
      return;
    }

    console.log('[AUTH] AuthGuard useEffect: bootstrap complete, checking auth state', { isAuthenticated, profile: !!profile });

    if (!isAuthenticated) {
      console.log('[AUTH] AuthGuard: not authenticated after bootstrap, redirecting to login');
      router.replace(ROUTES.login);
      return;
    }

    if (!profile) {
      console.log('[AUTH] AuthGuard: authenticated but no profile, redirecting to unauthorized');
      router.replace(ROUTES.unauthorized);
    }
  }, [isLoading, isAuthenticated, profile, router]);

  if (isLoading) {
    console.log('[SKELETON_RENDER] AuthGuard', { source: 'auth.isLoading', isLoading, isAuthenticated, profile: !!profile });
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    console.log('[AUTH] AuthGuard: auth check failed, returning null (redirect pending)');
    return null;
  }

  console.log('[AUTH] AuthGuard: rendering children');
  return <>{children}</>;
}