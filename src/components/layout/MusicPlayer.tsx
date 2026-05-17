"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, Mic2, Heart, Plus, ListMusic, X, Trash2 } from 'lucide-react';
import styles from './MusicPlayer.module.css';
import { useAudio } from '@/context/AudioContext';
import ActionMenu from '../common/ActionMenu';

interface MusicPlayerProps {
  isMobile: boolean;
}

const formatTime = (timeInSeconds: number) => {
  if (isNaN(timeInSeconds)) return "0:00";
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export default function MusicPlayer({ isMobile }: MusicPlayerProps) {
  const {
    currentSong,
    isPlaying,
    progress,
    duration,
    volume,
    togglePlayPause,
    playNext,
    playPrevious,
    seek,
    changeVolume,
    toggleLikedSong,
    likedSongs,
    isShuffle,
    toggleShuffle,
    isRepeat,
    toggleRepeat,
    showToast,
    queue,
    removeFromQueue,
    playPlaylist
  } = useAudio();

  const [showQueue, setShowQueue] = useState(false);

  useEffect(() => {
    const handleToggle = () => setShowQueue(true);
    window.addEventListener('toggleQueue', handleToggle);
    return () => window.removeEventListener('toggleQueue', handleToggle);
  }, []);

  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  const isLiked = currentSong ? likedSongs.includes(currentSong.id.toString()) : false;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seek(percent * duration);
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeRef.current) return;
    const rect = volumeRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    changeVolume(percent);
  };

  if (!currentSong) return null; // Don't show player if nothing is playing/queued

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const volumePercent = volume * 100;

  return (
    <div className={`${styles.playerContainer} ${isMobile ? styles.mobilePadding : ''}`}>
      {/* Mobile Top Progress Bar */}
      {isMobile && (
        <div className={styles.progressBarMobile} ref={progressRef} onClick={handleProgressClick}>
          <div className={styles.progressFillMobile} style={{ width: `${progressPercent}%` }}>
            <div className={styles.progressThumbMobile}></div>
          </div>
        </div>
      )}

      {/* Song Info */}
      <div className={styles.songInfo}>
        <img 
          src={currentSong.image || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=150"} 
          alt="Album Cover" 
          className={styles.coverArt}
        />
        <div className={styles.songDetails}>
          <div className={`${styles.songTitle} truncate`}>{currentSong.title}</div>
          <div className={`${styles.songArtist} truncate`}>{currentSong.artist}</div>
        </div>
        <ActionMenu song={currentSong} isLiked={isLiked} />
      </div>

      {/* Player Controls */}
      <div className={styles.playerControls}>
        <div className={styles.mainControls}>
          {!isMobile && (
            <button 
              className={`${styles.controlButton} ${isShuffle ? styles.activeGold : ''}`} 
              onClick={() => {
                if (isRepeat) {
                  showToast("Cannot use shuffle while repeat is active");
                } else {
                  toggleShuffle();
                  showToast(isShuffle ? "Shuffle deactivated" : "Shuffle activated");
                }
              }}
            >
              <Shuffle size={18} />
            </button>
          )}
          
          <button className={styles.controlButton} onClick={playPrevious}>
            <SkipBack size={24} />
          </button>
          
          <button 
            className={styles.playButton} 
            onClick={togglePlayPause}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
          </button>
          
          <button className={styles.controlButton} onClick={playNext}>
            <SkipForward size={24} />
          </button>

          {isMobile && (
            <button 
              className={styles.controlButton} 
              onClick={() => setShowQueue(!showQueue)} 
              style={{ color: showQueue ? 'var(--accent-color-gold)' : 'inherit', marginLeft: '8px' }}
            >
              <ListMusic size={20} />
            </button>
          )}
          
          {!isMobile && (
            <button 
              className={`${styles.controlButton} ${isRepeat ? styles.activeGold : ''}`} 
              onClick={() => {
                if (isShuffle) {
                  showToast("Cannot use repeat while shuffle is active");
                } else {
                  toggleRepeat();
                  showToast(isRepeat ? "Repeat deactivated" : "Repeat activated");
                }
              }}
            >
              <Repeat size={18} />
            </button>
          )}
        </div>
        
        {!isMobile && (
          <div className={styles.progressContainer}>
            <span className={styles.timeText}>{formatTime(progress)}</span>
            <div className={styles.progressBar} ref={progressRef} onClick={handleProgressClick}>
              <div className={styles.progressFill} style={{ width: `${progressPercent}%` }}>
                <div className={styles.progressThumb}></div>
              </div>
            </div>
            <span className={styles.timeText}>{formatTime(duration)}</span>
          </div>
        )}
      </div>

      {/* Extra Controls */}
      <div className={styles.extraControls}>
        <button className={styles.controlButton} onClick={() => setShowQueue(!showQueue)} style={{ color: showQueue ? 'var(--accent-color-gold)' : 'inherit' }}>
          <ListMusic size={20} />
        </button>
        <button className={styles.controlButton} onClick={() => changeVolume(volume > 0 ? 0 : 1)}>
          <Volume2 size={20} />
        </button>
        <div className={styles.volumeBar} ref={volumeRef} onClick={handleVolumeClick}>
          <div className={styles.volumeFill} style={{ width: `${volumePercent}%` }}></div>
        </div>
      </div>

      {/* Queue Overlay (Relocated to top-level for mobile display) */}
      {showQueue && (
        <div className={styles.queueOverlay}>
          <div className={styles.queueHeader}>
            <h3>Queue</h3>
            <button onClick={() => setShowQueue(false)} className={styles.closeBtn}>
              <X size={20} />
            </button>
          </div>
          <div className={styles.queueList}>
            {queue.length > 0 ? (
              queue.map((song, index) => (
                <div key={`${song.id}-${index}`} className={`${styles.queueItem} ${currentSong.id === song.id ? styles.activeQueueItem : ''}`}>
                  <img src={song.image} alt="" className={styles.queueImg} />
                  <div className={styles.queueInfo}>
                    <div className={styles.queueTitle}>{song.title}</div>
                    <div className={styles.queueArtist}>{song.artist}</div>
                  </div>
                  <div className={styles.queueActions}>
                    <button 
                      onClick={() => removeFromQueue(index)} 
                      className={styles.queueActionBtn}
                      style={{ color: '#ff4444' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyQueue}>Queue is empty</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
