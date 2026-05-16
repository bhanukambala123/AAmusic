"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library } from 'lucide-react';
import styles from './BottomNav.module.css';

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.bottomNav}>
      <Link href="/" className={`${styles.navItem} ${pathname === '/' ? styles.active : ''}`}>
        <Home size={24} />
        <span>Home</span>
      </Link>
      <Link href="/search" className={`${styles.navItem} ${pathname === '/search' ? styles.active : ''}`}>
        <Search size={24} />
        <span>Search</span>
      </Link>
      <Link href="/library" className={`${styles.navItem} ${pathname === '/library' ? styles.active : ''}`}>
        <Library size={24} />
        <span>Library</span>
      </Link>
    </nav>
  );
}
