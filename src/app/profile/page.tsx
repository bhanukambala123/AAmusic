"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut, Settings, Disc, Shield, Music, Heart, Upload } from "lucide-react";
import styles from "./profile.module.css";
import { useAuth } from "@/context/AuthContext";
import { useAudio } from "@/context/AudioContext";

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut, username, role, avatarUrl, updateAvatarUrl } = useAuth();
  const { likedSongs, customPlaylists, showToast } = useAudio();
  const [uploading, setUploading] = useState(false);

  // PWA states and events
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect if already in standalone mode
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
        || (navigator as any).standalone 
        || document.referrer.includes('android-app://');
      setIsStandalone(!!isStandaloneMode);
    };

    // Detect iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    checkStandalone();
    checkIOS();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
      showToast("AAmusic installed successfully! Launch it from your homescreen.");
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [showToast]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User choice: ${outcome}`);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image size should be less than 5MB");
      return;
    }

    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          canvas.width = 150;
          canvas.height = 150;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            const size = Math.min(img.width, img.height);
            const sx = (img.width - size) / 2;
            const sy = (img.height - size) / 2;
            ctx.drawImage(img, sx, sy, size, size, 0, 0, 150, 150);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const success = await updateAvatarUrl(dataUrl);
            if (success) {
              showToast("Profile photo uploaded successfully!");
            } else {
              showToast("Failed to upload profile photo");
            }
          } else {
            showToast("Canvas drawing error");
          }
          setUploading(false);
        };
        img.onerror = () => {
          showToast("Failed to load image file");
          setUploading(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showToast("Error processing image");
      setUploading(false);
    }
  };

  const handleLogOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>Your Profile</h1>
      </header>

      {/* PWA Install Banner */}
      {!isStandalone && (isInstallable || isIOS) && (
        <div className={styles.installBanner}>
          <div className={styles.installIconContainer}>
            <img src="/icon-192.png" alt="AAmusic Logo" className={styles.installAppIcon} />
          </div>
          <div className={styles.installContent}>
            <h3 className={styles.installTitle}>Download AAmusic App</h3>
            <p className={styles.installDesc}>
              {isIOS 
                ? "Install AAmusic on your iPhone: tap Safari's Share button, then choose 'Add to Home Screen'." 
                : "Get our lightweight standalone app for a premium, fullscreen music experience."}
            </p>
            {isInstallable && !isIOS && (
              <button onClick={handleInstallClick} className={styles.installBtn}>
                Install Now
              </button>
            )}
          </div>
        </div>
      )}

      {user ? (
        <div className={styles.profileCard}>
          <div className={styles.avatarSection}>
            <div className={styles.avatar} style={{ overflow: 'hidden', border: '2px solid var(--accent-color-gold)', position: 'relative' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className={styles.avatarInitial}>
                  {username ? username.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
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

          <div className={styles.avatarSelectionContainer}>
            <p className={styles.avatarSelectionTitle}>Choose or Upload an Avatar</p>
            <div className={styles.avatarGrid}>
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              
              <button
                onClick={() => document.getElementById('avatar-upload')?.click()}
                className={styles.avatarUploadOption}
                disabled={uploading}
                title="Upload custom photo"
              >
                {uploading ? (
                  <div className={styles.spinner}></div>
                ) : (
                  <Upload size={20} />
                )}
              </button>

              {[
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
                "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&q=80&w=150",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150"
              ].map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => updateAvatarUrl(url)}
                  className={`${styles.avatarSelectOption} ${avatarUrl === url ? styles.avatarSelectedOption : ''}`}
                  aria-label={`Select Avatar ${idx + 1}`}
                >
                  <img src={url} alt={`Option ${idx + 1}`} className={styles.avatarOptionImg} />
                </button>
              ))}
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
