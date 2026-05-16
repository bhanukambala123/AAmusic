"use client";

import React, { useState, useEffect } from "react";
import { Search as SearchIcon, Play } from "lucide-react";
import styles from "./search.module.css";
import { useAudio, Song } from "@/context/AudioContext";
import { supabase } from "@/lib/supabase";

export default function Search() {
  const [query, setQuery] = useState("");
  const { playPlaylist } = useAudio();
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('songs')
        .select(`
          id, title, artist, duration, audio_url, cover_url,
          albums ( cover_url )
        `)
        .ilike('title', `%${query}%`)
        .limit(20);

      if (data && !error) {
        const formatted: Song[] = data.map((song: any) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          audio_url: song.audio_url,
          url: song.audio_url,
          image: song.cover_url || song.albums?.cover_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=150"
        }));
        setSearchResults(formatted);
      }
      setLoading(false);
    };

    const delayDebounceFn = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className={styles.container}>
      <div className={styles.searchHeader}>
        <div className={styles.searchInputContainer}>
          <SearchIcon className={styles.searchIcon} size={24} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search for songs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.content}>
        {query === "" ? null : (
          <div className={styles.resultsSection}>
            <h2 className={styles.sectionTitle}>Search Results</h2>
            {loading ? (
              <div style={{ color: 'var(--text-secondary)' }}>Searching...</div>
            ) : searchResults.length > 0 ? (
              <div className={styles.songList}>
                {searchResults.map((song, index) => (
                  <div key={song.id} className={styles.songRow} onClick={() => playPlaylist(searchResults, index)}>
                    <div className={styles.songIndex}>{index + 1}</div>
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
            ) : (
              <div style={{ color: 'var(--text-secondary)' }}>No songs found for "{query}"</div>
            )}
          </div>
        )}
      </div>
      <div style={{ height: '40px' }}></div>
    </div>
  );
}
