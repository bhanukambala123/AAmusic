"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import MusicPlayer from "./MusicPlayer";
import styles from "./layout.module.css";
import { useAuth } from "@/context/AuthContext";
import SplashScreen from "../common/SplashScreen";
import GlobalLoader from "../common/GlobalLoader";
import Toast from "../common/Toast";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const { user, role } = useAuth();

  useEffect(() => {
    // Skip loader on first mount (splash screen handles it)
    if (showSplash) return;

    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 800);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // Initial check
    handleResize();
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Avoid hydration mismatch by waiting for mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      {isNavigating && <GlobalLoader />}
      <Toast />
      <div className={styles.layout}>
        {!isMobile && <Sidebar />}
        
        <main className={styles.mainContent}>
          {user && role === 'admin' && pathname !== '/admin' && (
            <Link href="/admin" className={styles.fixedAdminLink}>
              <Settings size={20} />
            </Link>
          )}
          {children}
        </main>

        <MusicPlayer isMobile={isMobile} />
        {isMobile && <BottomNav />}
      </div>
    </>
  );
}
