"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: 'user' | 'admin' | null;
  username: string | null;
  avatarUrl: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateAvatarUrl: (url: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getDeviceSessionId = () => {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('device_session_id');
  if (!id) {
    id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('device_session_id', id);
  }
  return id;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'user' | 'admin' | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceSessionConflict, setDeviceSessionConflict] = useState(false);
  const [conflictPlaylistId, setConflictPlaylistId] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('role, username, avatar_url').eq('id', userId).single();
    if (data) {
      setRole(data.role as 'user' | 'admin');
      setUsername(data.username);
      setAvatarUrl(data.avatar_url);
    }
  };

  const checkDeviceSession = async (userId: string) => {
    const deviceId = getDeviceSessionId();
    
    // Fetch the special playlist representing this user's active session
    const { data, error } = await supabase
      .from('playlists')
      .select('id, cover_url')
      .eq('user_id', userId)
      .eq('title', '__device_session__')
      .maybeSingle();

    if (error) {
      console.error("Error checking device session", error);
      return true; // Fail-open to avoid locking users out on temporary database glitches
    }

    if (data) {
      if (data.cover_url !== deviceId) {
        setConflictPlaylistId(data.id);
        setDeviceSessionConflict(true);
        return false;
      }
    } else {
      // Create new session playlist
      const { error: insertError } = await supabase
        .from('playlists')
        .insert({
          user_id: userId,
          title: '__device_session__',
          cover_url: deviceId,
          is_public: false
        });
      
      if (insertError) {
        console.error("Error creating device session playlist", insertError);
      }
    }
    return true;
  };

  const updateAvatarUrl = async (url: string) => {
    if (!user) return false;
    const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
    if (!error) {
      setAvatarUrl(url);
      return true;
    }
    return false;
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkDeviceSession(session.user.id).then((ok) => {
          if (ok) {
            fetchProfile(session.user.id).finally(() => setLoading(false));
          } else {
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for changes on auth state (login, logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          checkDeviceSession(session.user.id).then((ok) => {
            if (ok) {
              fetchProfile(session.user.id).finally(() => setLoading(false));
            } else {
              setLoading(false);
            }
          });
        } else {
          setRole(null);
          setUsername(null);
          setAvatarUrl(null);
          setDeviceSessionConflict(false);
          setConflictPlaylistId(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Periodic device session checking to kick out the previous device
  useEffect(() => {
    if (!user || deviceSessionConflict) return;

    const interval = setInterval(async () => {
      const deviceId = getDeviceSessionId();
      const { data, error } = await supabase
        .from('playlists')
        .select('cover_url')
        .eq('user_id', user.id)
        .eq('title', '__device_session__')
        .maybeSingle();

      if (!error && data && data.cover_url !== deviceId) {
        clearInterval(interval);
        alert("You have been logged out because this account was logged in on another device.");
        await signOut();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [user, deviceSessionConflict]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resolveConflict = async (logoutOther: boolean) => {
    if (logoutOther && conflictPlaylistId && user) {
      setLoading(true);
      const deviceId = getDeviceSessionId();
      const { error } = await supabase
        .from('playlists')
        .update({ cover_url: deviceId })
        .eq('id', conflictPlaylistId);
      
      if (!error) {
        setDeviceSessionConflict(false);
        setConflictPlaylistId(null);
        await fetchProfile(user.id);
      } else {
        console.error("Error resolving session conflict:", error);
      }
      setLoading(false);
    } else {
      // Cancel / Log out this device
      setDeviceSessionConflict(false);
      setConflictPlaylistId(null);
      await signOut();
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, role, username, avatarUrl, loading, signOut, updateAvatarUrl }}>
      {deviceSessionConflict ? (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#ffffff'
        }}>
          <div style={{
            backgroundColor: '#121212',
            border: '1px solid rgba(251, 191, 36, 0.2)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '450px',
            width: '100%',
            boxShadow: '0 24px 48px rgba(0,0,0,0.8), 0 0 30px rgba(251, 191, 36, 0.05)',
            textAlign: 'center'
          }}>
            <h2 style={{
              color: '#FBBF24',
              fontSize: '24px',
              fontWeight: 800,
              margin: '0 0 16px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Already Logged In
            </h2>
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '15px',
              lineHeight: '1.6',
              margin: '0 0 32px 0'
            }}>
              Your account is currently active on another device. You can only listen to music on one device at a time.
            </p>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <button 
                onClick={() => resolveConflict(true)}
                style={{
                  backgroundColor: '#FBBF24',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '30px',
                  padding: '14px 24px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'filter 0.2s',
                  boxShadow: '0 4px 12px rgba(251, 191, 36, 0.2)'
                }}
                onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
              >
                Log Out Other Device
              </button>
              <button 
                onClick={() => resolveConflict(false)}
                style={{
                  backgroundColor: 'transparent',
                  color: 'rgba(255, 255, 255, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '30px',
                  padding: '14px 24px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Cancel / Log Out
              </button>
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
