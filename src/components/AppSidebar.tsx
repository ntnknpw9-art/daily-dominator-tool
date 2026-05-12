import { 
  LayoutDashboard, 
  CheckSquare, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  Timer, 
  Apple, 
  Camera 
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { id: 'dashboard', label: 'ראשי', icon: LayoutDashboard },
  { id: 'action', label: 'פעולות', icon: CheckSquare },
  { id: 'growth', label: 'צמיחה', icon: TrendingUp },
  { id: 'analytics', label: 'נתונים', icon: BarChart3 },
];

const extraItems = [
  { id: 'focus', label: 'פוקוס', icon: Timer },
  { id: 'nutrition', label: 'תזונה', icon: Apple },
  { id: 'photos', label: 'תמונות', icon: Camera },
  { id: 'settings', label: 'הגדרות', icon: Settings },
];

export function AppSidebar({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>תפריט ראשי</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    isActive={activeTab === item.id}
                    onClick={() => setActiveTab(item.id)}
                    className="flex items-center gap-2 hover:bg-muted/50 cursor-pointer"
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel>כלים נוספים</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {extraItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    isActive={activeTab === item.id}
                    onClick={() => setActiveTab(item.id)}
                    className="flex items-center gap-2 hover:bg-muted/50 cursor-pointer"
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}