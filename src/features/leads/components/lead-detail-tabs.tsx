"use client";

import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "notes", label: "Notes" },
  { id: "followups", label: "Followups" },
  { id: "site-visits", label: "Site Visits" },
] as const;

export type LeadDetailTabId = (typeof TABS)[number]["id"];

type LeadDetailTabsProps = {
  activeTab: LeadDetailTabId;
  onTabChange: (tab: LeadDetailTabId) => void;
};

export function LeadDetailTabs({
  activeTab,
  onTabChange,
}: LeadDetailTabsProps) {
  return (
    <>
      <div className="md:hidden">
        <label htmlFor="lead-tab-select" className="sr-only">
          Select tab
        </label>
        <select
          id="lead-tab-select"
          value={activeTab}
          onChange={(e) => onTabChange(e.target.value as LeadDetailTabId)}
          className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
        >
          {TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden md:block">
        <div className="flex snap-x snap-mandatory gap-1 overflow-x-auto border-b border-border [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "shrink-0 snap-start border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-gold text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}