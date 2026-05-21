"use client";

import React from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { usePwa } from "@/context/PwaContext";
import styles from "./UpdatePrompt.module.css";

const UpdatePrompt: React.FC = () => {
  const { updateAvailable, dismissedUpdate, setDismissedUpdate, updateApp } = usePwa();

  if (!updateAvailable || dismissedUpdate) {
    return null;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.iconContainer}>
          <Sparkles size={24} />
        </div>
        <div className={styles.textContainer}>
          <h3 className={styles.title}>
            New Version Ready! <span className={styles.badge}>New</span>
          </h3>
          <p className={styles.desc}>
            An update is available for AAmusic with performance enhancements and exciting new improvements.
          </p>
        </div>
      </div>
      <div className={styles.btnGroup}>
        <button onClick={() => setDismissedUpdate(true)} className={styles.updateLaterBtn}>
          Update Later
        </button>
        <button onClick={updateApp} className={styles.updateNowBtn}>
          <RefreshCw size={16} />
          Update Now
        </button>
      </div>
    </div>
  );
};

export default UpdatePrompt;
