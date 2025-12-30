import type { FC } from "react";
import { Badge } from "@/shared/ui/badge";
import type { DealStatus } from "@corely/contracts";

interface DealStatusBadgeProps {
  status: DealStatus;
}

const statusColors: Record<DealStatus, string> = {
  OPEN: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  WON: "bg-green-100 text-green-800 hover:bg-green-100",
  LOST: "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

export const DealStatusBadge: FC<DealStatusBadgeProps> = ({ status }) => {
  return (
    <Badge variant="secondary" className={statusColors[status]}>
      {status}
    </Badge>
  );
};
