"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, Disc, User, LogIn } from 'lucide-react';
import styles from './BottomNav.module.css';
import { useAuth } from '@/context/AuthContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <nav className={styles.bottomNav}>
      <Link href="/" className={`${styles.navItem} ${pathname === '/' ? styles.active : ''}`}>
        <Home size={24} />
        <span>Home</span>
      </Link>
      <Link href="/albums" className={`${styles.navItem} ${pathname === '/albums' ? styles.active : ''}`}>
        <Disc size={24} />
        <span>Albums</span>
      </Link>
      <Link href="/search" className={`${styles.navItem} ${pathname === '/search' ? styles.active : ''}`}>
        <Search size={24} />
        <span>Search</span>
      </Link>
      <Link href="/library" className={`${styles.navItem} ${pathname === '/library' ? styles.active : ''}`}>
        <Library size={24} />
        <span>Library</span>
      </Link>
      {user ? (
        <Link href="/profile" className={`${styles.navItem} ${pathname === '/profile' ? styles.active : ''}`}>
          <User size={24} />
          <span>Profile</span>
        </Link>
      ) : (
        <Link href="/login" className={`${styles.navItem} ${pathname === '/login' ? styles.active : ''}`}>
          <LogIn size={24} />
          <span>Log In</span>
        </Link>
      )}
    </nav>
  );
}
