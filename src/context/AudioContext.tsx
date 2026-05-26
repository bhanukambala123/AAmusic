"use client";
/* eslint-disable react-hooks/immutability */

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { Capacitor } from '@capacitor/core';

export interface Song {
  id: string | number;
  title: string;
  artist: string;
  image: string;
  url: string;
  duration?: string;
  albumTitle?: string;
}

export interface CustomPlaylist {
  id: string;
  title: string;
  songs: string[];
  image?: string;
  category?: string;
}

interface AudioContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  playSong: (song: Song) => void;
  playPlaylist: (songs: Song[], startIndex?: number) => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seek: (value: number) => void;
  changeVolume: (value: number) => void;
  likedSongs: string[];
  toggleLikedSong: (songId: string) => void;
  libraryAlbums: string[];
  toggleLibraryAlbum: (albumId: string) => void;
  customPlaylists: CustomPlaylist[];
  recentlyPlayed: Song[];
  createPlaylist: (title: string, category: string) => void;
  addSongToPlaylist: (playlistId: string, songId: string) => void;
  isShuffle: boolean;
  toggleShuffle: () => void;
  isRepeat: boolean;
  toggleRepeat: () => void;
  toastMessage: string | null;
  toastAction: { label: string, onClick: () => void } | null;
  showToast: (message: string, action?: { label: string, onClick: () => void }) => void;
  addToQueue: (song: Song) => void;
  queue: Song[];
  removeFromQueue: (index: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

// Persistent Global Audio Singleton to prevent background suspension and garbage collection
let globalAudio: HTMLAudioElement | null = null;

if (typeof window !== 'undefined') {
  globalAudio = new Audio();
  globalAudio.preload = 'auto';
  // Allow inline streaming and preserve background audio context
  globalAudio.setAttribute('playsinline', 'true');
  globalAudio.setAttribute('webkit-playsinline', 'true');
}

const getAbsoluteArtworkUrl = (url: string) => {
  if (!url) return '';
  const secureUrl = url.replace(/^http:/i, 'https:');
  if (secureUrl.startsWith('https://') || secureUrl.startsWith('data:')) {
    return secureUrl;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${secureUrl.startsWith('/') ? '' : '/'}${secureUrl}`;
  }
  return secureUrl;
};

const getSecureUrl = (url: string) => {
  if (!url) return '';
  return url.replace(/^http:/i, 'https:');
};

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const { user } = useAuth();
  const [likedSongs, setLikedSongs] = useState<string[]>([]);
  const [libraryAlbums, setLibraryAlbums] = useState<string[]>([]);
  const [customPlaylists, setCustomPlaylists] = useState<CustomPlaylist[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);

  // Initialize native background mode if running inside Capacitor
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@anuradev/capacitor-background-mode').then(({ BackgroundMode }) => {
        try {
          // Force aggressive keep-awake settings
          BackgroundMode.enable({
            title: 'AAmusic Active Playback',
            text: 'Playing your favorite tracks continuously',
            subText: 'AAmusic background engine',
            bigText: true,
            silent: false,
            hidden: false,
            color: '#FBBF24',
            icon: 'icon',
            disableWebViewOptimization: true,
            resume: true
          });
          BackgroundMode.requestDisableBatteryOptimizations();
          BackgroundMode.disableWebViewOptimizations();
          console.log("[AudioContext] Native Background Mode enabled aggressively.");
        } catch (e) {
          console.error("Failed to enable Capacitor Background Mode:", e);
        }
      }).catch(err => {
        console.error("Failed to dynamically import @anuradev/capacitor-background-mode:", err);
      });
    }
  }, []);

  const getRecentlyPlayedStorageKey = () => {
    if (typeof window === 'undefined') return 'recentlyPlayedSongs';
    return user?.id ? `recentlyPlayedSongs_${user.id}` : 'recentlyPlayedSongs';
  };

  const persistRecentlyPlayed = (songs: Song[]) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(getRecentlyPlayedStorageKey(), JSON.stringify(songs));
    } catch (error) {
      console.error('Failed to persist recently played songs:', error);
    }
  };

  const addSongToRecentlyPlayed = (song: Song) => {
    setRecentlyPlayed(prev => {
      const normalizedId = song.id.toString();
      const next = [song, ...prev.filter((item) => item.id.toString() !== normalizedId)].slice(0, 20);
      persistRecentlyPlayed(next);
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(getRecentlyPlayedStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentlyPlayed(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load recently played songs:', error);
    }
  }, [user]);

  const getLibraryAlbumsStorageKey = () => {
    if (typeof window === 'undefined') return 'libraryAlbums';
    return user?.id ? `libraryAlbums_${user.id}` : 'libraryAlbums';
  };

  const persistLibraryAlbums = (albums: string[]) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(getLibraryAlbumsStorageKey(), JSON.stringify(albums));
    } catch (error) {
      console.error('Failed to persist library albums:', error);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(getLibraryAlbumsStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setLibraryAlbums(parsed);
        }
      } else {
        setLibraryAlbums([]);
      }
    } catch (error) {
      console.error('Failed to load library albums:', error);
    }
  }, [user]);

  // Refs and state synchronization to guarantee background play with screen off
  const queueRef = useRef<Song[]>([]);
  const currentIndexRef = useRef<number>(0);
  const isShuffleRef = useRef<boolean>(false);
  const isRepeatRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);

  const [queue, setQueueState] = useState<Song[]>([]);
  const setQueue = (newQueueOrFn: Song[] | ((prev: Song[]) => Song[])) => {
    if (typeof newQueueOrFn === 'function') {
      setQueueState(prev => {
        const nextQueue = newQueueOrFn(prev);
        queueRef.current = nextQueue;
        return nextQueue;
      });
    } else {
      queueRef.current = newQueueOrFn;
      setQueueState(newQueueOrFn);
    }
  };

  const [currentIndex, setCurrentIndexState] = useState(0);
  const setCurrentIndex = (index: number) => {
    currentIndexRef.current = index;
    setCurrentIndexState(index);
  };

  const [isShuffle, setIsShuffleState] = useState(false);
  const setIsShuffle = (val: boolean) => {
    isShuffleRef.current = val;
    setIsShuffleState(val);
  };

  const [isRepeat, setIsRepeatState] = useState(false);
  const setIsRepeat = (val: boolean) => {
    isRepeatRef.current = val;
    setIsRepeatState(val);
  };

  const [isPlaying, setIsPlayingState] = useState(false);
  const setIsPlaying = (val: boolean) => {
    isPlayingRef.current = val;
    setIsPlayingState(val);
  };
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastAction, setToastAction] = useState<{ label: string, onClick: () => void } | null>(null);

  const playNextRef = useRef<() => void>(() => {});
  const playPreviousRef = useRef<() => void>(() => {});
  const loadedSongUrlRef = useRef<string | null>(null);

  const updateMediaSessionMetadata = useCallback((song: Song) => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator && window.MediaMetadata) {
      try {
        const absoluteArtworkUrl = getAbsoluteArtworkUrl(song.image);
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: song.title,
          artist: song.artist,
          album: song.albumTitle || 'AAmusic',
          artwork: absoluteArtworkUrl ? [
            { src: absoluteArtworkUrl, sizes: '96x96', type: 'image/png' },
            { src: absoluteArtworkUrl, sizes: '128x128', type: 'image/png' },
            { src: absoluteArtworkUrl, sizes: '192x192', type: 'image/png' },
            { src: absoluteArtworkUrl, sizes: '256x256', type: 'image/png' },
            { src: absoluteArtworkUrl, sizes: '384x384', type: 'image/png' },
            { src: absoluteArtworkUrl, sizes: '512x512', type: 'image/png' },
          ] : []
        });
      } catch (error) {
        console.error("Failed to update Media Session metadata:", error);
      }
    }
  }, []);

  // Fetch data from Supabase when user changes
  useEffect(() => {
    if (!user) {
      setLikedSongs([]);
      setCustomPlaylists([]);
      setCurrentSong(null);
      setQueue([]);
      setIsPlaying(false);
      if (globalAudio) {
        globalAudio.pause();
        globalAudio.src = "";
      }
      return;
    }

    async function fetchData() {
      // Fetch Liked Songs
      const { data: likes, error: likesError } = await supabase
        .from('liked_songs')
        .select('song_id')
        .eq('user_id', user?.id);
      
      if (likes && !likesError) {
        setLikedSongs(likes.map(l => l.song_id));
      }

      // Fetch Playlists
      const { data: playlists, error: playlistsError } = await supabase
        .from('playlists')
        .select(`
          *,
          playlist_songs (
            song_id
          )
        `)
        .eq('user_id', user?.id);

      if (playlists && !playlistsError) {
        const formattedPlaylists: CustomPlaylist[] = playlists.map(p => ({
          id: p.id,
          title: p.title,
          category: p.cover_url || 'Love', // Using cover_url as category for now since schema didn't have it
          songs: p.playlist_songs?.map((ps: any) => ps.song_id) || [],
          image: "https://images.unsplash.com/photo-1619983081563-430f63602796?auto=format&fit=crop&q=80&w=300"
        }));
        setCustomPlaylists(formattedPlaylists);
      }
    }

    fetchData();
  }, [user]);

  const playSong = (song: Song) => {
    if (!user) {
      showToast("Please login to play music");
      return;
    }
    if (globalAudio) {
      loadedSongUrlRef.current = song.url;
      globalAudio.src = getSecureUrl(song.url);
      globalAudio.load();
      globalAudio.play().catch(e => console.error("Playback prevented in playSong:", e));
    }
    updateMediaSessionMetadata(song);
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
    setQueue([song]);
    setCurrentIndex(0);
    setCurrentSong(song);
    addSongToRecentlyPlayed(song);
    setIsPlaying(true);
  };

  const playPlaylist = (songs: Song[], startIndex = 0) => {
    if (!user) {
      showToast("Please login to play music");
      return;
    }
    if (songs.length === 0) return;
    const firstSong = songs[startIndex];
    if (globalAudio && firstSong) {
      loadedSongUrlRef.current = firstSong.url;
      globalAudio.src = getSecureUrl(firstSong.url);
      globalAudio.load();
      globalAudio.play().catch(e => console.error("Playback prevented in playPlaylist:", e));
    }
    if (firstSong) {
      updateMediaSessionMetadata(firstSong);
      addSongToRecentlyPlayed(firstSong);
    }
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
    setQueue(songs);
    setCurrentIndex(startIndex);
    setCurrentSong(songs[startIndex]);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    if (!user) {
      showToast("Please login to play music");
      return;
    }
    if (!currentSong) return;
    const nextPlayingState = !isPlaying;
    if (globalAudio) {
      if (nextPlayingState) {
        globalAudio.play().catch(e => console.error("Playback prevented in togglePlayPause:", e));
      } else {
        globalAudio.pause();
      }
    }
    setIsPlaying(nextPlayingState);
  };

  const playNext = useCallback(() => {
    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) return;
    
    let nextIndex: number;
    const currentIdx = currentIndexRef.current;
    const repeat = isRepeatRef.current;
    const shuffle = isShuffleRef.current;
    
    if (repeat) {
      if (globalAudio) {
        globalAudio.currentTime = 0;
        globalAudio.play().catch(e => console.error("Playback prevented:", e));
      }
      return;
    } else if (shuffle) {
      nextIndex = Math.floor(Math.random() * currentQueue.length);
      if (currentQueue.length > 1 && nextIndex === currentIdx) {
        nextIndex = (nextIndex + 1) % currentQueue.length;
      }
    } else {
      nextIndex = (currentIdx + 1) % currentQueue.length;
    }
 
    const nextSong = currentQueue[nextIndex];
    if (globalAudio && nextSong) {
      loadedSongUrlRef.current = nextSong.url;
      globalAudio.src = getSecureUrl(nextSong.url);
      globalAudio.load(); // Force immediate load in iOS Safari to prevent background audio suspension
      globalAudio.play().catch(e => console.error("Playback prevented in playNext:", e));
      
      updateMediaSessionMetadata(nextSong);
      if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    }
 
    setCurrentIndex(nextIndex);
    setCurrentSong(nextSong);
    setIsPlaying(true);
  }, []);
 
  const playPrevious = useCallback(() => {
    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) return;
 
    const repeat = isRepeatRef.current;
    if (repeat) {
      if (globalAudio) {
        globalAudio.currentTime = 0;
        globalAudio.play().catch(e => console.error("Playback prevented:", e));
      }
      return;
    }
 
    if (globalAudio && globalAudio.currentTime > 3) {
      globalAudio.currentTime = 0;
      return;
    }
    const currentIdx = currentIndexRef.current;
    const prevIndex = currentIdx === 0 ? currentQueue.length - 1 : currentIdx - 1;
    const prevSong = currentQueue[prevIndex];
 
    if (globalAudio && prevSong) {
      loadedSongUrlRef.current = prevSong.url;
      globalAudio.src = getSecureUrl(prevSong.url);
      globalAudio.load(); // Force immediate load in iOS Safari to prevent background audio suspension
      globalAudio.play().catch(e => console.error("Playback prevented in playPrevious:", e));
      
      updateMediaSessionMetadata(prevSong);
      if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    }
 
    setCurrentIndex(prevIndex);
    setCurrentSong(prevSong);
    setIsPlaying(true);
  }, []);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  useEffect(() => {
    playPreviousRef.current = playPrevious;
  }, [playPrevious]);

  const seek = (time: number) => {
    if (globalAudio) {
      globalAudio.currentTime = time;
      setProgress(time);
    }
  };
 
  useEffect(() => {
    const audio = globalAudio;
    if (!audio) return;
 
    audio.volume = volume;
    audio.preload = 'auto';
 
    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
      
      // Update lock screen progress bar periodically
      if ('mediaSession' in navigator && audio.duration) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration || 0,
            playbackRate: audio.playbackRate || 1,
            position: audio.currentTime || 0
          });
        } catch (e) {
          console.error("Error setting Media Session position state:", e);
        }
      }
    };
 
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
 
    const handleEnded = () => {
      console.log("[AudioContext] Song ended naturally. Advancing to next...");
      playNextRef.current();
    };
 
    const handleNativePlay = () => {
      setIsPlaying(true);
    };
 
    const handleNativePause = () => {
      setIsPlaying(false);
    };
 
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handleNativePlay);
    audio.addEventListener('pause', handleNativePause);
 
    // Register Media Session action handlers ONCE on mount
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      const actions: [MediaSessionAction, () => void][] = [
        ['play', () => {
          setIsPlaying(true);
          audio.play().catch(e => console.error("Playback prevented on lock screen play:", e));
          navigator.mediaSession.playbackState = 'playing';
        }],
        ['pause', () => {
          setIsPlaying(false);
          audio.pause();
          navigator.mediaSession.playbackState = 'paused';
        }],
        ['nexttrack', () => {
          console.log("[AudioContext] Native media nexttrack signal received.");
          playNextRef.current();
        }],
        ['previoustrack', () => {
          console.log("[AudioContext] Native media previoustrack signal received.");
          playPreviousRef.current();
        }]
      ];
 
      actions.forEach(([action, handler]) => {
        try {
          navigator.mediaSession.setActionHandler(action, handler);
        } catch (error) {
          console.warn(`Media Session action "${action}" is not supported:`, error);
        }
      });
 
      try {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined) {
            seek(details.seekTime);
          }
        });
      } catch (error) {
        console.warn('Media Session seekto is not supported:', error);
      }
    }
 
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handleNativePlay);
      audio.removeEventListener('pause', handleNativePause);
    };
  }, []);

  // Safety watchdog loop to prevent background suspension and track-transition deadlocks
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const watchdog = setInterval(() => {
      const audio = globalAudio;
      if (!audio || !isPlayingRef.current || !currentSong) return;

      // Watchdog Case 1: Audio naturally ended but ended listener was skipped (OS background throttle)
      const hasSongEnded = audio.ended || (audio.duration > 0 && audio.currentTime >= audio.duration - 0.5);
      if (hasSongEnded) {
        console.warn("[Watchdog] Song tail/ended detected but transition didn't execute. Programmatically forcing playNext...");
        playNextRef.current();
        return;
      }

      // Watchdog Case 2: React isPlaying state is active but audio is natively paused (OS battery optimization/focus loss)
      if (audio.paused && !audio.seeking) {
        console.log("[Watchdog] Audio is natively paused despite active state. Recovering audio focus...");
        audio.play().catch(e => {
          console.error("[Watchdog] Focus recovery play failed:", e);
          setIsPlaying(false);
        });
      }
    }, 2000);

    return () => clearInterval(watchdog);
  }, [currentSong]);

  // Sync state to Media Session playbackState only
  useEffect(() => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      } catch (e) {
        console.error("Error setting mediaSession playbackState:", e);
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (currentSong) {
      // Update Media Session Metadata safely
      updateMediaSessionMetadata(currentSong);
      
      // Auto-add to recently played songs
      addSongToRecentlyPlayed(currentSong);

      // If native platform, update native foreground service notification
      if (Capacitor.isNativePlatform()) {
        import('@anuradev/capacitor-background-mode').then(({ BackgroundMode }) => {
          try {
            BackgroundMode.updateNotification({
              title: currentSong.title,
              text: currentSong.artist,
              icon: 'icon',
              color: '#FBBF24',
              hidden: false,
              bigText: true
            });
          } catch (e) {
            console.error("Failed to update native background notification:", e);
          }
        }).catch(err => {
          console.error("Failed to load @anuradev/capacitor-background-mode inside currentSong useEffect:", err);
        });
      }
    }
  }, [currentSong]);

  // Action handlers are safely and efficiently bound once on mount using refs to prevent WebKit listener dropouts.






  const changeVolume = (val: number) => {
    const newVolume = Math.max(0, Math.min(1, val));
    setVolume(newVolume);
    if (globalAudio) {
      globalAudio.volume = newVolume;
    }
  };



  const showToast = (message: string, action?: { label: string, onClick: () => void }) => {
    setToastMessage(message);
    setToastAction(action || null);
    setTimeout(() => {
      setToastMessage(null);
      setToastAction(null);
    }, 5000);
  };

  const addToQueue = (song: Song) => {
    if (!user) {
      showToast("Please login to play music");
      return;
    }
    setQueue(prev => [...prev, song]);
    showToast(`"${song.title}" added to queue`, {
      label: "Show Queue",
      onClick: () => {
        // We'll handle this in the UI
        const event = new CustomEvent('toggleQueue');
        window.dispatchEvent(event);
      }
    });
  };

  const removeFromQueue = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const toggleLikedSong = async (songId: string) => {
    if (!user) {
      showToast("Please log in to like songs");
      return;
    }

    const isLiked = likedSongs.includes(songId);
    
    if (isLiked) {
      // Remove from DB
      const { error } = await supabase
        .from('liked_songs')
        .delete()
        .eq('user_id', user?.id)
        .eq('song_id', songId);

      if (!error) {
        setLikedSongs(prev => prev.filter(id => id !== songId));
        showToast("Removed from liked songs");
      }
    } else {
      // Add to DB
      const { error } = await supabase
        .from('liked_songs')
        .insert({ user_id: user?.id, song_id: songId });

      if (!error) {
        setLikedSongs(prev => [...prev, songId]);
        showToast("Added to liked songs");
      }
    }
  };

  const createPlaylist = async (title: string, category: string) => {
    if (!user) {
      showToast("Please log in to create playlists");
      return;
    }
    if (!title.trim()) return;

    const { data, error } = await supabase
      .from('playlists')
      .insert({
        user_id: user?.id,
        title: title.trim(),
        cover_url: category, // Mapping category to cover_url for now
        is_public: true
      })
      .select()
      .single();

    if (data && !error) {
      const newPlaylist: CustomPlaylist = {
        id: data.id,
        title: data.title,
        category: category,
        songs: [],
        image: "https://images.unsplash.com/photo-1619983081563-430f63602796?auto=format&fit=crop&q=80&w=300"
      };
      setCustomPlaylists(prev => [...prev, newPlaylist]);
      showToast(`Playlist "${title}" created!`);
    }
  };

  const addSongToPlaylist = async (playlistId: string, songId: string) => {
    if (!user) return;

    const playlist = customPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    if (playlist.songs.includes(songId)) {
      showToast("Song is already in this playlist");
      return;
    }

    const { error } = await supabase
      .from('playlist_songs')
      .insert({
        playlist_id: playlistId,
        song_id: songId
      });

    if (error) {
      console.error("Error adding song to playlist:", error);
      showToast("Failed to add song to playlist");
      return;
    }

    setCustomPlaylists(prev => 
      prev.map(p => 
        p.id === playlistId 
          ? { ...p, songs: [...p.songs, songId] } 
          : p
      )
    );
    showToast(`Added to ${playlist.title}`);
  };

  const toggleLibraryAlbum = (albumId: string) => {
    if (!user) {
      showToast("Please log in to add albums to your library");
      return;
    }
    
    setLibraryAlbums(prev => {
      const isAdded = prev.includes(albumId);
      let next: string[];
      if (isAdded) {
        next = prev.filter(id => id !== albumId);
        showToast("Removed from library");
      } else {
        next = [...prev, albumId];
        showToast("Added to library");
      }
      persistLibraryAlbums(next);
      return next;
    });
  };

  const toggleShuffle = () => setIsShuffle(!isShuffle);
  const toggleRepeat = () => setIsRepeat(!isRepeat);

  return (
    <AudioContext.Provider value={{
      currentSong,
      isPlaying,
      progress,
      duration,
      volume,
      playSong,
      playPlaylist,
      togglePlayPause,
      playNext,
      playPrevious,
      seek,
      changeVolume,
      likedSongs,
      toggleLikedSong,
      libraryAlbums,
      toggleLibraryAlbum,
      customPlaylists,
      createPlaylist,
      addSongToPlaylist,
      isShuffle,
      toggleShuffle,
      isRepeat,
      toggleRepeat,
      recentlyPlayed,
      toastMessage,
      showToast,
      addToQueue,
      queue,
      removeFromQueue,
      toastAction
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
