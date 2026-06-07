"use client";

import { AuthProvider } from "@/components/providers/auth-provider";
import { MasterDataProvider } from "@/components/providers/master-data-provider";
import { Toaster } from "@/components/ui/toast";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <MasterDataProvider>
      {children}
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: "font-sans",
          },
        }}
      />
      </MasterDataProvider>
    </AuthProvider>
  );
}