"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Play, Heart } from "lucide-react";
import styles from "./library.module.css";
import { useAudio } from "@/context/AudioContext";

const staticPlaylists = [
  { id: "liked-songs", title: "Liked Songs", count: "Your likes", image: "https://images.unsplash.com/photo-1513829096999-4978602297a7?auto=format&fit=crop&q=80&w=300", isLiked: true, route: "/liked-songs" },
];

export default function Library() {
  const [activeTab, setActiveTab] = useState("playlists");
  const { customPlaylists, likedSongs } = useAudio();

  // Merge static playlists with custom playlists created by user
  const allPlaylists = [
    { 
      id: "liked-songs", 
      title: "Liked Songs", 
      count: `${likedSongs.length} songs`, 
      image: "https://images.unsplash.com/photo-1513829096999-4978602297a7?auto=format&fit=crop&q=80&w=300", 
      isLiked: true, 
      route: "/liked-songs" 
    },
    ...customPlaylists.map(cp => ({
      id: cp.id,
      title: cp.title,
      count: `${cp.songs.length} songs`,
      image: cp.image || "https://images.unsplash.com/photo-1619983081563-430f63602796?auto=format&fit=crop&q=80&w=300",
      isLiked: false,
      route: `/playlist/${cp.id}`
    }))
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'playlists' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('playlists')}
          >
            Playlists
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'albums' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('albums')}
          >
            Albums
          </button>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.grid}>
          {allPlaylists.map((playlist) => {
            const isDefaultImage = playlist.image && (playlist.image.includes('unsplash.com') || playlist.image === '/liked-songs.jpg');
            const showLetter = !playlist.isLiked && isDefaultImage;

            const cardContent = (
              <div key={playlist.id} className={styles.card}>
                <div className={styles.imageWrapper}>
                  {playlist.id === 'liked-songs' ? (
                    <div className={`${styles.image} ${styles.likedBg}`}>
                      <Heart size={40} fill="white" color="white" />
                    </div>
                  ) : showLetter ? (
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      aspectRatio: '1/1',
                      backgroundColor: 'var(--bg-tertiary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '64px',
                      fontWeight: 900,
                      color: 'var(--accent-color-gold)',
                      textTransform: 'uppercase',
                      borderRadius: '8px'
                    }}>
                      {playlist.title.charAt(0)}
                    </div>
                  ) : (
                    <img src={playlist.image} alt={playlist.title} className={styles.image} />
                  )}
                  <button className={styles.playBtn}>
                    <Play fill="currentColor" size={24} />
                  </button>
                </div>
                <div className={styles.title}>{playlist.title}</div>
                <div className={styles.subtitle}>{playlist.count}</div>
              </div>
            );

            return playlist.route ? (
              <Link href={playlist.route} key={playlist.id} style={{ textDecoration: 'none' }}>
                {cardContent}
              </Link>
            ) : cardContent;
          })}
        </div>
      </div>
      <div style={{ height: '40px' }}></div>
    </div>
  );
}
