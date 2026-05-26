"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, Search, Library, PlusSquare, Heart, Settings, User, LogOut, Disc, X } from 'lucide-react';
import styles from './Sidebar.module.css';
import { useAuth } from '@/context/AuthContext';
import { useAudio } from '@/context/AudioContext';
import { useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentId = searchParams.get('id');
  const { user, signOut, username } = useAuth();
  const { createPlaylist, customPlaylists } = useAudio();
  
  const [showModal, setShowModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistCategory, setNewPlaylistCategory] = useState('Love');

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        AA<span>music</span>
      </div>

      <nav className={styles.nav}>
        <Link href="/" className={`${styles.navItem} ${pathname === '/' ? styles.active : ''}`}>
          <Home size={24} />
          <span>Home</span>
        </Link>
        <Link href="/albums" className={`${styles.navItem} ${pathname === '/albums' ? styles.active : ''}`}>
          <Disc size={24} />
          <span>Albums</span>
        </Link>
        <Link href="/search" className={`${styles.navItem} ${pathname === '/search' ? styles.active : ''}`}>
          <Search size={24} />
          <span>Search</span>
        </Link>
        <Link href="/library" className={`${styles.navItem} ${pathname === '/library' ? styles.active : ''}`}>
          <Library size={24} />
          <span>Your Library</span>
        </Link>
      </nav>

      <nav className={styles.nav}>
        <div 
          className={`${styles.navItem} ${showModal ? styles.active : ''}`} 
          onClick={() => setShowModal(true)}
          style={{ cursor: 'pointer' }}
        >
          <PlusSquare size={24} />
          <span>Create Playlist</span>
        </div>
        <Link href="/liked-songs" className={`${styles.navItem} ${pathname === '/liked-songs' ? styles.active : ''}`}>
          <Heart size={24} />
          <span>Liked Songs</span>
        </Link>
      </nav>

      <div className={styles.divider}></div>

      <div className={styles.playlistSection}>
        <div className={styles.sectionTitle}>Your Playlists</div>
        <nav className={styles.nav}>
          {customPlaylists.length > 0 ? (
            customPlaylists.map(playlist => (
              <Link 
                href={`/playlist?id=${playlist.id}`} 
                key={playlist.id} 
                className={`${styles.navItem} ${(pathname === '/playlist' && currentId === playlist.id) ? styles.active : ''}`} 
                style={{ fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}
              >
                <span className="truncate">{playlist.title}</span>
                <span className={styles.categoryBadge}>{playlist.category}</span>
              </Link>
            ))
          ) : (
            <div className={styles.navItem} style={{ fontStyle: 'italic', fontSize: '12px' }}>
              Playlists coming soon...
            </div>
          )}
        </nav>
      </div>
      
      <div className={styles.divider}></div>
      
      {user ? (
        <div className={styles.authSection}>
          <div className={styles.userInfo}>
            <User size={16} />
            <span className="truncate">{username || user.user_metadata?.username || user.email}</span>
          </div>
          <button onClick={signOut} className={styles.navItem} style={{ color: 'var(--text-secondary)' }}>
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>
      ) : (
        <div className={styles.authSection}>
          <Link href="/signup" className={styles.signUpBtn}>Sign up</Link>
          <Link href="/login" className={styles.logInBtn}>Log in</Link>
        </div>
      )}

      {/* Playlist Creation Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Create New Playlist</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label>Playlist Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. My Favorite AA Hits" 
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  autoFocus
                  className={styles.modalInput}
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label>Playlist Category</label>
                <select 
                  value={newPlaylistCategory}
                  onChange={(e) => setNewPlaylistCategory(e.target.value)}
                  className={styles.modalSelect}
                >
                  <option value="Love">Love Songs ❤️</option>
                  <option value="Action">Action / High Energy 🔥</option>
                  <option value="Title">Title Songs 🎸</option>
                  <option value="Sad">Sad Songs 💧</option>
                </select>
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelBtn} 
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.createBtn}
                disabled={!newPlaylistName.trim()}
                onClick={() => {
                  if (newPlaylistName.trim()) {
                    createPlaylist(newPlaylistName, newPlaylistCategory);
                    setNewPlaylistName('');
                    setShowModal(false);
                  }
                }}
              >
                Create Playlist
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
