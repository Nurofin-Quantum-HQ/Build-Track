import {
  LayoutDashboard,
  PlusCircle,
  Mic,
  ClipboardList,
  Building2,
  Package,
  BarChart3,
  Settings,
  Shield,
  CheckSquare,
  KeyRound,
  Bot,
  Bell,
  ScrollText,
  CreditCard,
  ListTodo
} from 'lucide-react';

export const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Add Entry", path: "/add-entry", icon: PlusCircle },
  { label: "Voice", path: "/voice", icon: Mic },
  { label: "Log", path: "/transaction", icon: ClipboardList },
  { label: "Projects", path: "/projects", icon: Building2 },
  
  { label: "Assign Task", path: "/assign-task", icon: ListTodo },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Reports", path: "/reports", icon: BarChart3 },
  { label: "Subscription", path: "/subscription", icon: CreditCard },
  { label: "Settings", path: "/settings", icon: Settings },
];

export const adminNavItems = [
  { label: "Admin", path: "/admin", icon: Shield },
  { label: "Approvals", path: "/approvals", icon: CheckSquare },
  { label: "Assign Roles", path: "/assign-role", icon: KeyRound },
  { label: "AI Chat", path: "/ai-chat", icon: Bot },
  { label: "Audit Logs", path: "/audit-logs", icon: ScrollText },
];
