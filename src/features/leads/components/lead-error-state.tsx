import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type LeadErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function LeadErrorState({ message, onRetry }: LeadErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <AlertCircle className="mb-3 size-10 text-destructive" />
      <h3 className="text-base font-semibold text-primary">
        Something went wrong
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}