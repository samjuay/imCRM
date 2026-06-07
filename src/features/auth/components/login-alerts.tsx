"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { AUTH_ERROR_MESSAGES } from "@/lib/auth/constants";

export function LoginAlerts() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");

    if (error === "disabled") {
      toast.error(AUTH_ERROR_MESSAGES.disabled);
    }
  }, [searchParams]);

  return null;
}