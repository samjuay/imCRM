import { PublicHeader } from "@/components/layout/public-header";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <PublicHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 md:px-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}