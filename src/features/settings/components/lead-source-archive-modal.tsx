"use client";

import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/modal";

type LeadSourceArchiveModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  source: { id: string; source_name: string } | null;
  usageCount: number;
  isLoading: boolean;
};

export function LeadSourceArchiveModal({
  open,
  onOpenChange,
  onConfirm,
  source,
  usageCount,
  isLoading,
}: LeadSourceArchiveModalProps) {
  const handleConfirm = async () => {
    if (!source) return;
    await onConfirm();
    onOpenChange(false);
  };

  if (!open || !source) return null;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <AlertCircle className="h-5 w-5 text-destructive mr-2" />
          <ModalTitle>Archive Source</ModalTitle>
          <ModalDescription>
            Are you sure you want to archive <strong>&quot;{source.source_name}&quot;</strong>?
          </ModalDescription>
        </ModalHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="font-medium text-destructive">
              <Trash2 className="h-4 w-4 inline mr-1" /> This action cannot be undone
            </p>
            <p className="mt-1">
              This source is currently used by <strong>{usageCount}</strong> lead{usageCount !== 1 ? "s" : ""}.
            </p>
            <p className="mt-1">
              Existing leads will continue to display this source.
            </p>
            <p className="mt-1">
              New leads will <strong>no longer</strong> be able to select it.
            </p>
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Archiving...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Archive Source
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}