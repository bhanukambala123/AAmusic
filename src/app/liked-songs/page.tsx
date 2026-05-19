"use client";

import React, { useEffect, useState } from "react";
import { Play, Heart } from "lucide-react";
import { useAudio, Song } from "@/context/AudioContext";
import { supabase } from "@/lib/supabase";
import styles from "../page.module.css";

export default function LikedSongsPage() {
  const { playPlaylist, likedSongs, toggleLikedSong } = useAudio();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLikedSongs() {
      // In a real app, you would fetch from a 'liked_songs' junction table.
      // For this demo, we'll just fetch all songs or a random selection to simulate liked songs.
      const { data: songsData } = await supabase
        .from('songs')
        .select(`
          id, title, artist, duration, audio_url, cover_url, album_id,
          albums ( cover_url )
        `)
        .order('created_at', { ascending: false });

      if (songsData) {
        // Filter out songs that are in the likedSongs context
        const filteredSongs = songsData.filter(song => likedSongs.includes(song.id.toString()));
        
        const formattedSongs: Song[] = filteredSongs.map((song: any) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          audio_url: song.audio_url,
          url: song.audio_url,
          image: song.cover_url || song.albums?.cover_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=150"
        }));
        setSongs(formattedSongs);
      }
      setLoading(false);
    }

    fetchLikedSongs();
  }, [likedSongs]);

  if (loading) {
    return <div style={{ color: 'white', padding: '40px' }}>Loading your liked songs...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Featured Banner style for Liked Songs Header */}
      <section className={styles.featuredSection}>
        <div 
          className={styles.featuredBanner} 
          style={{ backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%), url(https://images.unsplash.com/photo-1513829096999-4978602297a7?auto=format&fit=crop&q=80&w=800)` }}
        >
          <div className={styles.featuredContent}>
            <span className={styles.badge}>Playlist</span>
            <h1 className={styles.featuredTitle}>Liked Songs</h1>
            <p className={styles.featuredDesc}>{songs.length} songs</p>
            <div className={styles.featuredActions}>
              <button 
                className={styles.primaryButton} 
                onClick={() => songs.length > 0 && playPlaylist(songs)}
                disabled={songs.length === 0}
              >
                <Play fill="currentColor" size={20} /> Play
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Songs List */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Songs</h2>
        {songs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {songs.map((song, index) => (
              <div 
                key={song.id} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  color: 'white'
                }}
                onClick={() => playPlaylist(songs, index)}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
              >
                <div style={{ width: '40px', color: 'var(--text-secondary)' }}>{index + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>{song.title}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{song.artist}</div>
                </div>
                <div style={{ marginRight: '16px', color: '#1db954' }}>
                   <Heart 
                     fill="#1db954" 
                     size={18} 
                     onClick={(e) => {
                       e.stopPropagation();
                       toggleLikedSong(song.id.toString());
                     }}
                   />
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{song.duration}</div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>You haven't liked any songs yet.</p>
        )}
      </section>
      
      <div style={{ height: '40px' }}></div>
    </div>
  );
}
