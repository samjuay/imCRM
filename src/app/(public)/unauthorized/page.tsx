"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { AUTH_ERROR_MESSAGES } from "@/lib/auth/constants";
import { ROUTES } from "@/utils/constants";

export default function UnauthorizedPage() {
  const router = useRouter();
  const { signOut, isLoading, profile } = useAuth();

  // If profile loads successfully (e.g. race in signIn path where fetch saw no session
  // so returned null -> unauthorized, but later refresh/init populates it), auto
  // redirect to home instead of showing "not configured" message forever.
  useEffect(() => {
    if (!isLoading && profile) {
      router.replace(ROUTES.home);
    }
  }, [isLoading, profile, router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace(ROUTES.login);
    } catch {
      // still try navigate to allow logout even if signOut had issue (e.g. session close)
      router.replace(ROUTES.login);
    }
  };

  return (
    <Card className="border-border/60 shadow-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-primary">Access Denied</CardTitle>
        <CardDescription>{AUTH_ERROR_MESSAGES.missing_profile}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => void handleSignOut()}
        >
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}