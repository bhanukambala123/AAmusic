"use client";

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
  createPlaylist: (title: string, category: string) => void;
  addSongToPlaylist: (playlistId: string, songId: string) => void;
  isShuffle: boolean;
  toggleShuffle: () => void;
  isRepeat: boolean;
  toggleRepeat: () => void;
  toastMessage: string | null;
  showToast: (message: string, action?: { label: string, onClick: () => void }) => void;
  addToQueue: (song: Song) => void;
  queue: Song[];
  removeFromQueue: (index: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [likedSongs, setLikedSongs] = useState<string[]>([]);
  const [customPlaylists, setCustomPlaylists] = useState<CustomPlaylist[]>([]);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { user } = useAuth();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playNextRef = useRef<() => void>(() => {});

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
        .eq('user_id', user.id);
      
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
        .eq('user_id', user.id);

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
    setQueue([song]);
    setCurrentIndex(0);
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const playPlaylist = (songs: Song[], startIndex = 0) => {
    if (!user) {
      showToast("Please login to play music");
      return;
    }
    if (songs.length === 0) return;
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
    setIsPlaying(prev => !prev);
  };

  const playNext = () => {
    if (queue.length === 0) return;
    
    let nextIndex: number;
    
    if (isRepeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error("Playback prevented:", e));
      }
      return;
    } else if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
      // Try to get a different song if there's more than one
      if (queue.length > 1 && nextIndex === currentIndex) {
        nextIndex = (nextIndex + 1) % queue.length;
      }
    } else {
      nextIndex = (currentIndex + 1) % queue.length;
    }

    setCurrentIndex(nextIndex);
    setCurrentSong(queue[nextIndex]);
    setIsPlaying(true);
  };

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio();
    audioRef.current.volume = volume;

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
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

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
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
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current && currentSong) {
      const wasPlaying = isPlaying || audioRef.current.currentTime > 0;
      audioRef.current.src = currentSong.url;
      audioRef.current.load();
      if (wasPlaying) {
        audioRef.current.play().catch(e => console.error("Playback prevented:", e));
        setIsPlaying(true);
      }
    }
  }, [currentSong]);



  const playPrevious = () => {
    if (queue.length === 0) return;

    if (isRepeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error("Playback prevented:", e));
      }
      return;
    }

    // If more than 3 seconds in, just restart the song
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    setCurrentSong(queue[prevIndex]);
    setIsPlaying(true);
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const changeVolume = (val: number) => {
    const newVolume = Math.max(0, Math.min(1, val));
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const [toastAction, setToastAction] = useState<{ label: string, onClick: () => void } | null>(null);

  const showToast = (message: string, action?: { label: string, onClick: () => void }) => {
    setToastMessage(message);
    setToastAction(action || null);
    setTimeout(() => {
      setToastMessage(null);
      setToastAction(null);
    }, 4000);
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
        .eq('user_id', user.id)
        .eq('song_id', songId);

      if (!error) {
        setLikedSongs(prev => prev.filter(id => id !== songId));
        showToast("Removed from liked songs");
      }
    } else {
      // Add to DB
      const { error } = await supabase
        .from('liked_songs')
        .insert({ user_id: user.id, song_id: songId });

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
        user_id: user.id,
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

  const toggleShuffle = () => setIsShuffle(prev => !prev);
  const toggleRepeat = () => setIsRepeat(prev => !prev);

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
