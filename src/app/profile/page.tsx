"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut, Settings, Disc, Shield, Music, Heart } from "lucide-react";
import styles from "./profile.module.css";
import { useAuth } from "@/context/AuthContext";
import { useAudio } from "@/context/AudioContext";

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut, username, role } = useAuth();
  const { likedSongs, customPlaylists } = useAudio();

  const handleLogOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>Your Profile</h1>
      </header>

      {user ? (
        <div className={styles.profileCard}>
          <div className={styles.avatarSection}>
            <div className={styles.avatar}>
              <User size={48} />
            </div>
            <div className={styles.info}>
              <h2 className={styles.username}>{username || user.user_metadata?.username || "AA Listener"}</h2>
              <p className={styles.email}>{user.email}</p>
              <div className={styles.badgeRow}>
                <span className={styles.badge}>
                  <Music size={12} />
                  Listener
                </span>
                {role === 'admin' && (
                  <span className={`${styles.badge} ${styles.adminBadge}`}>
                    <Shield size={12} />
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={styles.divider}></div>

          <div className={styles.statsSection}>
            <div className={styles.statBox}>
              <Heart size={20} className={styles.likedIcon} />
              <div className={styles.statNumber}>{likedSongs.length}</div>
              <div className={styles.statLabel}>Liked Songs</div>
            </div>
            <div className={styles.statBox}>
              <Disc size={20} className={styles.playlistIcon} />
              <div className={styles.statNumber}>{customPlaylists.length}</div>
              <div className={styles.statLabel}>Playlists</div>
            </div>
          </div>

          <div className={styles.actions}>
            {role === 'admin' && (
              <Link href="/admin" className={styles.adminBtn}>
                <Settings size={18} />
                <span>Admin Panel</span>
              </Link>
            )}
            
            <button onClick={handleLogOut} className={styles.logoutBtn}>
              <LogOut size={18} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.authPromptCard}>
          <div className={styles.promptIcon}>
            <User size={48} />
          </div>
          <h2 className={styles.promptTitle}>Join the AAmusic Family</h2>
          <p className={styles.promptText}>
            Log in or sign up to personalize your experience, create custom playlists, like your favorite Allu Arjun tracks, and share with friends!
          </p>
          <div className={styles.btnRow}>
            <Link href="/login" className={styles.loginBtn}>
              Log In
            </Link>
            <Link href="/signup" className={styles.signupBtn}>
              Sign Up
            </Link>
          </div>
        </div>
      )}
      
      <div style={{ height: '80px' }}></div>
    </div>
  );
}
