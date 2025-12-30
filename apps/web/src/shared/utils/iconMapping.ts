import {
  type LucideIcon,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  FileText,
  Users,
  Settings,
  FolderKanban,
  Calculator,
  Package,
  ShoppingCart,
  Zap,
  FileStack,
  UsersRound,
  FileSignature,
  ClipboardList,
  Sparkles,
  SlidersHorizontal,
  Boxes,
  Menu,
  HelpCircle,
} from "lucide-react";

/**
 * Icon mapping for server-driven menu
 * Maps icon name strings to Lucide React icon components
 */
export const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  MessageSquare,
  Receipt,
  FileText,
  Users,
  Settings,
  FolderKanban,
  Calculator,
  Package,
  ShoppingCart,
  Zap,
  FileStack,
  UsersRound,
  FileSignature,
  ClipboardList,
  Sparkles,
  SlidersHorizontal,
  Boxes,
  Menu,
  HelpCircle,
};

/**
 * Get icon component by name
 * Returns HelpCircle as fallback if icon not found
 */
export function getIconByName(iconName: string): LucideIcon {
  return iconMap[iconName] || HelpCircle;
}
