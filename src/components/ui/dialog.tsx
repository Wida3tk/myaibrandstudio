"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;

export function DialogContent({
  children,
  className,
  title,
  description,
}: {
  children: ReactNode;
  className?: string;
  title: string;
  description?: string;
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm" />
      <RadixDialog.Content
        className={cn(
          "dialog-content fixed start-1/2 top-1/2 z-50 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-lg)] focus:outline-none",
          "rtl:translate-x-1/2",
          className,
        )}
      >
        <RadixDialog.Title className="text-lg font-semibold text-text">
          {title}
        </RadixDialog.Title>
        {description && (
          <RadixDialog.Description className="mt-1 text-sm text-text-muted">
            {description}
          </RadixDialog.Description>
        )}
        <div className="mt-4">{children}</div>
        <RadixDialog.Close
          aria-label="Close"
          className="absolute end-4 top-4 rounded-full p-1 text-text-muted hover:bg-accent-soft hover:text-text"
        >
          <X size={18} />
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
