"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './admin.module.css';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Album {
  id: string;
  title: string;
  release_year?: number;
  cover_url?: string;
  description?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'album' | 'song'>('album');
  
  // Album State
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumYear, setAlbumYear] = useState('');
  const [albumCoverUrl, setAlbumCoverUrl] = useState('');
  const [albumStatus, setAlbumStatus] = useState<'released' | 'expected'>('released');
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  
  // Song State
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [songDuration, setSongDuration] = useState('');
  const [songAudioUrl, setSongAudioUrl] = useState('');
  const [songCoverUrl, setSongCoverUrl] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState('');

  // Dropdown Data
  const [availableAlbums, setAvailableAlbums] = useState<Album[]>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/admin/login');
      }
    }
  }, [user, authLoading, router]);

  // Fetch albums for the dropdown
  const fetchAlbums = async () => {
    const { data } = await supabase.from('albums').select('*').order('created_at', { ascending: false });
    if (data) {
      setAvailableAlbums(data);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, [activeTab]);

  const handleCreateOrUpdateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const albumData = { 
        title: albumTitle, 
        release_year: parseInt(albumYear), 
        cover_url: albumCoverUrl,
        description: albumStatus === 'expected' ? '[EXPECTED]' : ''
      };

      console.log("Updating album with data:", albumData);

      if (editingAlbumId) {
        const { error } = await supabase
          .from('albums')
          .update(albumData)
          .eq('id', editingAlbumId);
        if (error) throw error;
        setMessage('Album updated successfully!');
      } else {
        const { error } = await supabase
          .from('albums')
          .insert([albumData]);
        if (error) throw error;
        setMessage('Album created successfully!');
      }

      setAlbumTitle('');
      setAlbumYear('');
      setAlbumCoverUrl('');
      setAlbumStatus('released');
      setEditingAlbumId(null);
      fetchAlbums();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startEditAlbum = (album: Album) => {
    setAlbumTitle(album.title);
    setAlbumYear(album.release_year?.toString() || '');
    setAlbumCoverUrl(album.cover_url || '');
    setAlbumStatus(album.description?.includes('[EXPECTED]') ? 'expected' : 'released');
    setEditingAlbumId(album.id);
    setActiveTab('album');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase
        .from('songs')
        .insert([{ 
          title: songTitle, 
          artist: songArtist, 
          duration: songDuration,
          audio_url: songAudioUrl,
          cover_url: songCoverUrl,
          album_id: selectedAlbum ? selectedAlbum : null
        }]);

      if (error) throw error;
      setMessage('Song added successfully!');
      setSongTitle('');
      setSongArtist('');
      setSongDuration('');
      setSongAudioUrl('');
      setSongCoverUrl('');
      setSelectedAlbum('');
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div style={{ color: 'white', padding: '40px', textAlign: 'center' }}>Checking access...</div>;
  }

  if (!user || role !== 'admin') {
    return (
      <div className={styles.container} style={{ textAlign: 'center', marginTop: '100px' }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ color: 'var(--accent-color-gold)', fontSize: '48px', fontWeight: '900' }}>Access Denied</h1>
          <div style={{ height: '2px', background: 'var(--accent-color-gold)', width: '60px', margin: '15px auto' }}></div>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', fontSize: '18px', maxWidth: '500px', margin: '0 auto 40px' }}>
          You do not have administrative privileges. This area is reserved for the AAmusic team.
        </p>
        <Link href="/" className={styles.submitBtn} style={{ maxWidth: '200px', display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
          Go Back Home
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <p className={styles.subtitle}>Manage your AAmusic catalog</p>
      </header>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'album' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('album')}
        >
          Add Album
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'song' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('song')}
        >
          Add Song
        </button>
      </div>

      {message && (
        <div className={styles.messageBox}>
          {message}
        </div>
      )}

      {activeTab === 'album' ? (
        <>
        <form className={styles.form} onSubmit={handleCreateOrUpdateAlbum}>
          <h2 style={{ color: 'white', marginBottom: '20px' }}>{editingAlbumId ? 'Edit Album' : 'Create New Album'}</h2>
          <div className={styles.formGroup}>
            <label>Album Title</label>
            <input 
              type="text" 
              required 
              value={albumTitle} 
              onChange={e => setAlbumTitle(e.target.value)} 
              placeholder="e.g. Pushpa 2: The Rule"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Release Year</label>
            <input 
              type="number" 
              required 
              value={albumYear} 
              onChange={e => setAlbumYear(e.target.value)} 
              placeholder="e.g. 2024"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Cover Image URL</label>
            <input 
              type="url" 
              required 
              value={albumCoverUrl} 
              onChange={e => setAlbumCoverUrl(e.target.value)} 
              placeholder="https://..."
            />
          </div>
          <div className={styles.formGroup}>
            <label>Release Status</label>
            <select 
              value={albumStatus} 
              onChange={e => setAlbumStatus(e.target.value as any)}
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '12px', borderRadius: '8px' }}
            >
              <option value="released">Released ✅</option>
              <option value="expected">Expected (Upcoming) ⏳</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Processing...' : (editingAlbumId ? 'Update Album' : 'Create Album')}
          </button>
          {editingAlbumId && (
            <button 
              type="button" 
              className={styles.secondaryBtn} 
              style={{ marginTop: '10px', width: '100%' }}
              onClick={() => {
                setEditingAlbumId(null);
                setAlbumTitle('');
                setAlbumYear('');
                setAlbumCoverUrl('');
                setAlbumStatus('released');
              }}
            >
              Cancel Edit
            </button>
          )}
        </form>

        {/* Existing Albums List for Editing */}
        <div className={styles.manageSection}>
          <h2 className={styles.sectionTitle}>Manage Existing Albums</h2>
          <div className={styles.albumGrid}>
            {availableAlbums.map(album => (
              <div key={album.id} className={styles.albumItem}>
                <img src={album.cover_url} alt="" className={styles.miniCover} />
                <div className={styles.albumInfo}>
                  <div className={styles.albumTitle}>{album.title}</div>
                  <div className={styles.albumYear}>{album.release_year}</div>
                </div>
                <button 
                  className={styles.editBtn}
                  onClick={() => startEditAlbum(album)}
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </div>
        </>
      ) : (
        <form className={styles.form} onSubmit={handleCreateSong}>
          <div className={styles.formGroup}>
            <label>Song Title</label>
            <input 
              type="text" 
              required 
              value={songTitle} 
              onChange={e => setSongTitle(e.target.value)} 
              placeholder="e.g. Srivalli"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Artist</label>
            <input 
              type="text" 
              required 
              value={songArtist} 
              onChange={e => setSongArtist(e.target.value)} 
              placeholder="e.g. Devi Sri Prasad"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Duration</label>
            <input 
              type="text" 
              required 
              value={songDuration} 
              onChange={e => setSongDuration(e.target.value)} 
              placeholder="e.g. 3:42"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Audio URL (.mp3)</label>
            <input 
              type="url" 
              required 
              value={songAudioUrl} 
              onChange={e => setSongAudioUrl(e.target.value)} 
              placeholder="https://..."
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Song Poster URL (Optional - if it's a single)</label>
            <input 
              type="url" 
              value={songCoverUrl} 
              onChange={e => setSongCoverUrl(e.target.value)} 
              placeholder="https://..."
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Link to Album (Optional)</label>
            <select 
              className={styles.input} 
              value={selectedAlbum} 
              onChange={e => setSelectedAlbum(e.target.value)}
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              <option value="">-- No Album --</option>
              {availableAlbums.map(album => (
                <option key={album.id} value={album.id}>
                  {album.title}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Adding...' : 'Add Song'}
          </button>
        </form>
      )}
      
      <div style={{ height: '40px' }}></div>
    </div>
  );
}
