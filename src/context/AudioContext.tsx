"use client";
/* eslint-disable react-hooks/immutability */

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { Capacitor } from '@capacitor/core';
import { NativeAudio } from '@capgo/capacitor-native-audio';

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
  const [progress, setProgressState] = useState(0);
  const progressRef = useRef<number>(0);
  const setProgress = (val: number) => {
    progressRef.current = val;
    setProgressState(val);
  };
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
      if (Capacitor.isNativePlatform()) {
        NativeAudio.stop({ assetId: 'currentTrack' }).catch(() => {});
        NativeAudio.unload({ assetId: 'currentTrack' }).catch(() => {});
      } else if (globalAudio) {
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

  const loadAndPlaySong = async (song: Song) => {
    if (!song) return;

    if (Capacitor.isNativePlatform()) {
      try {
        console.log("[AudioContext] Preparing native playback for song:", song.title);
        // Stop and unload existing track
        await NativeAudio.stop({ assetId: 'currentTrack' }).catch(() => {});
        await NativeAudio.unload({ assetId: 'currentTrack' }).catch(() => {});

        loadedSongUrlRef.current = song.url;

        // Preload track natively
        await NativeAudio.preload({
          assetId: 'currentTrack',
          assetPath: getSecureUrl(song.url),
          isUrl: true,
          audioChannelNum: 1,
          notificationMetadata: {
            title: song.title,
            artist: song.artist,
            album: song.albumTitle || 'AAmusic',
            artworkUrl: getAbsoluteArtworkUrl(song.image)
          }
        });

        // Try getting initial duration
        const durationRes = await NativeAudio.getDuration({ assetId: 'currentTrack' }).catch(() => null);
        if (durationRes && durationRes.duration > 0) {
          setDuration(durationRes.duration);
        } else {
          setDuration(0);
        }

        // Start playing natively
        await NativeAudio.play({ assetId: 'currentTrack' });
        setIsPlaying(true);
      } catch (error) {
        console.error("Error playing native song:", error);
        showToast("Error playing song");
      }
    } else if (globalAudio) {
      loadedSongUrlRef.current = song.url;
      globalAudio.src = getSecureUrl(song.url);
      globalAudio.load();
      globalAudio.play().catch(e => console.error("Playback prevented in loadAndPlaySong:", e));
      setIsPlaying(true);
    }

    updateMediaSessionMetadata(song);
    addSongToRecentlyPlayed(song);
    setCurrentSong(song);
  };

  const playSong = (song: Song) => {
    if (!user) {
      showToast("Please login to play music");
      return;
    }
    setQueue([song]);
    setCurrentIndex(0);
    loadAndPlaySong(song);
  };

  const playPlaylist = (songs: Song[], startIndex = 0) => {
    if (!user) {
      showToast("Please login to play music");
      return;
    }
    if (songs.length === 0) return;
    setQueue(songs);
    setCurrentIndex(startIndex);
    loadAndPlaySong(songs[startIndex]);
  };

  const togglePlayPause = () => {
    if (!user) {
      showToast("Please login to play music");
      return;
    }
    if (!currentSong) return;
    const nextPlayingState = !isPlaying;
    
    if (Capacitor.isNativePlatform()) {
      if (nextPlayingState) {
        NativeAudio.resume({ assetId: 'currentTrack' }).catch(e => console.error("Error resuming native audio:", e));
      } else {
        NativeAudio.pause({ assetId: 'currentTrack' }).catch(e => console.error("Error pausing native audio:", e));
      }
      setIsPlaying(nextPlayingState);
    } else if (globalAudio) {
      if (nextPlayingState) {
        globalAudio.play().catch(e => console.error("Playback prevented in togglePlayPause:", e));
      } else {
        globalAudio.pause();
      }
      setIsPlaying(nextPlayingState);
    }
  };

  const playNext = useCallback(() => {
    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) return;
    
    let nextIndex: number;
    const currentIdx = currentIndexRef.current;
    const repeat = isRepeatRef.current;
    const shuffle = isShuffleRef.current;
    
    if (repeat) {
      if (Capacitor.isNativePlatform()) {
        NativeAudio.setCurrentTime({ assetId: 'currentTrack', time: 0 }).catch(() => {});
        NativeAudio.play({ assetId: 'currentTrack' }).catch(() => {});
      } else if (globalAudio) {
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
    if (nextSong) {
      loadAndPlaySong(nextSong);
    }
 
    setCurrentIndex(nextIndex);
  }, []);
 
  const playPrevious = useCallback(() => {
    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) return;
 
    const repeat = isRepeatRef.current;
    if (repeat) {
      if (Capacitor.isNativePlatform()) {
        NativeAudio.setCurrentTime({ assetId: 'currentTrack', time: 0 }).catch(() => {});
        NativeAudio.play({ assetId: 'currentTrack' }).catch(() => {});
      } else if (globalAudio) {
        globalAudio.currentTime = 0;
        globalAudio.play().catch(e => console.error("Playback prevented:", e));
      }
      return;
    }
 
    if (progressRef.current > 3) {
      if (Capacitor.isNativePlatform()) {
        NativeAudio.setCurrentTime({ assetId: 'currentTrack', time: 0 }).catch(() => {});
      } else if (globalAudio) {
        globalAudio.currentTime = 0;
      }
      setProgress(0);
      return;
    }
    const currentIdx = currentIndexRef.current;
    const prevIndex = currentIdx === 0 ? currentQueue.length - 1 : currentIdx - 1;
    const prevSong = currentQueue[prevIndex];
 
    if (prevSong) {
      loadAndPlaySong(prevSong);
    }
 
    setCurrentIndex(prevIndex);
  }, []);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  useEffect(() => {
    playPreviousRef.current = playPrevious;
  }, [playPrevious]);

  const seek = (time: number) => {
    if (Capacitor.isNativePlatform()) {
      NativeAudio.setCurrentTime({ assetId: 'currentTrack', time: time }).catch(e => {
        console.error("Error seeking native audio:", e);
      });
      setProgress(time);
    } else if (globalAudio) {
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
 
    // Register HTML5 listeners only on standard web browser
    if (!Capacitor.isNativePlatform()) {
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('play', handleNativePlay);
      audio.addEventListener('pause', handleNativePause);
    }

    // Configure and setup Native listeners
    let completeListener: any = null;
    let timeListener: any = null;
    let stateListener: any = null;

    if (Capacitor.isNativePlatform()) {
      // Configure Native Audio Plugin
      NativeAudio.configure({
        background: true,
        showNotification: true,
        backgroundPlayback: true,
        focus: true
      }).then(() => {
        console.log("[AudioContext] NativeAudio configured successfully.");
      }).catch(e => {
        console.error("[AudioContext] NativeAudio configuration failed:", e);
      });

      // 1. Listen for track ending
      NativeAudio.addListener('complete', (event: { assetId: string }) => {
        console.log("[AudioContext] Native playback complete event:", event);
        if (event.assetId === 'currentTrack') {
          playNextRef.current();
        }
      }).then(handle => {
        completeListener = handle;
      });

      // 2. Listen for current playback time updates (emits every 100ms)
      NativeAudio.addListener('currentTime', (data: { currentTime: number; assetId: string }) => {
        if (data.assetId === 'currentTrack') {
          setProgress(data.currentTime);
        }
      }).then(handle => {
        timeListener = handle;
      });

      // 3. Listen for media notification / lock-screen play/pause buttons
      NativeAudio.addListener('playbackState', (state: { assetId: string; isPlaying: boolean; state: string; reason: string }) => {
        console.log("[AudioContext] Native playbackState event:", state);
        if (state.assetId === 'currentTrack') {
          setIsPlaying(state.isPlaying);
        }
      }).then(handle => {
        stateListener = handle;
      });
    }
 
    // Register Media Session action handlers ONCE on mount
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      const actions: [MediaSessionAction, () => void][] = [
        ['play', () => {
          setIsPlaying(true);
          if (Capacitor.isNativePlatform()) {
            NativeAudio.resume({ assetId: 'currentTrack' }).catch(() => {});
          } else {
            audio.play().catch(e => console.error("Playback prevented on lock screen play:", e));
          }
          navigator.mediaSession.playbackState = 'playing';
        }],
        ['pause', () => {
          setIsPlaying(false);
          if (Capacitor.isNativePlatform()) {
            NativeAudio.pause({ assetId: 'currentTrack' }).catch(() => {});
          } else {
            audio.pause();
          }
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
      if (!Capacitor.isNativePlatform()) {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('play', handleNativePlay);
        audio.removeEventListener('pause', handleNativePause);
      }
      if (completeListener) completeListener.remove();
      if (timeListener) timeListener.remove();
      if (stateListener) stateListener.remove();
    };
  }, []);

  // Safety watchdog loop to prevent background suspension and track-transition deadlocks
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const watchdog = setInterval(() => {
      const audio = globalAudio;
      if (!isPlayingRef.current || !currentSong) return;

      if (!Capacitor.isNativePlatform()) {
        if (!audio) return;
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
      } else {
        // Watchdog Case 3: Native platform sanity checks
        NativeAudio.isPlaying({ assetId: 'currentTrack' }).then(res => {
          if (res && res.isPlaying && !isPlayingRef.current) {
            console.log("[Watchdog] Native audio is active but context is paused. Syncing state...");
            setIsPlaying(true);
          }
        }).catch(() => {});

        NativeAudio.getDuration({ assetId: 'currentTrack' }).then(res => {
          if (res && res.duration > 0) {
            setDuration(res.duration);
          }
        }).catch(() => {});
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
    }
  }, [currentSong]);

  // Action handlers are safely and efficiently bound once on mount using refs to prevent WebKit listener dropouts.






  const changeVolume = (val: number) => {
    const newVolume = Math.max(0, Math.min(1, val));
    setVolume(newVolume);
    if (Capacitor.isNativePlatform()) {
      NativeAudio.setVolume({ assetId: 'currentTrack', volume: newVolume }).catch(e => {
        console.error("Error setting native volume:", e);
      });
    } else if (globalAudio) {
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
