"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useStore } from "@/store/useStore";
import { TopNav } from "@/components/TopNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, checkAuth, isInitialized } = useAuthStore();
  const syncFromServer = useStore((state) => state.syncFromServer);
  const [isChecking, setIsChecking] = useState(true);

  // Check auth and sync data on mount
  const initializeApp = useCallback(async () => {
    setIsChecking(true);
    await checkAuth();
    setIsChecking(false);
  }, [checkAuth]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Sync data from server when authenticated
  useEffect(() => {
    if (isAuthenticated && isInitialized) {
      syncFromServer();
    }
  }, [isAuthenticated, isInitialized, syncFromServer]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isChecking && isInitialized && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isInitialized, isChecking, router]);

  // Show loading while checking auth
  if (isChecking || !isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#432874] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show loading if not authenticated (will redirect)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#432874] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <TopNav />

      {/* Main Content - pb-20 on mobile for bottom nav */}
      <main className="pt-14 pb-20 md:pb-0 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
