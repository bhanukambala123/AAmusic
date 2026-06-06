"use client";

import React, { useState, useEffect } from "react";
import { Search as SearchIcon, Play, X, Disc } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./search.module.css";
import pageStyles from "../page.module.css";
import { useAudio, Song } from "@/context/AudioContext";
import { supabase } from "@/lib/supabase";
import AALoader from "@/components/common/AALoader";
import PlayingVisualizer from "@/components/common/PlayingVisualizer";

interface RecentSearchItem {
  id: string;
  type: 'song' | 'album';
  title: string;
  artist?: string;
  image?: string;
  duration?: string;
  audio_url?: string;
  url?: string;
  release_year?: number;
}

export default function Search() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { playPlaylist, currentSong, isPlaying } = useAudio();
  const [songResults, setSongResults] = useState<Song[]>([]);
  const [albumResults, setAlbumResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recently_searched");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing recent searches", e);
      }
    }
  }, []);

  const addToRecentSearches = (item: any, type: 'song' | 'album') => {
    const newItem: RecentSearchItem = {
      id: item.id.toString(),
      type,
      title: item.title,
      artist: item.artist,
      image: item.image || item.cover_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=150",
      duration: item.duration,
      audio_url: item.audio_url || item.url,
      url: item.audio_url || item.url,
      release_year: item.release_year,
    };

    let updated = [newItem, ...recentSearches.filter(i => !(i.id === newItem.id && i.type === type))];
    updated = updated.slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recently_searched", JSON.stringify(updated));
  };

  useEffect(() => {
    if (!query.trim()) {
      setSongResults([]);
      setAlbumResults([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      
      // Query songs
      const { data: songsData, error: songsError } = await supabase
        .from('songs')
        .select(`
          id, title, artist, duration, audio_url, cover_url,
          albums ( title, cover_url )
        `)
        .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
        .limit(10);

      // Query albums
      const { data: albumsData, error: albumsError } = await supabase
        .from('albums')
        .select('*')
        .ilike('title', `%${query}%`)
        .limit(10);

      if (songsData && !songsError) {
        const formatted: Song[] = songsData.map((song: any) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          audio_url: song.audio_url,
          url: song.audio_url,
          image: song.cover_url || song.albums?.cover_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=150"
        }));
        setSongResults(formatted);
      } else {
        setSongResults([]);
      }

      if (albumsData && !albumsError) {
        setAlbumResults(albumsData);
      } else {
        setAlbumResults([]);
      }

      setLoading(false);
    };

    const delayDebounceFn = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handlePlaySong = (songsList: Song[], index: number) => {
    const song = songsList[index];
    addToRecentSearches(song, 'song');
    playPlaylist(songsList, index);
  };

  return (
    <div className={styles.container}>
      <div className={styles.searchHeader}>
        <div className={styles.searchInputContainer}>
          <SearchIcon className={styles.searchIcon} size={24} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search for songs or albums..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.content}>
        {query === "" ? (
          recentSearches.length > 0 ? (
            <div className={styles.resultsSection}>
              <h2 className={styles.sectionTitle}>Recent Searches</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentSearches.map((item) => (
                  <div 
                    key={`${item.type}-${item.id}`} 
                    className={styles.songRow}
                    onClick={() => {
                      if (item.type === 'song') {
                        handlePlaySong([item as any], 0);
                      } else {
                        addToRecentSearches(item, 'album');
                        router.push(`/album?id=${item.id}`);
                      }
                    }}
                  >
                    <img src={item.image} alt={item.title} className={styles.rowImage} />
                    <div className={styles.rowDetails}>
                      <div className={styles.rowTitle}>{item.title}</div>
                      <div className={styles.rowArtist}>
                        {item.type === 'song' ? item.artist : `Album • Released ${item.release_year}`}
                      </div>
                    </div>
                    {item.type === 'song' && <div className={styles.rowDuration}>{item.duration}</div>}
                    <button 
                      className={styles.rowPlayBtn} 
                      style={{ opacity: 0, position: 'absolute', right: '56px' }}
                    >
                      <Play fill="currentColor" size={20} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = recentSearches.filter(i => !(i.id === item.id && i.type === item.type));
                        setRecentSearches(updated);
                        localStorage.setItem("recently_searched", JSON.stringify(updated));
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s',
                        zIndex: 10
                      }}
                      onMouseOver={(e) => e.currentTarget.style.color = '#ff4444'}
                      onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '60px' }}>
              <SearchIcon size={64} style={{ opacity: 0.2, marginBottom: '20px' }} />
              <p>Search for your favorite songs and albums.</p>
            </div>
          )
        ) : (
          <div className={styles.resultsSection}>
            <h2 className={styles.sectionTitle}>Search Results</h2>
            {loading ? (
              <AALoader />
            ) : (songResults.length > 0 || albumResults.length > 0) ? (
              <div>
                {/* Songs Search Results */}
                {songResults.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'white' }}>Songs</h3>
                    <div className={styles.songList} style={{ marginBottom: '24px' }}>
                      {songResults.map((song, index) => (
                        <div key={song.id} className={styles.songRow} onClick={() => handlePlaySong(songResults, index)}>
                          <div className={styles.songIndex}>
                            {currentSong?.id === song.id ? (
                              <PlayingVisualizer isPlaying={isPlaying} />
                            ) : (
                              index + 1
                            )}
                          </div>
                          <img src={song.image} alt={song.title} className={styles.rowImage} />
                          <div className={styles.rowDetails}>
                            <div className={styles.rowTitle}>{song.title}</div>
                            <div className={styles.rowArtist}>{song.artist}</div>
                          </div>
                          <div className={styles.rowDuration}>{song.duration}</div>
                          <button className={styles.rowPlayBtn}>
                            <Play fill="currentColor" size={20} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Albums Search Results */}
                {albumResults.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'white' }}>Albums</h3>
                    <div className={pageStyles.albumGrid}>
                      {albumResults.map((album) => (
                        <Link 
                          href={`/album?id=${album.id}`} 
                          key={album.id} 
                          style={{ textDecoration: 'none' }}
                          onClick={() => addToRecentSearches(album, 'album')}
                        >
                          <div className={pageStyles.albumCard}>
                            <div className={pageStyles.imageWrapper}>
                              <img src={album.cover_url} alt={album.title} className={pageStyles.albumImage} />
                            </div>
                            <div className={`${pageStyles.albumTitle} truncate`}>{album.title}</div>
                            <div className={pageStyles.albumYear}>{album.release_year}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)' }}>No songs or albums found for "{query}"</div>
            )}
          </div>
        )}
      </div>
      <div style={{ height: '40px' }}></div>
    </div>
  );
}
