-- Supabase Database Schema for AAmusic

-- Users Table (Extended from auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Albums Table
CREATE TABLE public.albums (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  release_year INTEGER,
  cover_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Songs Table
CREATE TABLE public.songs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  duration TEXT,
  audio_url TEXT NOT NULL,
  cover_url TEXT,
  album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE,
  plays INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Playlists Table
CREATE TABLE public.playlists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Playlist Songs Mapping Table
CREATE TABLE public.playlist_songs (
  playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE,
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (playlist_id, song_id)
);

-- Liked Songs Table
CREATE TABLE public.liked_songs (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE,
  liked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, song_id)
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liked_songs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Albums are viewable by everyone." ON public.albums FOR SELECT USING (true);
CREATE POLICY "Allow public inserts on albums" ON public.albums FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public updates on albums" ON public.albums FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public deletes on albums" ON public.albums FOR DELETE USING (true);

CREATE POLICY "Songs are viewable by everyone." ON public.songs FOR SELECT USING (true);
CREATE POLICY "Allow public inserts on songs" ON public.songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public updates on songs" ON public.songs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public deletes on songs" ON public.songs FOR DELETE USING (true);

CREATE POLICY "Playlists are viewable by everyone if public." ON public.playlists FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can create playlists." ON public.playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own playlists." ON public.playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own playlists." ON public.playlists FOR DELETE USING (auth.uid() = user_id);
