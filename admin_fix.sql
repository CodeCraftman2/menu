-- Script to fix admin table issues
-- Run this in Supabase SQL Editor if you're having problems with admin creation

-- Check if admins table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admins') THEN
        -- Create admins table if it doesn't exist
        CREATE TABLE admins (
          id UUID PRIMARY KEY DEFAULT auth.uid(),
          email TEXT UNIQUE,
          name TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Created admins table from scratch';
    ELSE
        RAISE NOTICE 'Admins table already exists, checking columns...';
        
        -- Add email column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute 
                      WHERE attrelid = 'public.admins'::regclass 
                      AND attname = 'email' 
                      AND NOT attisdropped) THEN
            ALTER TABLE admins ADD COLUMN email TEXT UNIQUE;
            RAISE NOTICE 'Added missing email column';
        END IF;
        
        -- Add name column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute 
                      WHERE attrelid = 'public.admins'::regclass 
                      AND attname = 'name' 
                      AND NOT attisdropped) THEN
            ALTER TABLE admins ADD COLUMN name TEXT;
            RAISE NOTICE 'Added missing name column';
        END IF;
        
        -- Add created_at column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute 
                      WHERE attrelid = 'public.admins'::regclass 
                      AND attname = 'created_at' 
                      AND NOT attisdropped) THEN
            ALTER TABLE admins ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Added missing created_at column';
        END IF;
    END IF;
END
$$;

-- Enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Set up appropriate policies
DROP POLICY IF EXISTS "Admins can view admin profiles" ON admins;
CREATE POLICY "Admins can view admin profiles" ON admins
  FOR SELECT USING (auth.uid() IN (SELECT id FROM admins));

DROP POLICY IF EXISTS "Admins can create other admins" ON admins;
CREATE POLICY "Admins can create other admins" ON admins
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM admins));

DROP POLICY IF EXISTS "Bootstrap first admin" ON admins;
CREATE POLICY "Bootstrap first admin" ON admins
  FOR INSERT WITH CHECK (NOT EXISTS (SELECT 1 FROM admins));

-- Create a function to add an admin
CREATE OR REPLACE FUNCTION add_admin(admin_email TEXT, admin_name TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Get the user id from auth.users based on email
    SELECT id INTO user_id FROM auth.users WHERE email = admin_email;
    
    IF user_id IS NULL THEN
        RETURN 'Error: No user found with email ' || admin_email;
    END IF;
    
    -- Insert or update the admin
    INSERT INTO admins (id, email, name)
    VALUES (user_id, admin_email, COALESCE(admin_name, split_part(admin_email, '@', 1)))
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = EXCLUDED.name;
    
    RETURN 'Success: Added/updated admin with email ' || admin_email;
END;
$$ LANGUAGE plpgsql;

-- Fix weekly_menus table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'weekly_menus') THEN
        -- Add hostel_code column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute 
                      WHERE attrelid = 'public.weekly_menus'::regclass 
                      AND attname = 'hostel_code' 
                      AND NOT attisdropped) THEN
            ALTER TABLE weekly_menus ADD COLUMN hostel_code TEXT;
            RAISE NOTICE 'Added missing hostel_code column to weekly_menus';
            
            -- Update existing data to set hostel_code based on hostel
            UPDATE weekly_menus 
            SET hostel_code = 
                CASE 
                    WHEN hostel LIKE 'BH%' THEN 'BH'
                    WHEN hostel LIKE 'LH%' THEN 'LH'
                    ELSE NULL
                END;
            
            -- Add check constraint after data is fixed
            ALTER TABLE weekly_menus ADD CONSTRAINT chk_hostel_code 
                CHECK (hostel_code IN ('BH', 'LH'));
        END IF;
        
        -- Add hostel_number column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute 
                      WHERE attrelid = 'public.weekly_menus'::regclass 
                      AND attname = 'hostel_number' 
                      AND NOT attisdropped) THEN
            ALTER TABLE weekly_menus ADD COLUMN hostel_number INTEGER;
            RAISE NOTICE 'Added missing hostel_number column to weekly_menus';
            
            -- Update existing data to set hostel_number based on hostel
            UPDATE weekly_menus 
            SET hostel_number = 
                CASE 
                    WHEN hostel LIKE 'BH%' THEN NULLIF(regexp_replace(hostel, '[^0-9]', '', 'g'), '')::INTEGER
                    WHEN hostel LIKE 'LH%' THEN NULLIF(regexp_replace(hostel, '[^0-9]', '', 'g'), '')::INTEGER
                    ELSE NULL
                END;
            
            -- Add check constraint after data is fixed
            ALTER TABLE weekly_menus ADD CONSTRAINT chk_hostel_number 
                CHECK (hostel_number > 0);
        END IF;
        
        -- Add created_by column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute 
                      WHERE attrelid = 'public.weekly_menus'::regclass 
                      AND attname = 'created_by' 
                      AND NOT attisdropped) THEN
            ALTER TABLE weekly_menus ADD COLUMN created_by UUID REFERENCES admins(id) ON DELETE SET NULL;
            RAISE NOTICE 'Added missing created_by column to weekly_menus';
        END IF;
        
        -- Now we can safely add the constraint and indexes
        RAISE NOTICE 'Adding constraints and indexes for weekly_menus...';
    ELSE
        RAISE NOTICE 'weekly_menus table does not exist, will be created by other scripts';
    END IF;
