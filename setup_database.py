import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://goecucoqhsedhilvwxeg.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvZWN1Y29xaHNlZGhpbHZ3eGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NjQ0MzIsImV4cCI6MjA3MDU0MDQzMn0.CYT8U5phPd7wA4qo5wUQsbxpvWju2fnMAXKdZSWiyTw")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL and SUPABASE_KEY must be set in environment variables")
    print("Create a .env file with:")
    print("SUPABASE_URL=your_supabase_url")
    print("SUPABASE_KEY=your_supabase_key")
    exit(1)

# Supabase API headers
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def setup_users_table():
    """Set up the users table with proper structure and policies"""
    print("=== Setting up Users Table ===")
    
    # SQL commands to create the table and policies
    sql_commands = [
        # Create users table
        """
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
        """,
        
        # Create indexes
        """
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_registration_no ON users(registration_no);
        CREATE INDEX IF NOT EXISTS idx_users_hostel ON users(hostel_code, hostel_number);
        """,
        
        # Enable RLS
        """
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        """,
        
        # Create RLS policies
        """
        DROP POLICY IF EXISTS "Users can view own profile" ON users;
        CREATE POLICY "Users can view own profile" ON users
          FOR SELECT USING (auth.uid() = id);
        """,
        
        """
        DROP POLICY IF EXISTS "Users can update own profile" ON users;
        CREATE POLICY "Users can update own profile" ON users
          FOR UPDATE USING (auth.uid() = id);
        """,
        
        """
        DROP POLICY IF EXISTS "Users can insert own profile" ON users;
        CREATE POLICY "Users can insert own profile" ON users
          FOR INSERT WITH CHECK (auth.uid() = id);
        """,
        
        # Create function for updated_at
        """
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
        """,
        
        # Create trigger
        """
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
        CREATE TRIGGER update_users_updated_at 
          BEFORE UPDATE ON users 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """
    ]
    
    # Execute SQL commands
    for i, sql in enumerate(sql_commands, 1):
        try:
            url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
            response = requests.post(url, headers=headers, json={"sql": sql})
            
            if response.status_code == 200:
                print(f"✅ Command {i} executed successfully")
            else:
                print(f"⚠️ Command {i} status: {response.status_code}")
                if response.text:
                    print(f"   Response: {response.text}")
        except Exception as e:
            print(f"❌ Command {i} failed: {e}")
    
    print("\n=== Users Table Setup Complete ===")

def test_users_table():
    """Test if the users table is working correctly"""
    print("\n=== Testing Users Table ===")
    
    try:
        # Test table access
        url = f"{SUPABASE_URL}/rest/v1/users?select=*&limit=1"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            print("✅ Users table is accessible")
            data = response.json()
            print(f"   Current records: {len(data)}")
            
            if data:
                print("   Sample record structure:")
                for key, value in data[0].items():
                    print(f"     {key}: {type(value).__name__}")
        else:
            print(f"❌ Users table test failed: {response.status_code}")
            if response.text:
                print(f"   Response: {response.text}")
                
    except Exception as e:
        print(f"❌ Users table test error: {e}")

def main():
    print("=== ITER Hostel Database Setup ===")
    
    # Check connection
    try:
        url = f"{SUPABASE_URL}/rest/v1/"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            print("✅ Connected to Supabase successfully")
        else:
            print(f"❌ Supabase connection failed: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return
    
    # Set up users table
    setup_users_table()
    
    # Test the table
    test_users_table()
    
    print("\n=== Setup Complete! ===")
    print("You can now:")
    print("1. Run the React app to test user signup")
    print("2. Users will be able to create profiles with hostel information")
    print("3. The app will show personalized menus based on user's hostel")

if __name__ == "__main__":
    main()
