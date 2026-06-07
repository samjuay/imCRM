"use client";

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { useUser } from "@/hooks/use-user";
import { ROUTES } from "@/utils/constants";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const { signOut } = useAuth();
  const user = useUser();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    router.replace(ROUTES.login);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Profile</h1>
      <Card className="max-w-md">
        <CardHeader className="flex-row items-center gap-4">
          <Avatar className="size-12">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{user.full_name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="gold">{user.role.replace("_", " ")}</Badge>
            <Badge variant="outline">{user.status}</Badge>
          </div>
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
    </div>
  );
}