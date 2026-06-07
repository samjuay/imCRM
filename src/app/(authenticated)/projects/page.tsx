import { Badge } from "@/components/ui/badge";

export default function ProjectsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold text-primary">Projects</h1>
      <p className="text-sm text-muted-foreground">
        Project management — coming in a future sprint.
      </p>
      <Badge variant="outline">Placeholder — Sprint 1C</Badge>
    </div>
  );
}