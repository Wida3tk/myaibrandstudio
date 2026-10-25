"use client";

import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";

export const Tabs = RadixTabs.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-md)] bg-accent-soft p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium text-text-muted transition-colors data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-[var(--shadow-sm)]",
        className,
      )}
      style={{ transitionDuration: "var(--duration-fast)" }}
      {...props}
    />
  );
}

export const TabsContent = RadixTabs.Content;
