import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import { crmApi } from "@/lib/crm-api";
import { DealStatusBadge } from "../components/DealStatusBadge";
import { TimelineView } from "../components/TimelineView";

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: deal } = useQuery({
    queryKey: ["deal", id],
    queryFn: () => crmApi.getDeal(id!),
    enabled: !!id,
  });

  const { data: timelineData } = useQuery({
    queryKey: ["timeline", "deal", id],
    queryFn: () => crmApi.getTimeline("deal", id!),
    enabled: !!id,
  });

  if (!deal) {
    return <div className="p-6">Loading...</div>;
  }

  const amount =
    deal.amountCents !== null
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: deal.currency,
        }).format(deal.amountCents / 100)
      : "No amount";

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-foreground">{deal.title}</h1>
          <p className="text-muted-foreground mt-1">
            {amount} • Stage: {deal.stageId}
          </p>
        </div>
        <DealStatusBadge status={deal.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {deal.notes && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Notes</h3>
                  <p className="text-sm text-muted-foreground">{deal.notes}</p>
                </div>
              )}
              {deal.probability !== null && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Probability</h3>
                  <p className="text-sm text-muted-foreground">{deal.probability}%</p>
                </div>
              )}
              {deal.expectedCloseDate && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Expected Close Date</h3>
                  <p className="text-sm text-muted-foreground">{deal.expectedCloseDate}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineView items={timelineData?.items || []} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Actions coming soon...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
