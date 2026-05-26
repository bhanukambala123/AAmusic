"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Settings, User } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import MusicPlayer from "./MusicPlayer";
import styles from "./layout.module.css";
import { useAuth } from "@/context/AuthContext";
import SplashScreen from "../common/SplashScreen";
import GlobalLoader from "../common/GlobalLoader";
import Toast from "../common/Toast";

import UpdatePrompt from "../common/UpdatePrompt";
import InstallPrompt from "../common/InstallPrompt";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isOutdatedWrapper, setIsOutdatedWrapper] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isNative = Capacitor.isNativePlatform();
      const hostname = window.location.hostname;
      if (isNative && hostname === "aamusic.vercel.app") {
        setIsOutdatedWrapper(true);
      }
    }
  }, []);
  const pathname = usePathname();
  const { user, role, avatarUrl, username } = useAuth();

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
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  if (isOutdatedWrapper) {
    return (
      <div className={styles.outdatedOverlay}>
        <div className={styles.outdatedContainer}>
          <div className={styles.outdatedBrand}>
            AA<span>music</span>
          </div>
          <div className={styles.outdatedIcon}>
            <svg viewBox="0 0 24 24" width="64" height="64" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className={styles.warningSvg}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h2 className={styles.outdatedTitle}>App Update Required</h2>
          <p className={styles.outdatedDesc}>
            You are running an outdated dynamic wrapper version of AAmusic. 
            We have upgraded to a secure, fast, and offline-capable **local static architecture**.
          </p>
          <div className={styles.outdatedInfoBox}>
            <strong>What this means:</strong> The current app wrapper is no longer supported and cannot load live updates safely. You must download and install the new local app package (APK) to continue.
          </div>
          <a href="https://aamusic.vercel.app/AAmusic.apk" target="_blank" rel="noopener noreferrer" className={styles.outdatedBtn}>
            Download Latest APK
          </a>
          <span className={styles.outdatedNote}>
            After downloading, open the file to install the update. You do not need to uninstall your current app.
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      {isNavigating && <GlobalLoader />}
      <Toast />
      <UpdatePrompt />
      <InstallPrompt />
      <div className={styles.layout}>
        {!isMobile && <Sidebar />}
        
        {isMobile && (
          <header className={styles.mobileHeader}>
            {user ? (
              <Link href="/profile" className={styles.mobileProfileBtn}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className={styles.mobileProfilePhoto} />
                ) : (
                  <div className={styles.mobileProfileAvatar}>
                    {username ? username.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </Link>
            ) : (
              <Link href="/login" className={styles.mobileLoginBtn}>
                Log In
              </Link>
            )}
            
            <Link href="/" className={styles.mobileLogo}>
              AA<span>music</span>
            </Link>
            {user && role === 'admin' && pathname !== '/admin' ? (
              <Link href="/admin" className={styles.mobileAdminBtn}>
                <Settings size={20} />
              </Link>
            ) : !user ? (
              <Link href="/signup" className={styles.mobileSignupBtn}>
                Sign Up
              </Link>
            ) : (
              <div className={styles.mobilePlaceholder}></div>
            )}
          </header>
        )}
        
        <main className={styles.mainContent}>
          {!isMobile && user && role === 'admin' && pathname !== '/admin' && (
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
