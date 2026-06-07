import { Badge } from "@/components/ui/badge";

export default function PermissionsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold text-primary">Permissions</h1>
      <p className="text-sm text-muted-foreground">
        Role-based access control — loaded on login.
      </p>
      <Badge variant="outline">Placeholder — Sprint 1C</Badge>
    </div>
  );
}