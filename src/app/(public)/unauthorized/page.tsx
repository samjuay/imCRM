"use client";

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
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace(ROUTES.login);
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