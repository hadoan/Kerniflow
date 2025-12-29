import type { FC } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { DealDto } from "@kerniflow/contracts";
import { DealStatusBadge } from "./DealStatusBadge";

interface DealCardProps {
  deal: DealDto;
  onClick?: () => void;
}

export const DealCard: FC<DealCardProps> = ({ deal, onClick }) => {
  const amount =
    deal.amountCents !== null
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: deal.currency,
        }).format(deal.amountCents / 100)
      : "No amount";

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{deal.title}</CardTitle>
          <DealStatusBadge status={deal.status} />
        </div>
        <CardDescription>
          {amount} • Stage: {deal.stageId}
        </CardDescription>
      </CardHeader>
      {deal.notes && (
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">{deal.notes}</p>
        </CardContent>
      )}
    </Card>
  );
};
