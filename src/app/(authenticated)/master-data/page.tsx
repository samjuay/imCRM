import { Badge } from "@/components/ui/badge";

export default function MasterDataPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold text-primary">Master Data</h1>
      <p className="text-sm text-muted-foreground">
        Lead sources, statuses, and follow-up types — loaded on login.
      </p>
      <Badge variant="outline">Placeholder — Sprint 1C</Badge>
    </div>
  );
}