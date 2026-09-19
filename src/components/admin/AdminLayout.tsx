import { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { useTheme } from "../../App";

interface AdminLayoutProps {
  children: ReactNode;
  currentTab: string;
  title: string;
  subtitle?: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
}

export default function AdminLayout({
  children,
  currentTab,
  title,
  subtitle,
  onNavigate,
  onLogout
}: AdminLayoutProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen flex ${isDark ? "bg-[#020617] text-white" : "bg-[#f0fdf4] text-[#064e3b]"}`}>
      <AdminSidebar currentTab={currentTab} onNavigate={onNavigate} onLogout={onLogout} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader title={title} subtitle={subtitle} />
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
