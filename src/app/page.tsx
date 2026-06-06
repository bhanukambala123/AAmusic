"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Play, Heart, Plus, Check, Search as SearchIcon, Pause, ListMusic } from "lucide-react";
import styles from "./page.module.css";
import { useAudio, Song } from "@/context/AudioContext";
import { useRouter } from "next/navigation";
import ActionMenu from "@/components/common/ActionMenu";
import { supabase } from "@/lib/supabase";
import AALoader from "@/components/common/AALoader";
import PlayingVisualizer from "@/components/common/PlayingVisualizer";

interface Album {
  id: string;
  title: string;
  release_year: number;
  cover_url: string;
  description: string;
}

export default function Home() {
  const { playPlaylist, likedSongs, toggleLikedSong, currentSong, isPlaying, togglePlayPause, recentlyPlayed, libraryAlbums, toggleLibraryAlbum } = useAudio();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [featuredAlbum, setFeaturedAlbum] = useState<Album | null>(null);
  const [fallbackSongs, setFallbackSongs] = useState<Song[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);

  const recentSongsList = React.useMemo(() => {
    const list = Array.isArray(recentlyPlayed) ? recentlyPlayed : [];
    if (list.length === 0) {
      return fallbackSongs;
    }
    // Filter to only include songs that exist in the database catalog (allSongs)
    const valid = list.filter(song => 
      allSongs.some(dbSong => String(dbSong.id) === String(song.id))
    );
    if (valid.length === 0) {
      return fallbackSongs;
    }
    return valid.slice(0, 4);
  }, [recentlyPlayed, fallbackSongs, allSongs]);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const [greeting, setGreeting] = useState("Good Day");
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      const { data: songsData } = await supabase
        .from('songs')
        .select(`
          id, title, artist, duration, audio_url, cover_url, album_id,
          albums ( title, cover_url )
        `)
        .limit(100);

      if (songsData && songsData.length > 0) {
        const formatted: Song[] = songsData.map((song: any) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          audio_url: song.audio_url,
          url: song.audio_url,
          albumTitle: song.albums?.title,
          image: song.cover_url || song.albums?.cover_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=150"
        }));
        setAllSongs(formatted);

        const randomSongs = [...formatted]
          .sort(() => 0.5 - Math.random())
          .slice(0, 4);
        setFallbackSongs(randomSongs);
      }

      const { data: albumsData } = await supabase
        .from('albums')
        .select('*')
        .limit(100);

      let shuffledAlbums: Album[] = [];
      if (albumsData && albumsData.length > 0) {
        shuffledAlbums = [...albumsData]
          .sort(() => 0.5 - Math.random())
          .slice(0, 4);
        setAlbums(shuffledAlbums);
      }

      const { data: featuredData } = await supabase
        .from('albums')
        .select('*')
        .eq('title', 'Raaka')
        .maybeSingle();

      if (featuredData) {
        setFeaturedAlbum(featuredData);
      } else if (shuffledAlbums.length > 0) {
        setFeaturedAlbum(shuffledAlbums[0]);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const fetchResults = async () => {
      setSearching(true);
      const { data, error } = await supabase
        .from('songs')
        .select(`
          id, title, artist, duration, audio_url, cover_url,
          albums ( title, cover_url )
        `)
        .ilike('title', `%${query}%`)
        .limit(10);

      if (data && !error) {
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
        setSearchResults(formatted);
      }
      setSearching(false);
    };

    const delayDebounceFn = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  const handlePlayFeatured = async () => {
    if (!featuredAlbum) return;

    try {
      const { data: albumSongsData } = await supabase
        .from('songs')
        .select(`
          id, title, artist, duration, audio_url, cover_url, album_id,
          albums ( title, cover_url )
        `)
        .eq('album_id', featuredAlbum.id)
        .order('created_at', { ascending: true });

      if (albumSongsData && albumSongsData.length > 0) {
        const formatted: Song[] = albumSongsData.map((song: any) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          audio_url: song.audio_url,
          url: song.audio_url,
          albumTitle: song.albums?.title,
          image: song.cover_url || song.albums?.cover_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=150"
        }));
        playPlaylist(formatted);
      }
    } catch (err) {
      console.error("Error playing featured album:", err);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.greeting}>{greeting}</div>
        <div className={styles.searchContainer}>
          <div className={styles.searchInputContainer}>
            <SearchIcon className={styles.searchIcon} size={20} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search for songs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Search Results Overlay/Section */}
      {query !== "" && (
        <section className={styles.resultsSection}>
          <h2 className={styles.sectionTitle}>Search Results</h2>
          {searching ? (
            <AALoader />
          ) : searchResults.length > 0 ? (
            <div className={styles.songList}>
              {searchResults.map((song, index) => {
                const isLiked = likedSongs.includes(song.id.toString());
                return (
                  <div key={song.id} className={styles.songRow} onClick={() => playPlaylist(searchResults, index)}>
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
                    <ActionMenu song={song} isLiked={isLiked} className={styles.rowActionMenu} />
                    <button className={styles.rowPlayBtn}>
                      <Play fill="currentColor" size={20} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text-secondary)' }}>No songs found for "{query}"</div>
          )}
          <div style={{ margin: '24px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}></div>
        </section>
      )}

      {/* Hero Section: Now Playing or Featured */}
      <section className={styles.featuredSection}>
        {currentSong ? (
          <div 
            className={styles.featuredBanner} 
            style={{ 
              backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%), url(${currentSong.image})`,
              animation: 'fadeIn 0.5s ease-out',
              cursor: 'pointer'
            }}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('button') || target.closest('a')) {
                return;
              }
              window.dispatchEvent(new CustomEvent('openFullScreenPlayer'));
            }}
          >
            <div className={styles.featuredContent}>
              <span className={styles.badge} style={{ backgroundColor: 'var(--accent-color-gold)', color: '#000' }}>Now Playing</span>
              <h1 className={styles.featuredTitle}>{currentSong.title}</h1>
              <p className={styles.featuredDesc}>
                {currentSong.artist} {currentSong.albumTitle ? `• ${currentSong.albumTitle}` : ''}
              </p>
              <div className={styles.featuredActions}>
                <button className={styles.primaryButton} onClick={togglePlayPause}>
                  {isPlaying ? <Pause fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} />} 
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button 
                  className={styles.secondaryButton} 
                  onClick={() => window.dispatchEvent(new CustomEvent('toggleQueue'))}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <ListMusic size={20} />
                  Queue
                </button>
              </div>
            </div>
          </div>
        ) : featuredAlbum ? (
          <div 
            className={styles.featuredBanner} 
            style={{ backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 100%), url(${featuredAlbum.cover_url})` }}
          >
            <div className={styles.featuredContent}>
              <span className={styles.badge}>Featured Album</span>
              <h1 className={styles.featuredTitle}>{featuredAlbum.title}</h1>
              <p className={styles.featuredDesc}>
                {featuredAlbum.description?.toUpperCase().includes('[EXPECTED]') || (featuredAlbum.release_year && featuredAlbum.release_year > new Date().getFullYear())
                  ? `Expected in ${featuredAlbum.release_year}` 
                  : featuredAlbum.description || `Released in ${featuredAlbum.release_year}`}
              </p>
              <div className={styles.featuredActions}>
                <button className={styles.primaryButton} onClick={handlePlayFeatured}>
                  <Play fill="currentColor" size={20} /> Play
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.featuredBanner} style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div className={styles.featuredContent}>
              <h1 className={styles.featuredTitle}>Welcome to AAmusic</h1>
              <p className={styles.featuredDesc}>Select a song to start listening!</p>
            </div>
          </div>
        )}
      </section>

      {/* Recently Played Songs */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Recently Played Songs</h2>
        {recentSongsList.length > 0 ? (
          <div className={styles.gridContainer}>
            {recentSongsList.map((song, index, list) => {
              const isLiked = likedSongs.includes(song.id.toString());
              return (
                <div key={song.id} className={styles.songCardSmall} onClick={() => playPlaylist(list, index)}>
                  <img src={song.image} alt={song.title} className={styles.songImageSmall} />
                  <div className={styles.songCardDetails}>
                    <div className={`${styles.songCardTitle} truncate`}>{song.title}</div>
                    <div className={`${styles.songCardArtist} truncate`}>{song.artist}</div>
                  </div>
                  <div className={styles.cardActions}>
                    <ActionMenu song={song} isLiked={isLiked} />
                  </div>
                  <button className={styles.playOverlay}>
                    <Play fill="currentColor" size={20} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No songs available yet. Play or upload to see them here.</p>
        )}
      </section>

      {/* Albums */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Top Albums</h2>
        {albums.length > 0 ? (
          <div className={styles.albumGrid}>
            {albums.map((album) => (
              <Link href={`/album?id=${album.id}`} key={album.id} style={{ textDecoration: 'none' }}>
                <div className={styles.albumCard}>
                  <div className={styles.imageWrapper}>
                    <img src={album.cover_url} alt={album.title} className={styles.albumImage} />
                    <button className={styles.albumPlayBtn} onClick={(e) => {
                      e.preventDefault();
                      // Play logic could be added here to fetch album songs and play them instantly
                      router.push(`/album?id=${album.id}`);
                    }}>
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
          <p style={{ color: 'var(--text-secondary)' }}>No albums added yet.</p>
        )}
      </section>
      
      {/* Spacer for bottom */}
      <div style={{ height: '40px' }}></div>
    </div>
  );
}
