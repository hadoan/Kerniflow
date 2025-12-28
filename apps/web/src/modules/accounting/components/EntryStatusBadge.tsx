import type { FC } from "react";
import { Badge } from "@/components/ui/badge";
import type { EntryStatus } from "@kerniflow/contracts";

interface EntryStatusBadgeProps {
  status: EntryStatus;
}

const statusConfig: Record<EntryStatus, { label: string; className: string }> = {
  Draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  },
  Posted: {
    label: "Posted",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  Reversed: {
    label: "Reversed",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
};

/**
 * Badge showing journal entry status with appropriate color coding
 */
export const EntryStatusBadge: FC<EntryStatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
};
