import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/utils/constants";

const MODULES = [
  {
    title: "Leads",
    description: "Manage your sales pipeline",
    href: ROUTES.leads,
    available: true,
  },
  {
    title: "Projects",
    description: "Project inventory and configuration",
    href: ROUTES.projects,
    available: false,
  },
  {
    title: "Activities",
    description: "Team activity timeline",
    href: ROUTES.activities,
    available: false,
  },
] as const;

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="gold" className="mb-2">
          Dashboard
        </Badge>
        <h1 className="text-2xl font-bold text-primary md:text-3xl">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Quick access to your CRM modules
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((module) => (
          <Card key={module.title}>
            <CardHeader>
              <CardTitle className="text-base">{module.title}</CardTitle>
              <CardDescription>{module.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {module.available ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={module.href}>Open {module.title}</Link>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Coming soon</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}