END
$$;

-- Only try to create constraint if the weekly_menus table exists and has the required columns
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'weekly_menus') AND
       EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.weekly_menus'::regclass AND attname = 'hostel_code' AND NOT attisdropped) AND
       EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.weekly_menus'::regclass AND attname = 'hostel_number' AND NOT attisdropped) THEN
       
        -- Drop the constraint if it exists
        BEGIN
            ALTER TABLE weekly_menus DROP CONSTRAINT IF EXISTS uq_weekly_menu_identity;
            RAISE NOTICE 'Dropped existing constraint uq_weekly_menu_identity';
        EXCEPTION 
            WHEN OTHERS THEN 
                RAISE NOTICE 'Could not drop constraint uq_weekly_menu_identity: %', SQLERRM;
        END;
        
        -- Add the constraint
        BEGIN
            ALTER TABLE weekly_menus
                ADD CONSTRAINT uq_weekly_menu_identity
                UNIQUE (hostel_code, hostel_number, season, week, campus);
            RAISE NOTICE 'Added constraint uq_weekly_menu_identity';
        EXCEPTION 
            WHEN OTHERS THEN 
                RAISE NOTICE 'Could not add constraint uq_weekly_menu_identity: %', SQLERRM;
        END;
        
        -- Create indexes if they don't exist
        BEGIN
            CREATE INDEX IF NOT EXISTS idx_weekly_menus_hostel_season_week ON weekly_menus(hostel, season, week);
            CREATE INDEX IF NOT EXISTS idx_weekly_menus_campus ON weekly_menus(campus);
            CREATE INDEX IF NOT EXISTS idx_weekly_menus_hostelcode_number ON weekly_menus(hostel_code, hostel_number);
            CREATE INDEX IF NOT EXISTS idx_weekly_menus_created_by ON weekly_menus(created_by);
            RAISE NOTICE 'Created indexes for weekly_menus';
        EXCEPTION 
            WHEN OTHERS THEN 
                RAISE NOTICE 'Could not create some indexes: %', SQLERRM;
        END;
        
        -- Enable RLS if not already enabled
        BEGIN
            ALTER TABLE weekly_menus ENABLE ROW LEVEL SECURITY;
            RAISE NOTICE 'Enabled RLS on weekly_menus';
        EXCEPTION 
            WHEN OTHERS THEN 
                RAISE NOTICE 'Could not enable RLS on weekly_menus: %', SQLERRM;
        END;
    END IF;
END
$$;

-- Show current admins
SELECT id, email, name, created_at FROM admins;

-- Instructions as comments (not RAISE NOTICE)
-- To add a new admin, run:
-- SELECT add_admin('admin@example.com', 'Admin Name');
-- Or simply:
-- SELECT add_admin('admin@example.com');

-- Display instructions through a DO block
DO $$
BEGIN
    RAISE NOTICE 'To add a new admin, run:';
    RAISE NOTICE 'SELECT add_admin(''admin@example.com'', ''Admin Name'');';
    RAISE NOTICE 'Or simply:';
    RAISE NOTICE 'SELECT add_admin(''admin@example.com'');';
END
$$;
