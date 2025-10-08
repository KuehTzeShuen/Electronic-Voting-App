-- Database Schema Update for Supabase Auth Integration
-- Run this in your Supabase SQL editor to update the users table

-- Step 1: Add the auth_id column to the users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id);

-- Step 1.1: Add the new user profile fields
-- Gender: Male or Female
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10) CHECK (gender IN ('male', 'female'));
-- Level: Undergraduate (UG) or Postgraduate (PG)
ALTER TABLE users ADD COLUMN IF NOT EXISTS ug_pg VARCHAR(2) CHECK (ug_pg IN ('UG', 'PG'));
-- Date of Birth in YYYY-MM-DD format
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;
-- Discipline: Integer from 1 to 9 (you can customize what each number represents)
ALTER TABLE users ADD COLUMN IF NOT EXISTS discipline INTEGER CHECK (discipline >= 1 AND discipline <= 9);
-- Location: Integer from 1 to 5 (you can customize what each number represents)
ALTER TABLE users ADD COLUMN IF NOT EXISTS location INTEGER CHECK (location >= 1 AND location <= 5);
-- Grade: N, P, C, D, or HD (likely representing different grade levels)
ALTER TABLE users ADD COLUMN IF NOT EXISTS grade VARCHAR(2) CHECK (grade IN ('N', 'P', 'C', 'D', 'HD'));

-- Step 2: Add a unique constraint on auth_id to prevent duplicates
ALTER TABLE users ADD CONSTRAINT users_auth_id_unique UNIQUE (auth_id);

-- Step 3: Create an index on auth_id for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Step 4: Optional: Add a function to automatically set auth_id when a user signs up
-- This function will be called by a trigger when a new user is created in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called when a new user is created in auth.users
  -- You can use this to automatically create a corresponding record in your users table
  -- if needed, or handle other post-signup logic
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create a trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Grant necessary permissions
-- Make sure the anon role can read from the users table
GRANT SELECT ON users TO anon;
GRANT SELECT ON users TO authenticated;

-- Step 7: Optional: Create a view for easier user lookups
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
  u.id,
  u.auth_id,
  u.email,
  u.first_name,
  u.last_name,
  u.student_id,
  u.gender,
  u.ug_pg,
  u.dob,
  u.discipline,
  u.location,
  u.grade,
  u.role,
  u.created_at,
  au.email_confirmed_at,
  au.last_sign_in_at
FROM users u
LEFT JOIN auth.users au ON u.auth_id = au.id;

-- Grant access to the view
GRANT SELECT ON user_profiles TO anon;
GRANT SELECT ON user_profiles TO authenticated;

-- Step 8: Optional: Add RLS (Row Level Security) policies if needed
-- Enable RLS on the users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own data
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth_id = auth.uid());

-- Create policy to allow users to update their own data
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth_id = auth.uid());

-- Create policy to allow authenticated users to insert their own data
CREATE POLICY "Authenticated users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth_id = auth.uid());

-- Note: You may need to adjust these policies based on your specific requirements
-- For example, if admins need to see all users, you might want to add additional policies
