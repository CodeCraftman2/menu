-- Check if admins table exists first
DO $$
BEGIN
    -- If admins table already exists but is missing columns, add them
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admins') THEN
        -- Add email column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.admins'::regclass AND attname = 'email') THEN
            ALTER TABLE admins ADD COLUMN email TEXT UNIQUE;
        END IF;
        
        -- Add name column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.admins'::regclass AND attname = 'name') THEN
            ALTER TABLE admins ADD COLUMN name TEXT;
        END IF;
        
        -- Add created_at column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.admins'::regclass AND attname = 'created_at') THEN
            ALTER TABLE admins ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    ELSE
        -- Create admins table if it doesn't exist
        CREATE TABLE admins (
          id UUID PRIMARY KEY DEFAULT auth.uid(),
          email TEXT UNIQUE,
          name TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- Enable Row Level Security (RLS)
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Only admins can view admins table
DROP POLICY IF EXISTS "Admins can view admin profiles" ON admins;
CREATE POLICY "Admins can view admin profiles" ON admins
  FOR SELECT USING (auth.uid() IN (SELECT id FROM admins));

-- Only admins can insert into admins table
DROP POLICY IF EXISTS "Admins can create other admins" ON admins;
CREATE POLICY "Admins can create other admins" ON admins
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM admins));

-- Special bootstrap policy for the first admin
-- This will allow the first admin to be created without existing admins
DROP POLICY IF EXISTS "Bootstrap first admin" ON admins;
CREATE POLICY "Bootstrap first admin" ON admins
  FOR INSERT WITH CHECK (NOT EXISTS (SELECT 1 FROM admins));

-- Create weekly_menus table if it doesn't exist
CREATE TABLE IF NOT EXISTS weekly_menus (
  id BIGSERIAL PRIMARY KEY,
  -- Keep original 'hostel' for backward compatibility, but prefer code+number for joins with users
  hostel TEXT NOT NULL,
  hostel_code TEXT CHECK (hostel_code IN ('BH','LH')),
  hostel_number INTEGER CHECK (hostel_number > 0),
  season TEXT NOT NULL CHECK (season IN ('summer','winter')),
  week INTEGER NOT NULL CHECK (week > 0),
  days_data JSONB NOT NULL,
  campus TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Link to the admin (auth user) who created/modified the menu record
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL
);

-- Ensure a menu is unique per hostel/week/season/campus when code/number are provided
ALTER TABLE weekly_menus
  DROP CONSTRAINT IF EXISTS uq_weekly_menu_identity;
ALTER TABLE weekly_menus
  ADD CONSTRAINT uq_weekly_menu_identity
  UNIQUE (hostel_code, hostel_number, season, week, campus);

-- indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_menus_hostel_season_week ON weekly_menus(hostel, season, week);
CREATE INDEX IF NOT EXISTS idx_weekly_menus_campus ON weekly_menus(campus);
CREATE INDEX IF NOT EXISTS idx_weekly_menus_hostelcode_number ON weekly_menus(hostel_code, hostel_number);
CREATE INDEX IF NOT EXISTS idx_weekly_menus_created_by ON weekly_menus(created_by);

-- 3) Enable RLS on weekly_menus
ALTER TABLE weekly_menus ENABLE ROW LEVEL SECURITY;

-- 4) Policies
-- Allow anyone (anon and authenticated) to read menu
DROP POLICY IF EXISTS "Allow read to all" ON weekly_menus;
CREATE POLICY "Allow read to all"
ON weekly_menus
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow only admins (users whose auth.uid() is listed in admins) to INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Admins can modify menus" ON weekly_menus;
CREATE POLICY "Admins can modify menus"
ON weekly_menus
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.uid()));

-- Note: the service_role key bypasses RLS automatically. Use it for automation scripts.

-- Helper comments:
-- To add an admin, run (replace UUID):
--   INSERT INTO admins(id) VALUES ('00000000-0000-0000-0000-000000000000');
-- To list admins:
--   SELECT * FROM admins;
