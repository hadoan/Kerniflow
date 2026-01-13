import type { FC } from "react";
import type { ActivityType, TimelineItem } from "@corely/contracts";
import { ActivityTypeIcon } from "./ActivityTypeIcon";
import { ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { MessageCircle } from "lucide-react";

interface TimelineViewProps {
  items: TimelineItem[];
}

export const TimelineView: FC<TimelineViewProps> = ({ items }) => {
  if (items.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No timeline items yet</div>;
  }

  const grouped = items.reduce<Record<string, TimelineItem[]>>((acc, item) => {
    const dateKey = format(new Date(item.timestamp), "PPP");
    acc[dateKey] = acc[dateKey] ? [...acc[dateKey], item] : [item];
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date} className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">{date}</p>
          <div className="space-y-3">
            {grouped[date].map((item) => {
              const isStageChange = item.type === "STAGE_TRANSITION";
              const isActivity = item.type === "ACTIVITY";
              const activityType =
                isActivity && item.metadata && "activityType" in item.metadata
                  ? (item.metadata.activityType as ActivityType | undefined)
                  : undefined;
              return (
                <div key={item.id} className="flex gap-4 pb-3 border-b last:border-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {isActivity && activityType ? (
                      <ActivityTypeIcon type={activityType} className="w-4 h-4" />
                    ) : isStageChange ? (
                      <ArrowRight className="w-4 h-4" />
                    ) : item.type === "MESSAGE" ? (
                      <MessageCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-xs">•</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-medium text-sm">
                          {item.type === "MESSAGE" && item.channelKey
                            ? `${item.channelKey} message`
                            : item.subject}
                        </h4>
                        {item.body && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {item.body}
                          </p>
                        )}
                        {isActivity && item.metadata?.dueAt && (
                          <p className="text-xs text-muted-foreground">
                            Due {format(new Date(item.metadata.dueAt as string), "PPp")}
                          </p>
                        )}
                        {isStageChange && item.metadata?.toStageId && (
                          <p className="text-xs text-muted-foreground">
                            Stage: {String(item.metadata.toStageId)}
                          </p>
                        )}
                      </div>
                      <time className="text-xs text-muted-foreground">
                        {format(new Date(item.timestamp), "p")}
                      </time>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
