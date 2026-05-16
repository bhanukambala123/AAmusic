"use client";

import React from 'react';
import styles from './GlobalLoader.module.css';

export default function GlobalLoader() {
  return (
    <div className={styles.loaderContainer}>
      <div className={styles.loaderContent}>
        <div className={styles.spinner}></div>
        <div className={styles.logo}>AA</div>
      </div>
    </div>
  );
}
