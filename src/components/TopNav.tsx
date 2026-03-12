"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  User,
  LogOut,
  LayoutDashboard,
  BarChart3,
  Gift,
} from "lucide-react";
import Image from "next/image";
import { useStore } from "@/store/useStore";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard?tab=rewards", label: "Rewards", icon: Gift },
];

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const stats = useStore((state) => state.stats);
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Check if rewards tab is active
  const isRewardsTab = pathname === "/dashboard" && searchParams.get("tab") === "rewards";

  return (
    <>
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[#432874] flex items-center justify-between px-4 z-50">
        {/* Left - Logo */}
        <Link href="/dashboard" className="flex items-center">
          <span className="text-white font-bold text-xl">EarnIt</span>
        </Link>

        {/* Center - Nav Items (Desktop only) */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.slice(0, 2).map((item) => {
            const isActive = pathname === item.href.split("?")[0] && !item.href.includes("?");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative py-4 text-[14px] font-semibold transition-all",
                  isActive
                    ? "text-white"
                    : "text-purple-200 hover:text-white"
                )}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-t-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right - Gold and User */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Diamond Balance */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white px-2 sm:px-3 py-1.5 rounded-lg">
            <span className="font-bold text-[#432874] text-sm sm:text-base">{stats.balance}</span>
            <Image src="/diamond.svg" alt="diamond" width={16} height={16} className="sm:w-[18px] sm:h-[18px]" />
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-lg bg-purple-500/30 flex items-center justify-center text-purple-200 hover:bg-purple-500/50 hover:text-white transition-colors">
                <User className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-3 py-2">
                <p className="font-medium text-gray-800 truncate text-sm">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around px-2 z-50 md:hidden safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const basePath = item.href.split("?")[0];
          const hasTab = item.href.includes("?tab=");

          // Determine if this nav item is active
          let isActive = false;
          if (hasTab) {
            isActive = isRewardsTab;
          } else {
            isActive = pathname === basePath && !isRewardsTab;
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-lg transition-all",
                isActive
                  ? "text-[#432874]"
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
              <span className={cn(
                "text-[10px] font-medium",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
