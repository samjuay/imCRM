import Link from "next/link";
import { APP_NAME } from "@/utils/constants";

export function PublicHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-center px-4 md:h-16">
        <Link href="/login" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">{APP_NAME}</span>
          <span className="rounded bg-gold px-1.5 py-0.5 text-[10px] font-semibold text-gold-foreground">
            CRM
          </span>
        </Link>
      </div>
    </header>
  );
}