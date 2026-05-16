"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from '../../auth.module.css';
import { useAuth } from '@/context/AuthContext';

export default function AdminLogin() {
  const router = useRouter();
  const { role, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user && role === 'admin') {
      router.push('/admin');
    }
  }, [user, role, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Check role
      const { data: profileData } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      
      if (profileData?.role !== 'admin') {
        throw new Error("Access Denied: You do not have admin privileges.");
      }
      
      router.push('/admin');
    } catch (err: any) {
      // If they logged in but aren't an admin, we should sign them out
      if (err.message.includes("Access Denied")) {
        await supabase.auth.signOut();
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.authCard} style={{ borderTop: '4px solid #E13300' }}>
        <h1 className={styles.title}>Admin Portal</h1>
        <p className={styles.subtitle}>Authorized personnel only</p>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleLogin}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Admin Email</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@aamusic.com"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading} style={{ backgroundColor: '#E13300' }}>
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
