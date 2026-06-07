import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="gold" className="mb-2">
          Sprint 1A
        </Badge>
        <h1 className="text-2xl font-bold text-primary md:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Foundation ready — feature modules arrive in Sprint 1B
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["Leads", "Projects", "Activities"].map((title) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>Coming in Sprint 1B</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}