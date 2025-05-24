import { ThemeToggle } from "./ThemeToggle";
import { SidebarTrigger } from "./Sidebar";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 theme-transition">
      <SidebarTrigger className="flex md:hidden" />
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-primary"
          >
            <path d="M19 9h-5l2 6h-3l-2 6h-2" />
            <path d="M3 4h2a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2h10" />
          </svg>
          <h1 className="text-lg font-semibold md:text-xl">MediTrack</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
