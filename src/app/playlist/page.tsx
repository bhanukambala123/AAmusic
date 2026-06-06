"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Play, Music } from "lucide-react";
import { useAudio, Song } from "@/context/AudioContext";
import ActionMenu from "@/components/common/ActionMenu";
import { supabase } from "@/lib/supabase";
import styles from "../page.module.css";
import AALoader from "@/components/common/AALoader";
import PlayingVisualizer from "@/components/common/PlayingVisualizer";

function PlaylistContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") as string;
  const { customPlaylists, playPlaylist, likedSongs, currentSong, isPlaying } = useAudio();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const playlist = customPlaylists.find(p => p.id === id);

  useEffect(() => {
    async function fetchSongs() {
      if (!playlist || playlist.songs.length === 0) {
        setSongs([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('songs')
        .select(`
          *,
          albums (
            title,
            cover_url
          )
        `)
        .in('id', playlist.songs);

      if (data && !error) {
        // Map DB columns to Song interface properties
        const formatted: Song[] = data.map((song: any) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          audio_url: song.audio_url,
          url: song.audio_url,
          albumTitle: song.albums?.title,
          image: song.cover_url || song.albums?.cover_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=150"
        }));

        // Sort songs in the order they appear in the playlist
        const sortedSongs = playlist.songs.map(songId => 
          formatted.find(s => s.id.toString() === songId)
        ).filter(Boolean) as Song[];
        
        setSongs(sortedSongs);
      }
      setLoading(false);
    }
    
    if (id && playlist) {
      fetchSongs();
    } else if (!playlist) {
      setLoading(false);
    }
  }, [id, playlist]);

  if (!playlist) {
    if (loading) {
      return <AALoader />;
    }
    return <div className={styles.container} style={{ color: '#fff' }}>Playlist not found.</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header} style={{ marginBottom: '40px', display: 'flex', gap: '24px', alignItems: 'flex-end' }}>
        <div style={{ 
          width: '232px', 
          height: '232px', 
          backgroundColor: 'var(--bg-tertiary)', 
          borderRadius: '8px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          fontSize: '120px',
          fontWeight: 900,
          color: 'var(--accent-color-gold)',
          textTransform: 'uppercase',
          userSelect: 'none'
        }}>
          {playlist.title.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <div className="text-gold" style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
            Playlist • {playlist.category}
          </div>
          <h1 className={styles.featuredTitle}>{playlist.title}</h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
            {songs.length} songs
          </div>
        </div>
      </header>

      <div style={{ marginBottom: '24px' }}>
        <button 
          className={styles.primaryButton} 
          onClick={() => songs.length > 0 && playPlaylist(songs, 0)}
          disabled={songs.length === 0}
        >
          <Play fill="currentColor" size={24} />
          Play All
        </button>
      </div>

      <section className={styles.section}>
        {loading ? (
          <AALoader />
        ) : songs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {songs.map((song, index) => {
              const isLiked = likedSongs.includes(song.id.toString());
              return (
                <div key={song.id} className={styles.songRow} onClick={() => playPlaylist(songs, index)}>
                  <div className={styles.songIndex}>
                    {currentSong?.id === song.id ? (
                      <PlayingVisualizer isPlaying={isPlaying} />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className={styles.rowDetails}>
                    <div className={styles.rowTitle}>{song.title}</div>
                    <div className={styles.rowArtist}>{song.artist}</div>
                  </div>
                  <div className={styles.rowDuration}>{song.duration}</div>
                  <ActionMenu song={song} isLiked={isLiked} className={styles.rowActionMenu} />
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '60px' }}>
            <Music size={64} style={{ opacity: 0.2, marginBottom: '20px' }} />
            <p>Your playlist is empty. Add some Allu Arjun hits to get started!</p>
          </div>
        )}
      </section>
      
      <div style={{ height: '40px' }}></div>
    </div>
  );
}

export default function PlaylistPage() {
  return (
    <Suspense fallback={null}>
      <PlaylistContent />
    </Suspense>
  );
}
