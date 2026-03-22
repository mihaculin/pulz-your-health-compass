import { LayoutDashboard, BookOpen, TrendingUp, Stethoscope, Settings, SlidersHorizontal } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Journal", url: "/journal", icon: BookOpen },
  { title: "Progress", url: "/progress", icon: TrendingUp },
  { title: "Therapist", url: "/therapist", icon: Stethoscope },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "My PULZ", url: "/personalise", icon: SlidersHorizontal },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="p-4 pb-2">
        {!collapsed ? (
          <h1 className="text-2xl font-heading font-bold tracking-tight text-primary">
            PULZ
          </h1>
        ) : (
          <h1 className="text-lg font-heading font-bold text-primary text-center">P</h1>
        )}
        {!collapsed && (
          <p className="text-[11px] text-muted-foreground mt-0.5 tracking-wide uppercase">
            Behavioral Health
          </p>
        )}
      </div>

      <SidebarContent className="mt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = location.pathname === item.url || (item.url === "/dashboard" && location.pathname === "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        end
                        className="gap-3 rounded-lg transition-all duration-200"
                        activeClassName="font-medium"
                        style={active ? {
                          backgroundColor: "hsl(172 55% 94%)",
                          borderLeft: "3px solid hsl(178 58% 53%)",
                          color: "hsl(168 47% 33%)",
                        } : undefined}
                      >
                        <item.icon size={19} strokeWidth={active ? 2.2 : 1.8} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-heading font-semibold text-sm shrink-0">
            AM
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">Andrada M.</p>
              <p className="text-xs text-muted-foreground truncate">6 weeks in</p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
