"use client";

import React, { useEffect, useState } from 'react';
import { Music } from 'lucide-react';
import styles from './SplashScreen.module.css';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Show splash for 3 seconds, then start fade out
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      // Wait for fade out animation to finish
      setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 800); // match CSS fadeOut duration
    }, 3500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className={`${styles.splashContainer} ${isFadingOut ? styles.fadeOut : ''}`}>
      <div className={styles.glow}></div>
      <div className={styles.backgroundIconContainer}>
        <Music size={200} className={styles.backgroundMusicIcon} />
      </div>
      <div className={styles.content}>
        <div className={styles.logoWrapper}>
          <h1 className={styles.logo}>AA<span>music</span></h1>
        </div>
        <div className={styles.line}></div>
        <div className={styles.subText}>Allu Arjun Music</div>
      </div>
    </div>
  );
}
