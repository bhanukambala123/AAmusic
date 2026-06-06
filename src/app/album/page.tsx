"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Play, Heart, Plus, Check } from "lucide-react";
import { useAudio, Song } from "@/context/AudioContext";
import ActionMenu from "@/components/common/ActionMenu";
import { supabase } from "@/lib/supabase";
import styles from "../page.module.css";
import AALoader from "@/components/common/AALoader";
import PlayingVisualizer from "@/components/common/PlayingVisualizer";

function AlbumContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") as string;
  const { playPlaylist, likedSongs, libraryAlbums, toggleLibraryAlbum, currentSong, isPlaying } = useAudio();
  const [album, setAlbum] = useState<any>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlbumAndSongs() {
      if (!id) return;

      // Fetch album details
      const { data: albumData, error } = await supabase
        .from('albums')
        .select('*')
        .eq('id', id)
        .single();
      
      console.log("Album Fetch result:", { albumData, error, id });
      
      if (albumData) {
        setAlbum(albumData);
      }

      // Fetch songs for this album
      const { data: songsData } = await supabase
        .from('songs')
        .select('*')
        .eq('album_id', id)
        .order('created_at', { ascending: true });

      if (songsData && albumData) {
        const formattedSongs: Song[] = songsData.map((song: any) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          audio_url: song.audio_url,
          url: song.audio_url,
          albumTitle: albumData.title,
          image: albumData.cover_url 
        }));
        setSongs(formattedSongs);
      }
      setLoading(false);
    }

    if (id) {
      fetchAlbumAndSongs();
    }
  }, [id]);

  if (loading) {
    return <AALoader />;
  }

  if (!album) {
    return <div style={{ color: 'white', padding: '40px' }}>Album not found.</div>;
  }

  return (
    <div className={styles.container}>
      {/* Featured Banner style for Album Header */}
      <section className={styles.featuredSection}>
        <div 
          className={styles.featuredBanner} 
          style={{ backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%), url(${album.cover_url})` }}
        >
          <div className={styles.featuredContent}>
            <span className={styles.badge}>Album</span>
            <h1 className={styles.featuredTitle}>{album.title}</h1>
            <p className={styles.featuredDesc}>
              {album.description?.toUpperCase().includes('[EXPECTED]') || (album.release_year && album.release_year > new Date().getFullYear())
                ? `Expected in ${album.release_year}` : album.release_year}
            </p>
            <div className={styles.featuredActions}>
              <button 
                className={styles.primaryButton} 
                onClick={() => songs.length > 0 && playPlaylist(songs)}
                disabled={songs.length === 0}
              >
                <Play fill="currentColor" size={20} /> Play
              </button>
              <button 
                className={styles.secondaryButton} 
                onClick={() => toggleLibraryAlbum(album.id.toString())}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {libraryAlbums.includes(album.id.toString()) ? <Check size={20} style={{ color: 'var(--accent-color-gold)' }} /> : <Plus size={20} />}
                {libraryAlbums.includes(album.id.toString()) ? 'Saved' : 'Save to Library'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Album Songs List */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Songs</h2>
        {songs.length > 0 ? (
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
          <p style={{ color: 'var(--text-secondary)' }}>No songs have been added to this album yet.</p>
        )}
      </section>
      
      <div style={{ height: '40px' }}></div>
    </div>
  );
}

export default function AlbumPage() {
  return (
    <Suspense fallback={<AALoader />}>
      <AlbumContent />
    </Suspense>
  );
}
