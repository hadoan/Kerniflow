import type { FC } from "react";
import type { TimelineItem } from "@kerniflow/contracts";
import { ActivityTypeIcon } from "./ActivityTypeIcon";
import { ArrowRight } from "lucide-react";

interface TimelineViewProps {
  items: TimelineItem[];
}

export const TimelineView: FC<TimelineViewProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">No timeline items yet</div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            {item.type === "ACTIVITY" && item.metadata?.activityType ? (
              <ActivityTypeIcon
                type={item.metadata.activityType as any}
                className="w-4 h-4"
              />
            ) : item.type === "STAGE_TRANSITION" ? (
              <ArrowRight className="w-4 h-4" />
            ) : (
              <span className="text-xs">•</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-sm">{item.subject}</h4>
                {item.body && <p className="text-sm text-muted-foreground mt-1">{item.body}</p>}
              </div>
              <time className="text-xs text-muted-foreground">
                {new Date(item.timestamp).toLocaleString()}
              </time>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
