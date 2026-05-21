"use client";
/* eslint-disable react-hooks/immutability */

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

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
  const [customPlaylists, setCustomPlaylists] = useState<CustomPlaylist[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);

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

  // Refs and state synchronization to guarantee background play with screen off
  const queueRef = useRef<Song[]>([]);
  const currentIndexRef = useRef<number>(0);
  const isShuffleRef = useRef<boolean>(false);
  const isRepeatRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);
  const audioDOMRef = useRef<HTMLAudioElement | null>(null);

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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playNextRef = useRef<() => void>(() => {});
  const playPreviousRef = useRef<() => void>(() => {});
  const loadedSongUrlRef = useRef<string | null>(null);

  const updateMediaSessionMetadata = (song: Song) => {
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
  };

  // Fetch data from Supabase when user changes
  useEffect(() => {
    if (!user) {
      setLikedSongs([]);
      setCustomPlaylists([]);
      setCurrentSong(null);
      setQueue([]);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
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
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) return;
    
    let nextIndex: number;
    const currentIdx = currentIndexRef.current;
    const repeat = isRepeatRef.current;
    const shuffle = isShuffleRef.current;
    
    if (repeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error("Playback prevented:", e));
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
    if (audioRef.current && nextSong) {
      updateMediaSessionMetadata(nextSong);
      if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      loadedSongUrlRef.current = nextSong.url;
      audioRef.current.src = getSecureUrl(nextSong.url);
      audioRef.current.play().catch(e => console.error("Playback prevented in playNext:", e));
    }

    setCurrentIndex(nextIndex);
    setCurrentSong(nextSong);
    setIsPlaying(true);
  };

  const playPrevious = () => {
    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) return;

    const repeat = isRepeatRef.current;
    if (repeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error("Playback prevented:", e));
      }
      return;
    }

    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const currentIdx = currentIndexRef.current;
    const prevIndex = currentIdx === 0 ? currentQueue.length - 1 : currentIdx - 1;
    const prevSong = currentQueue[prevIndex];

    if (audioRef.current && prevSong) {
      updateMediaSessionMetadata(prevSong);
      if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      loadedSongUrlRef.current = prevSong.url;
      audioRef.current.src = getSecureUrl(prevSong.url);
      audioRef.current.play().catch(e => console.error("Playback prevented in playPrevious:", e));
    }

    setCurrentIndex(prevIndex);
    setCurrentSong(prevSong);
    setIsPlaying(true);
  };

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  useEffect(() => {
    playPreviousRef.current = playPrevious;
  }, [playPrevious]);

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  useEffect(() => {
    if (!audioDOMRef.current) return;

    // Initialize audio element reference to the DOM element
    audioRef.current = audioDOMRef.current;
    audioRef.current.volume = volume;
    audioRef.current.preload = 'auto'; // Support preloading metadata on mobile background

    const audio = audioRef.current;

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
      playNextRef.current();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    // Register Media Session action handlers ONCE on mount
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      const actions: [MediaSessionAction, () => void][] = [
        ['play', () => {
          setIsPlaying(true);
          if (audioRef.current) {
            audioRef.current.play().catch(e => console.error("Playback prevented on lock screen play:", e));
          }
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
          }
        }],
        ['pause', () => {
          setIsPlaying(false);
          if (audioRef.current) {
            audioRef.current.pause();
          }
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
          }
        }],
        ['nexttrack', () => playNextRef.current()],
        ['previoustrack', () => playPreviousRef.current()]
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
    };
  }, []);

  // Sync state to audio element
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback prevented:", e));
      } else {
        audioRef.current.pause();
      }
    }

    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      } catch (e) {
        console.error("Error setting mediaSession playbackState:", e);
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current && currentSong) {
      const wasPlaying = isPlaying || audioRef.current.currentTime > 0;
      
      if (loadedSongUrlRef.current !== currentSong.url) {
        loadedSongUrlRef.current = currentSong.url;
        audioRef.current.src = getSecureUrl(currentSong.url);
        audioRef.current.load();
        if (wasPlaying) {
          audioRef.current.play().catch(e => console.error("Playback prevented:", e));
          setIsPlaying(true);
        }
      }

      // Update Media Session Metadata safely
      updateMediaSessionMetadata(currentSong);
    }
  }, [currentSong]);

  // Action handlers are safely and efficiently bound once on mount using refs to prevent WebKit listener dropouts.






  const changeVolume = (val: number) => {
    const newVolume = Math.max(0, Math.min(1, val));
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
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
      <audio ref={audioDOMRef} style={{ display: 'none' }} preload="auto" />
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
