# Database Setup Guide

## The Issue
Your app is getting "Failed to load posts" because the database tables don't exist yet. You need to create them manually in your Supabase project.

## Solution: Manual Database Setup

### Step 1: Go to Supabase Dashboard
1. Visit [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in and select your project: `gwcdrwlwvufdubknkyyk`

### Step 2: Open SQL Editor
1. In your project dashboard, click on **SQL Editor** in the left sidebar
2. Click **New query**

### Step 3: Create Basic Tables
Copy and paste this SQL to create the essential tables:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  gym TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  caption TEXT,
  image_url TEXT,
  media_type TEXT DEFAULT 'image',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Create followers table
CREATE TABLE IF NOT EXISTS followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Posts are viewable by everyone" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Likes are viewable by everyone" ON likes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own likes" ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" ON likes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Followers are viewable by everyone" ON followers
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own follows" ON followers
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own follows" ON followers
  FOR DELETE USING (auth.uid() = follower_id);
```

### Step 4: Run the SQL
1. Click **Run** to execute the SQL
2. You should see "Success" message

### Step 5: Test the App
1. Go back to your app
2. Refresh the page
3. The "Failed to load posts" error should be gone

## If you still get errors:
1. Check the browser console (F12) for specific error messages
2. Make sure you're logged in to the app
3. Try creating a test post to see if everything works

## Next Steps:
Once the basic tables work, you can add more advanced features by running additional migration files from the `supabase/migrations/` folder. 