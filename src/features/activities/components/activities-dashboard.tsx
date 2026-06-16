"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ActivityCardId,
  DashboardCount,
  CompanyUser,
} from "@/types";

const CARDS: {
  id: ActivityCardId;
  title: string;
  description: string;
  countKey: keyof DashboardCount;
  variant: "destructive" | "default" | "outline";
}[] = [
  {
    id: "overdue-followups",
    title: "Overdue Followups",
    description: "Immediate action required",
    countKey: "overdue",
    variant: "destructive",
  },
  {
    id: "followups-today",
    title: "Followup Due Today",
    description: "Needs attention today",
    countKey: "due_today",
    variant: "default",
  },
  {
    id: "leads-without-followup",
    title: "Leads Without Next Action",
    description: "Assign next action",
    countKey: "no_action",
    variant: "outline",
  },
  {
    id: "site-visits-today",
    title: "Site Visits Today",
    description: "Scheduled for today",
    countKey: "site_visit_today",
    variant: "default",
  },
  {
    id: "upcoming-followups",
    title: "Upcoming Followups",
    description: "Next 7 days",
    countKey: "upcoming_followup",
    variant: "outline",
  },
  {
    id: "upcoming-site-visits",
    title: "Upcoming Site Visits",
    description: "Next 7 days",
    countKey: "upcoming_site_visit",
    variant: "outline",
  },
];

type ActivitiesDashboardProps = {
  counts: DashboardCount;
  companyUsers: CompanyUser[];
  onCardTap: (cardId: ActivityCardId) => void;
  onRefresh: () => void;
  isLoading: boolean;
};

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse bg-muted rounded" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border bg-card animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function ActivitiesDashboard({
  counts,
  companyUsers,
  onCardTap,
  onRefresh,
  isLoading,
}: ActivitiesDashboardProps) {
  const router = useRouter();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Activities</h1>
          <p className="text-sm text-muted-foreground">
            What do I need to do today?
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => {
          const count = counts[card.countKey];
          const isZero = count === 0;

          return (
            <motion.div
              key={card.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.12 }}
              onClick={() => onCardTap(card.id)}
              className={`
                rounded-xl border border-border bg-card p-4 cursor-pointer
                transition-colors hover:bg-muted/30
                ${isZero ? "opacity-50" : ""}
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-primary">{card.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {card.description}
                  </p>
                </div>
                <Badge variant={card.variant} className="shrink-0 text-lg px-3 py-1">
                  {count}
                </Badge>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}