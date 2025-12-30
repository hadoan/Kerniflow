import type { FC } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/ui/card";
import type { ActivityDto } from "@corely/contracts";
import { ActivityTypeIcon } from "./ActivityTypeIcon";
import { Badge } from "@/shared/ui/badge";

interface ActivityCardProps {
  activity: ActivityDto;
  onClick?: () => void;
}

export const ActivityCard: FC<ActivityCardProps> = ({ activity, onClick }) => {
  const statusColor =
    activity.status === "COMPLETED"
      ? "bg-green-100 text-green-800"
      : activity.status === "CANCELED"
        ? "bg-gray-100 text-gray-800"
        : "bg-blue-100 text-blue-800";

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <ActivityTypeIcon type={activity.type} className="w-5 h-5 mt-1" />
          <div className="flex-1">
            <CardTitle className="text-base">{activity.subject}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className={statusColor}>
                {activity.status}
              </Badge>
              {activity.dueAt && <span>Due: {new Date(activity.dueAt).toLocaleDateString()}</span>}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      {activity.body && (
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3">{activity.body}</p>
        </CardContent>
      )}
    </Card>
  );
};
