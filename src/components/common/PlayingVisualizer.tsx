"use client";

import React from 'react';
import styles from './PlayingVisualizer.module.css';

interface PlayingVisualizerProps {
  isPlaying: boolean;
  className?: string;
}

export default function PlayingVisualizer({ isPlaying, className = '' }: PlayingVisualizerProps) {
  return (
    <div className={`${styles.equalizer} ${!isPlaying ? styles.paused : ''} ${className}`} aria-hidden="true">
      <div className={styles.equalizerBar}></div>
      <div className={styles.equalizerBar}></div>
      <div className={styles.equalizerBar}></div>
      <div className={styles.equalizerBar}></div>
    </div>
  );
}
