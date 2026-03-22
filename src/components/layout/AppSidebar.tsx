import { LayoutDashboard, BookOpen, TrendingUp, Settings, SlidersHorizontal, LogOut, Sparkles } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/hooks/useSubscription";
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

const navConfig = [
  { url: "/dashboard", icon: LayoutDashboard, key: "nav.dashboard" },
  { url: "/journal", icon: BookOpen, key: "nav.journal" },
  { url: "/progress", icon: TrendingUp, key: "nav.progress" },
  { url: "/settings", icon: Settings, key: "nav.settings" },
  { url: "/personalise", icon: SlidersHorizontal, key: "nav.myPulz" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { fullName, initials, joinedWeeksAgo } = useApp();
  const { t } = useLanguage();
  const { isPremium } = useSubscription();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("pulz_profile");
    navigate("/");
  };

  const weeksLabel = joinedWeeksAgo === 0
    ? t("nav.justJoined")
    : `${joinedWeeksAgo} ${joinedWeeksAgo === 1 ? t("nav.weeksIn") : t("nav.weeksInPlural")} ${t("nav.in")}`;

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
            {t("nav.behavioralHealth")}
          </p>
        )}
      </div>

      <SidebarContent className="mt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navConfig.map((item) => {
                const title = t(item.key);
                const active = location.pathname === item.url || (item.url === "/dashboard" && location.pathname === "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={title}
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
                        {!collapsed && <span>{title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div style={{ borderTop: "1px solid #E8EAED" }}>
        {!collapsed && !isPremium && (
          <button
            onClick={() => navigate("/pricing")}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 transition-all hover:opacity-90 active:scale-[0.97]"
            style={{ backgroundColor: "#b3ecec", color: "#2D7D6F" }}
          >
            <Sparkles size={14} />
            <span className="text-xs font-semibold">Upgrade to Premium</span>
          </button>
        )}
        <button
          onClick={handleSignOut}
          className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[#F4EEF7] ${collapsed ? "justify-center" : ""}`}
          style={{ color: "#7B5E8A", background: "transparent" }}
        >
          <LogOut size={16} />
          {!collapsed && <span className="text-sm font-medium">Sign out</span>}
        </button>
      </div>

      <SidebarFooter className="p-3">
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-heading font-semibold text-sm shrink-0">
            {initials || "?"}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{fullName || "—"}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isPremium ? (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}>
                    Premium ✓
                  </span>
                ) : (
                  <>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
                      Free
                    </span>
                    <button onClick={() => navigate("/pricing")} className="text-[10px] font-semibold" style={{ color: "#2D7D6F" }}>
                      Upgrade →
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
