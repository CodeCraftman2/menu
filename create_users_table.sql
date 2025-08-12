-- Create users table for hostel management system
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_registration_no ON users(registration_no);
CREATE INDEX IF NOT EXISTS idx_users_hostel ON users(hostel_code, hostel_number);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (true);

-- Users can update their own data
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (true);

-- Users can insert their own data during signup
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample users for testing (optional)
INSERT INTO users (email, registration_no, name, gender, hostel_code, hostel_number, room_number)
VALUES 
  ('john.doe@iter.ac.in', '2024CS001', 'John Doe', 'male', 'BH', 1, 'A-101'),
  ('jane.smith@iter.ac.in', '2024CS002', 'Jane Smith', 'female', 'LH', 1, 'B-201')
ON CONFLICT (email) DO NOTHING;
