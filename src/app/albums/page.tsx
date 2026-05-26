"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Play, Disc, Plus, Check } from "lucide-react";
import styles from "../page.module.css";
import { supabase } from "@/lib/supabase";
import { useAudio } from "@/context/AudioContext";

interface Album {
  id: string;
  title: string;
  release_year: number;
  cover_url: string;
  description: string;
}

export default function AlbumsPage() {
  const { libraryAlbums, toggleLibraryAlbum } = useAudio();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlbums() {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .order('release_year', { ascending: false });

      if (data && !error) {
        setAlbums(data);
      }
      setLoading(false);
    }
    fetchAlbums();
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header} style={{ marginBottom: '40px' }}>
        <h1 className={styles.greeting} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Disc size={40} className="text-gold" />
          All Albums
        </h1>
      </header>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Loading albums...</div>
      ) : albums.length > 0 ? (
        <div className={styles.albumGrid}>
          {albums.map((album) => (
            <Link href={`/album/${album.id}`} key={album.id} style={{ textDecoration: 'none' }}>
              <div className={styles.albumCard}>
                <div className={styles.imageWrapper}>
                  <img src={album.cover_url} alt={album.title} className={styles.albumImage} />
                  <button className={styles.albumPlayBtn}>
                    <Play fill="currentColor" size={24} />
                  </button>
                  <button 
                    className={`${styles.albumLibraryBtn} ${libraryAlbums.includes(album.id.toString()) ? styles.added : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleLibraryAlbum(album.id.toString());
                    }}
                    title={libraryAlbums.includes(album.id.toString()) ? "Remove from Library" : "Add to Library"}
                  >
                    {libraryAlbums.includes(album.id.toString()) ? <Check size={18} /> : <Plus size={18} />}
                  </button>
                </div>
                <div className={`${styles.albumTitle} truncate`}>{album.title}</div>
                <div className={styles.albumYear}>{album.release_year}</div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '60px' }}>
          <Disc size={64} style={{ opacity: 0.2, marginBottom: '20px' }} />
          <p>No albums found.</p>
        </div>
      )}

      <div style={{ height: '80px' }}></div>
    </div>
  );
}
