-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  registration_no TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  hostel_code TEXT NOT NULL CHECK (hostel_code IN ('BH', 'LH')),
  hostel_number INTEGER NOT NULL CHECK (hostel_number > 0),
  room_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_registration_no ON users(registration_no);
CREATE INDEX IF NOT EXISTS idx_users_hostel ON users(hostel_code, hostel_number);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- WEEKLY_MENUS TABLE
CREATE TABLE IF NOT EXISTS weekly_menus (
  id BIGSERIAL PRIMARY KEY,
  hostel TEXT NOT NULL,
  hostel_code TEXT CHECK (hostel_code IN ('BH','LH')),
  hostel_number INTEGER CHECK (hostel_number > 0),
  season TEXT NOT NULL CHECK (season IN ('summer','winter')),
  week INTEGER NOT NULL CHECK (week > 0),
  days_data JSONB NOT NULL,
  campus TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL
);

ALTER TABLE weekly_menus
  DROP CONSTRAINT IF EXISTS uq_weekly_menu_identity;
ALTER TABLE weekly_menus
  ADD CONSTRAINT uq_weekly_menu_identity
  UNIQUE (hostel_code, hostel_number, season, week, campus);

CREATE INDEX IF NOT EXISTS idx_weekly_menus_hostel_season_week ON weekly_menus(hostel, season, week);
CREATE INDEX IF NOT EXISTS idx_weekly_menus_campus ON weekly_menus(campus);
CREATE INDEX IF NOT EXISTS idx_weekly_menus_hostelcode_number ON weekly_menus(hostel_code, hostel_number);
CREATE INDEX IF NOT EXISTS idx_weekly_menus_created_by ON weekly_menus(created_by);

ALTER TABLE weekly_menus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read to all" ON weekly_menus;
CREATE POLICY "Allow read to all"
ON weekly_menus
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can modify menus" ON weekly_menus;
CREATE POLICY "Admins can modify menus"
ON weekly_menus
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.uid()));

-- ADMINS TABLE
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helper: Add an admin
-- INSERT INTO admins(id) VALUES ('00000000-0000-0000-0000-000000000000');
-- Helper: List admins
-- SELECT * FROM admins;
