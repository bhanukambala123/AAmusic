"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Heart, ListPlus, ChevronRight } from 'lucide-react';
import { useAudio, Song } from '@/context/AudioContext';
import styles from './ActionMenu.module.css';

interface ActionMenuProps {
  song: Song;
  isLiked: boolean;
  className?: string;
}

export default function ActionMenu({ song, isLiked, className }: ActionMenuProps) {
  const songId = song.id.toString();
  const [isOpen, setIsOpen] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const { toggleLikedSong, customPlaylists, addSongToPlaylist, addToQueue } = useAudio();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowPlaylists(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`${styles.menuContainer} ${className || ''}`} ref={menuRef}>
      <button 
        className={styles.triggerBtn} 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <Plus size={20} />
      </button>

      {isOpen && (
        <div className={styles.dropdown} onClick={(e) => e.stopPropagation()}>
          <button 
            className={styles.menuItem} 
            onClick={() => {
              toggleLikedSong(songId);
              setIsOpen(false);
            }}
          >
            <Heart size={16} fill={isLiked ? "var(--accent-color-gold)" : "none"} color={isLiked ? "var(--accent-color-gold)" : "currentColor"} />
            <span>{isLiked ? 'Unlike' : 'Like'}</span>
          </button>

          <button 
            className={styles.menuItem} 
            onClick={() => {
              addToQueue(song);
              setIsOpen(false);
            }}
          >
            <ListPlus size={16} />
            <span>Add to Queue</span>
          </button>

          <div 
            className={styles.menuItem} 
            onMouseEnter={() => setShowPlaylists(true)}
            onMouseLeave={() => setShowPlaylists(false)}
            onClick={(e) => {
              e.stopPropagation();
              setShowPlaylists(!showPlaylists);
            }}
          >
            <ListPlus size={16} />
            <span>Add to Playlist</span>
            <ChevronRight size={14} className={styles.chevron} />

            {showPlaylists && (
              <div className={styles.subMenu} onClick={(e) => e.stopPropagation()}>
                {customPlaylists.length > 0 ? (
                  customPlaylists.map(playlist => (
                    <button 
                      key={playlist.id} 
                      className={styles.subMenuItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        addSongToPlaylist(playlist.id, songId);
                        setIsOpen(false);
                        setShowPlaylists(false);
                      }}
                    >
                      {playlist.title}
                    </button>
                  ))
                ) : (
                  <div className={styles.noPlaylists}>No playlists created</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
