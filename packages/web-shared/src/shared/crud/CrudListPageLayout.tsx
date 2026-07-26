import React from "react";
import { cn } from "@corely/web-shared/shared/lib/utils";

type CrudListPageLayoutProps = {
  title: string;
  subtitle?: string;
  primaryAction?: React.ReactNode;
  toolbar?: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export const CrudListPageLayout: React.FC<CrudListPageLayoutProps> = ({
  title,
  subtitle,
  primaryAction,
  toolbar,
  filters,
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        "min-w-0 space-y-5 px-4 py-5 sm:px-5 sm:py-6 lg:space-y-6 lg:p-8 animate-fade-in",
        className
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-h1 text-foreground">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground mt-1">{subtitle}</p> : null}
        </div>
        {primaryAction ? (
          <div className="flex w-full items-center gap-2 lg:w-auto">{primaryAction}</div>
        ) : null}
      </div>

      {toolbar ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {toolbar}
        </div>
      ) : null}
      {filters ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/50 p-3 sm:flex-row sm:flex-wrap sm:items-center">
          {filters}
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-card shadow-sm">{children}</div>
    </div>
  );
};
