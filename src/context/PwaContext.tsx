"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";

interface PwaContextType {
  updateAvailable: boolean;
  checking: boolean;
  dismissedUpdate: boolean;
  setDismissedUpdate: (dismissed: boolean) => void;
  checkForUpdates: () => Promise<boolean>;
  updateApp: () => void;
}

const PwaContext = createContext<PwaContextType | undefined>(undefined);

export const PwaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checking, setChecking] = useState(false);
  const [dismissedUpdate, setDismissedUpdate] = useState(false);
  
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const handleControllerChange = () => {
      console.log("[PWA Context] Controller changed, reloading page...");
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        console.log("[PWA Context] SW registered successfully:", reg);
        registrationRef.current = reg;

        // Check if there is already a waiting worker
        if (reg.waiting) {
          console.log("[PWA Context] A waiting Service Worker was found immediately.");
          waitingWorkerRef.current = reg.waiting;
          setUpdateAvailable(true);
        }

        // Listen for new service worker updates
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          console.log("[PWA Context] New Service Worker installing...");
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              console.log("[PWA Context] New Service Worker installed and waiting.");
              if (navigator.serviceWorker.controller) {
                // There is an active controller, meaning this is an update and not the first install
                waitingWorkerRef.current = newWorker;
                setUpdateAvailable(true);
                setDismissedUpdate(false); // Reset dismissal on brand new update found
              }
            }
          });
        });
      } catch (err) {
        console.error("[PWA Context] SW registration failed:", err);
      }
    };

    // Load SW after page load
    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
      return () => {
        window.removeEventListener("load", registerSW);
        navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      };
    }

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  const checkForUpdates = async (): Promise<boolean> => {
    if (!registrationRef.current) {
      console.warn("[PWA Context] SW Registration not available to check updates.");
      return false;
    }
    
    setChecking(true);
    try {
      console.log("[PWA Context] Checking for updates on server...");
      // Trigger update check against the server
      const reg = await registrationRef.current.update();
      
      if (reg.waiting) {
        console.log("[PWA Context] Found a waiting Service Worker after manual check.");
        waitingWorkerRef.current = reg.waiting;
        setUpdateAvailable(true);
        setDismissedUpdate(false);
        setChecking(false);
        return true;
      }
      
      console.log("[PWA Context] No update waiting at this time.");
      setChecking(false);
      return false;
    } catch (error) {
      console.error("[PWA Context] Error while checking for updates:", error);
      setChecking(false);
      return false;
    }
  };

  const updateApp = () => {
    const worker = waitingWorkerRef.current || (registrationRef.current && registrationRef.current.waiting);
    if (worker) {
      console.log("[PWA Context] Sending SKIP_WAITING to waiting worker.");
      worker.postMessage({ type: "SKIP_WAITING" });
    } else {
      console.warn("[PWA Context] No waiting worker found to post message to.");
      // Fallback reload just in case
      window.location.reload();
    }
  };

  return (
    <PwaContext.Provider
      value={{
        updateAvailable,
        checking,
        dismissedUpdate,
        setDismissedUpdate,
        checkForUpdates,
        updateApp,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
};

export const usePwa = () => {
  const context = useContext(PwaContext);
  if (context === undefined) {
    throw new Error("usePwa must be used within a PwaProvider");
  }
  return context;
};
