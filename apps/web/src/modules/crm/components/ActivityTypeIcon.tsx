import type { FC } from "react";
import { FileText, CheckSquare, Phone, Calendar, Mail } from "lucide-react";
import type { ActivityType } from "@kerniflow/contracts";

interface ActivityTypeIconProps {
  type: ActivityType;
  className?: string;
}

const iconMap: Record<ActivityType, FC<{ className?: string }>> = {
  NOTE: FileText,
  TASK: CheckSquare,
  CALL: Phone,
  MEETING: Calendar,
  EMAIL_DRAFT: Mail,
};

export const ActivityTypeIcon: FC<ActivityTypeIconProps> = ({ type, className }) => {
  const Icon = iconMap[type];
  return <Icon className={className} />;
};
