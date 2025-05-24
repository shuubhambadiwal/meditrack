import { useState, createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import { NavLink } from "react-router-dom";
import { Users, Database, Home } from "lucide-react";

type SidebarContextType = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function Sidebar({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const { isSidebarOpen, collapsed } = useSidebar();

  return (
    <aside
      className={cn(
        "border-r bg-sidebar transition-all w-[240px] duration-300",
        isSidebarOpen ? (collapsed ? "w-16" : "w-[236px]") : "hidden",
        className
      )}
    >
      {children}
    </aside>
  );
}

export function SidebarProvider({
  children,
  defaultCollapsed = false,
}: {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  return (
    <SidebarContext.Provider
      value={{ collapsed, setCollapsed, isSidebarOpen, toggleSidebar }}
    >
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
  const { collapsed, setCollapsed, toggleSidebar, isSidebarOpen } =
    useSidebar();

  return (
    <button
      className={cn("flex items-center justify-center", className)}
      onClick={() => {
        toggleSidebar();
        setCollapsed(!collapsed);
      }}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {isSidebarOpen ? "✖" : "☰"}
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