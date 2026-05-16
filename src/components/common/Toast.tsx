"use client";

import React from 'react';
import { useAudio } from '@/context/AudioContext';
import styles from '../layout/MusicPlayer.module.css';

export default function Toast() {
  const { toastMessage, toastAction } = useAudio();

  if (!toastMessage) return null;

  return (
    <div className={styles.toast}>
      <span style={{ flex: 1 }}>{toastMessage}</span>
      {toastAction && (
        <button 
          onClick={toastAction.onClick}
          className={styles.toastActionBtn}
        >
          {toastAction.label}
        </button>
      )}
    </div>
  );
}
