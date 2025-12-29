import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, Plus } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { crmApi } from "@/lib/crm-api";
import { EmptyState } from "@/shared/components/EmptyState";
import { ActivityCard } from "../components/ActivityCard";

export default function ActivitiesPage() {
  const navigate = useNavigate();

  const { data: activitiesData } = useQuery({
    queryKey: ["activities"],
    queryFn: () => crmApi.listActivities(),
  });

  const activities = activitiesData?.activities || [];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">Activities</h1>
        <Button variant="accent" onClick={() => navigate("/crm/activities/new")}>
          <Plus className="h-4 w-4" />
          New Activity
        </Button>
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={CheckSquare}
              title="No activities yet"
              description="Create tasks, calls, and meetings to track your work"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
}
