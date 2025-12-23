import React from "react";
import { cn } from "@/shared/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circular" | "text";
}

export function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  const variants = {
    default: "rounded-lg",
    circular: "rounded-full",
    text: "rounded h-4",
  };

  return <div className={cn("animate-pulse bg-muted", variants[variant], className)} {...props} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-4 px-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-3 animate-in">
      <Skeleton variant="circular" className="h-8 w-8" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-full max-w-md" />
      </div>
    </div>
  );
}
