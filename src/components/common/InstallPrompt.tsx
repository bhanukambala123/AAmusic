"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Download } from "lucide-react";
import styles from "./InstallPrompt.module.css";

const InstallPrompt: React.FC = () => {
  const [isStandalone, setIsStandalone] = useState(true);
  const [dismissed, setDismissed] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect if already running in standalone/installed mode
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches 
        || (navigator as any).standalone 
        || document.referrer.includes('android-app://');
      setIsStandalone(!!isStandaloneMode);
    };

    // Check if dismissed in this browser session
    const checkDismissal = () => {
      const isDismissed = sessionStorage.getItem("aamusic_install_dismissed") === "true";
      setDismissed(isDismissed);
    };

    // Detect iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    checkStandalone();
    checkDismissal();
    checkIOS();

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem("aamusic_install_dismissed", "true");
    } catch (e) {
      console.error("[InstallPrompt] Failed to set session storage:", e);
    }
    setDismissed(true);
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      // For iOS, the instructions are in the description. We just dismiss upon acknowledgement.
      handleDismiss();
      return;
    }

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === "accepted") {
          console.log("[InstallPrompt] User accepted the PWA install prompt");
          handleDismiss();
        }
      } catch (err) {
        console.error("[InstallPrompt] Error triggering native PWA prompt:", err);
      }
    } else {
      // Fallback instruction trigger for other browsers without native support
      alert("To install AAmusic, click your browser's menu (three dots icon) and choose 'Install App' or 'Add to Home Screen'.");
      handleDismiss();
    }
  };

  // If already installed, dismissed, or not on mobile/compatible context where we show prompts
  if (isStandalone || dismissed) {
    return null;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.iconContainer}>
          <Download size={24} />
        </div>
        <div className={styles.textContainer}>
          <h3 className={styles.title}>
            Download our App <span className={styles.badge}>Premium</span>
          </h3>
          <p className={styles.desc}>
            {isIOS 
              ? "Install AAmusic on your iPhone: tap Safari's Share button (square icon with up arrow) then choose 'Add to Home Screen'." 
              : "Install our lightweight standalone app for a premium, high-speed, fullscreen music experience!"}
          </p>
        </div>
      </div>
      <div className={styles.btnGroup}>
        <button onClick={handleDismiss} className={styles.downloadLaterBtn}>
          Download Later
        </button>
        <button onClick={handleInstallClick} className={styles.downloadNowBtn}>
          <Sparkles size={16} />
          {isIOS ? "Got It" : "Download Now"}
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
