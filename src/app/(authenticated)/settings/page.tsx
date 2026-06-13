"use client";

import Link from "next/link";
import { Plus, ChevronRight, FileText, Users, Clock, Settings } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { usePermissions } from "@/hooks/use-permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsGuard } from "@/components/auth/settings-guard";

function SettingsContent() {
  const user = useUser();
  const { can } = usePermissions();

  const isAdmin = user?.role === "super_admin" || user?.role === "company_admin";
  const canManageSources = can("lead_sources", "create") || can("lead_sources", "edit");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your company settings and preferences
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Lead Sources Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Lead Sources</CardTitle>
            <Link href="/settings/lead-sources" className="text-sm font-medium text-primary hover:underline">
              Manage
              <ChevronRight className="ml-1 h-4 w-4 inline" />
            </Link>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Manage lead sources for your pipeline. Create, edit, and archive sources.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Lead Sources
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Lead Statuses Card - Coming Soon */}
        <Card className="opacity-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Lead Statuses</CardTitle>
            <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">Coming Soon</span>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Manage lead statuses and pipeline stages.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Lead Statuses
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Followup Types Card - Coming Soon */}
        <Card className="opacity-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Followup Types</CardTitle>
            <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">Coming Soon</span>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Manage follow-up types and categories.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Followup Types
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <SettingsGuard>
      <SettingsContent />
    </SettingsGuard>
  );
}