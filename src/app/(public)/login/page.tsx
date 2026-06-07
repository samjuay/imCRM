import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginAlerts } from "@/features/auth/components/login-alerts";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function LoginPage() {
  return (
    <Card className="border-border/60 shadow-md">
      <Suspense fallback={null}>
        <LoginAlerts />
      </Suspense>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-primary">Welcome back</CardTitle>
        <CardDescription>
          Sign in to manage your leads and projects
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}