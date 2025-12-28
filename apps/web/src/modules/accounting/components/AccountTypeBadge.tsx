import type { FC } from "react";
import { Badge } from "@/components/ui/badge";
import type { AccountType } from "@kerniflow/contracts";

interface AccountTypeBadgeProps {
  type: AccountType;
}

const typeColors: Record<AccountType, string> = {
  Asset: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  Liability: "bg-red-100 text-red-800 hover:bg-red-100",
  Equity: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  Income: "bg-green-100 text-green-800 hover:bg-green-100",
  Expense: "bg-orange-100 text-orange-800 hover:bg-orange-100",
};

/**
 * Badge showing account type with appropriate color coding
 */
export const AccountTypeBadge: FC<AccountTypeBadgeProps> = ({ type }) => {
  return (
    <Badge variant="secondary" className={typeColors[type]}>
      {type}
    </Badge>
  );
};
