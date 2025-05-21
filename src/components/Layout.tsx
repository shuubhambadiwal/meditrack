
import { Sidebar, SidebarNav, SidebarProvider } from "./Sidebar";
import { Header } from "./Header";
import { Outlet } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export function Layout() {
  const isMobile = useIsMobile();
  
  return (
    <SidebarProvider defaultCollapsed={isMobile}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar className={isMobile ? "hidden" : "w-[240px]"}>
            <SidebarNav />
          </Sidebar>
          <main className="flex-1 overflow-x-hidden p-4 md:p-6 theme-transition">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}