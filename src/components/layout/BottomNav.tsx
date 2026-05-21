"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, Disc, PlusSquare, X } from 'lucide-react';
import styles from './BottomNav.module.css';
import { useAuth } from '@/context/AuthContext';
import { useAudio } from '@/context/AudioContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { createPlaylist, showToast } = useAudio();
  
  const [showModal, setShowModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistCategory, setNewPlaylistCategory] = useState('Love');

  const isHomeActive = pathname === '/';
  const isAlbumsActive = pathname === '/albums' || (pathname ? pathname.startsWith('/album') : false);
  const isSearchActive = pathname === '/search';
  const isLibraryActive = pathname === '/library';

  return (
    <>
      <nav className={styles.bottomNav}>
      <Link href="/" className={`${styles.navItem} ${isHomeActive ? styles.active : ''}`}>
        <Home size={24} />
        <span>Home</span>
      </Link>
      <Link href="/albums" className={`${styles.navItem} ${isAlbumsActive ? styles.active : ''}`}>
        <Disc size={24} />
        <span>Albums</span>
      </Link>
      <Link href="/search" className={`${styles.navItem} ${isSearchActive ? styles.active : ''}`}>
        <Search size={24} />
        <span>Search</span>
      </Link>
      <Link href="/library" className={`${styles.navItem} ${isLibraryActive ? styles.active : ''}`}>
        <Library size={24} />
        <span>Library</span>
      </Link>
      {user ? (
        <div 
          className={`${styles.navItem} ${showModal ? styles.active : ''}`} 
          onClick={() => setShowModal(true)}
          style={{ cursor: 'pointer' }}
        >
          <PlusSquare size={24} />
          <span>Create Playlist</span>
        </div>
      ) : (
        <div 
          className={`${styles.navItem} ${showModal ? styles.active : ''}`} 
          onClick={() => showToast("Please log in to create playlists")}
          style={{ cursor: 'pointer' }}
        >
          <PlusSquare size={24} />
          <span>Create Playlist</span>
        </div>
      )}
    </nav>
    
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
    </>
  );
}
