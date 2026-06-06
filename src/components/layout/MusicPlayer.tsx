"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, Mic2, Heart, Plus, ListMusic, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
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

const PlayingVisualizer = ({ isPlaying }: { isPlaying: boolean }) => (
  <div className={`${styles.equalizer} ${!isPlaying ? styles.paused : ''}`} aria-hidden="true">
    <div className={styles.equalizerBar}></div>
    <div className={styles.equalizerBar}></div>
    <div className={styles.equalizerBar}></div>
    <div className={styles.equalizerBar}></div>
  </div>
);

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
  const [showFullScreen, setShowFullScreen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setShowQueue(true);
    window.addEventListener('toggleQueue', handleToggle);
    return () => window.removeEventListener('toggleQueue', handleToggle);
  }, []);

  useEffect(() => {
    const handleOpenFS = () => {
      if (isMobile) setShowFullScreen(true);
    };
    window.addEventListener('openFullScreenPlayer', handleOpenFS);
    return () => window.removeEventListener('openFullScreenPlayer', handleOpenFS);
  }, [isMobile]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  const volumeRef = useRef<HTMLDivElement>(null);

  const isLiked = currentSong ? likedSongs.includes(currentSong.id.toString()) : false;

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation(); // Prevent opening fullscreen overlay on mobile top progress click/touch
    if (!duration) return;

    const rect = e.currentTarget.getBoundingClientRect();

    const getClientX = (event: any) => {
      if (event.touches && event.touches.length > 0) {
        return event.touches[0].clientX;
      }
      if (event.changedTouches && event.changedTouches.length > 0) {
        return event.changedTouches[0].clientX;
      }
      return event.clientX;
    };

    const clientX = getClientX(e);
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetTime = percent * duration;

    // Check version control: Gate dragging to "1.0.4"
    let currentAppVersion = "";
    try {
      currentAppVersion = localStorage.getItem("app_version") || "";
    } catch (err) {
      console.error("[MusicPlayer] Error reading app version from storage:", err);
    }

    if (currentAppVersion !== "1.0.4") {
      // Classic click/tap seek only, no drag listeners
      seek(targetTime);
      return;
    }

    setIsDragging(true);
    setDragTime(targetTime);

    const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
      const moveClientX = (moveEvent as TouchEvent).touches && (moveEvent as TouchEvent).touches.length > 0
        ? (moveEvent as TouchEvent).touches[0].clientX
        : (moveEvent as MouseEvent).clientX;

      const movePercent = Math.max(0, Math.min(1, (moveClientX - rect.left) / rect.width));
      setDragTime(movePercent * duration);
    };

    const handleDragEnd = (endEvent: MouseEvent | TouchEvent) => {
      const endClientX = (endEvent as TouchEvent).changedTouches && (endEvent as TouchEvent).changedTouches.length > 0
        ? (endEvent as TouchEvent).changedTouches[0].clientX
        : (endEvent as MouseEvent).clientX;

      const finalPercent = Math.max(0, Math.min(1, (endClientX - rect.left) / rect.width));
      const finalTime = finalPercent * duration;

      seek(finalTime);
      setIsDragging(false);

      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchend", handleDragEnd);
    };

    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("touchmove", handleDragMove, { passive: false });
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchend", handleDragEnd);
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeRef.current) return;
    const rect = volumeRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    changeVolume(percent);
  };

  if (!currentSong) return null; // Don't show player if nothing is playing/queued

  const activeProgress = isDragging ? dragTime : progress;
  const progressPercent = duration > 0 ? (activeProgress / duration) * 100 : 0;
  const volumePercent = volume * 100;

  return (
    <div 
      className={`${styles.playerContainer} ${isMobile ? styles.mobilePadding : ''} ${showFullScreen ? styles.fullScreenActive : ''}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.closest(`.${styles.queueOverlay}`)) {
          return;
        }
        if (isMobile && !showFullScreen) {
          setShowFullScreen(true);
        }
      }}
      style={{ cursor: isMobile && !showFullScreen ? 'pointer' : 'default' }}
    >
      {/* Mobile Top Progress Bar */}
      {isMobile && (
        <div 
          className={styles.progressBarMobile} 
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className={styles.progressFillMobile} style={{ width: `${progressPercent}%` }}>
            <div className={styles.progressThumbMobile}></div>
          </div>
        </div>
      )}

      {/* Song Info */}
      <div className={styles.songInfo}>
        <div 
          className={styles.songInfoTrigger} 
          onClick={() => {
            if (isMobile) setShowFullScreen(true);
          }}
          style={{ cursor: isMobile ? 'pointer' : 'default' }}
        >
          <img 
            src={currentSong.image || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=150"} 
            alt="Album Cover" 
            className={styles.coverArt}
          />
          <div className={styles.songDetails}>
            <div className={styles.songTitle} style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
              <span className="truncate" style={{ marginRight: '4px' }}>{currentSong.title}</span>
              <PlayingVisualizer isPlaying={isPlaying} />
            </div>
            <div className={`${styles.songArtist} truncate`}>{currentSong.artist}</div>
          </div>
        </div>
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
          <button 
            className={styles.controlButton} 
            onClick={(e) => {
              e.stopPropagation();
              playPrevious();
            }}
          >
            <SkipBack size={24} />
          </button>
          
          <button 
            className={styles.playButton} 
            onClick={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
          </button>
          
          <button 
            className={styles.controlButton} 
            onClick={(e) => {
              e.stopPropagation();
              playNext();
            }}
          >
            <SkipForward size={24} />
          </button>

          {isMobile && (
            <button 
              className={styles.controlButton} 
              onClick={(e) => {
                e.stopPropagation();
                setShowQueue(!showQueue);
              }} 
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
            <span className={styles.timeText}>{formatTime(activeProgress)}</span>
            <div 
              className={styles.progressBar} 
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
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

      {/* Full Screen Mobile Player Overlay */}
      {isMobile && showFullScreen && (
        <div className={styles.fullScreenPlayer}>
          {/* Header */}
          <div className={styles.fsHeader}>
            <button className={styles.fsCollapseBtn} onClick={() => setShowFullScreen(false)}>
              <ChevronDown size={28} />
            </button>
            <div className={styles.fsHeaderText}>
              <span className={styles.fsHeaderTitle}>NOW PLAYING</span>
              {currentSong.albumTitle && <span className={styles.fsHeaderAlbum}>{currentSong.albumTitle}</span>}
            </div>
            <button className={styles.fsQueueBtn} onClick={() => {
              setShowQueue(true);
              setShowFullScreen(false);
            }}>
              <ListMusic size={20} />
            </button>
          </div>

          {/* Cover Art */}
          <div className={styles.fsCoverContainer}>
            <img 
              src={currentSong.image || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=400"} 
              alt="Album Cover" 
              className={styles.fsCoverArt}
            />
          </div>

          {/* Song Info */}
          <div className={styles.fsSongInfo}>
            <div className={styles.fsSongDetails}>
              <h2 className={styles.fsSongTitle} style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                <span className="truncate" style={{ marginRight: '8px' }}>{currentSong.title}</span>
                <PlayingVisualizer isPlaying={isPlaying} />
              </h2>
              <p className={styles.fsSongArtist}>{currentSong.artist}</p>
            </div>
            <div className={styles.fsSongActions}>
              <button 
                className={`${styles.fsActionBtn} ${isLiked ? styles.fsLikedActive : ''}`}
                onClick={() => toggleLikedSong(currentSong.id.toString())}
              >
                <Heart size={24} fill={isLiked ? "#ff4444" : "none"} />
              </button>
              <div className={styles.fsActionMenuWrapper}>
                <ActionMenu song={currentSong} isLiked={isLiked} />
              </div>
            </div>
          </div>

          {/* Seek Bar */}
          <div className={styles.fsProgressSection}>
            <div 
              className={styles.fsProgressBarContainer} 
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              <div className={styles.fsProgressBar}>
                <div className={styles.fsProgressFill} style={{ width: `${progressPercent}%` }}>
                  <div className={styles.fsProgressThumb}></div>
                </div>
              </div>
            </div>
            <div className={styles.fsTimeRow}>
              <span>{formatTime(activeProgress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className={styles.fsControlsSection}>
            <button 
              className={`${styles.fsControlBtn} ${isShuffle ? styles.activeGold : ''}`} 
              onClick={() => {
                if (isRepeat) {
                  showToast("Cannot use shuffle while repeat is active");
                } else {
                  toggleShuffle();
                  showToast(isShuffle ? "Shuffle deactivated" : "Shuffle activated");
                }
              }}
            >
              <Shuffle size={22} />
            </button>

            <button className={styles.fsControlBtn} onClick={playPrevious}>
              <SkipBack size={30} fill="currentColor" />
            </button>

            <button 
              className={styles.fsPlayBtn} 
              onClick={togglePlayPause}
            >
              {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
            </button>

            <button className={styles.fsControlBtn} onClick={playNext}>
              <SkipForward size={30} fill="currentColor" />
            </button>

            <button 
              className={`${styles.fsControlBtn} ${isRepeat ? styles.activeGold : ''}`} 
              onClick={() => {
                if (isShuffle) {
                  showToast("Cannot use repeat while shuffle is active");
                } else {
                  toggleRepeat();
                  showToast(isRepeat ? "Repeat deactivated" : "Repeat activated");
                }
              }}
            >
              <Repeat size={22} />
            </button>
          </div>
          
          {/* Subtle branding */}
          <div className={styles.fsBranding}>
            AA<span>music</span>
          </div>
        </div>
      )}
    </div>
  );
}
