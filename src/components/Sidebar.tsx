
import { useState, createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import { NavLink } from "react-router-dom";
import { Users, Database, Home } from "lucide-react";

type SidebarContextType = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function Sidebar({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <aside className={cn("border-r bg-sidebar transition-all duration-300", className)}>
      {children}
    </aside>
  );
}

export function SidebarProvider({ 
  children, 
  defaultCollapsed = false 
}: { 
  children: React.ReactNode; 
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  
  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

export function SidebarTrigger({ className }: { className?: string }) {
  const { collapsed, setCollapsed } = useSidebar();
  
  return (
    <button
      className={cn("flex items-center justify-center p-2", className)}
      onClick={() => setCollapsed(!collapsed)}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {collapsed ? (
          <>
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </>
        ) : (
          <>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </>
        )}
      </svg>
    </button>
  );
}

export function SidebarNav() {
  const { collapsed } = useSidebar();
  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Patients", href: "/patients", icon: Users },
    { name: "SQL Console", href: "/sql", icon: Database },
  ];

  return (
    <nav className="flex flex-col gap-1 p-2">
      {navigation.map((item) => (
        <NavLink
          key={item.name}
          to={item.href}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
              isActive 
                ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-2"
            )
          }
          end
        >
          <item.icon className="h-5 w-5" />
          {!collapsed && <span>{item.name}</span>}
        </NavLink>
      ))}
    </nav>
  );
}