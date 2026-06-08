"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { userService } from "@/services/user.service";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadForm } from "@/features/leads/components/lead-form";
import type { CompanyUser } from "@/types/lead";

export function LeadCreatePage() {
  const user = useUser();
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.company_id) return;

    void userService.getByCompany(user.company_id).then(({ data }) => {
      if (data) {
        setCompanyUsers(data as CompanyUser[]);
      }
      setIsLoading(false);
    });
  }, [user?.company_id]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/leads">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-primary md:text-2xl">
            New Lead
          </h1>
          <p className="text-sm text-muted-foreground">
            Add a new lead to your pipeline
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 md:p-6">
        <LeadForm mode="create" companyUsers={companyUsers} />
      </div>
    </div>
  );
}