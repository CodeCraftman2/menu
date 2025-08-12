import json
import os
import requests
from typing import Dict, List
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

def delete_existing_menus(hostel: str, season: str) -> int:
    """Delete existing menus for specific hostel and season"""
    try:
        url = f"{SUPABASE_URL}/rest/v1/weekly_menus"
        params = {
            "hostel": f"eq.{hostel}",
            "season": f"eq.{season}"
        }
        
        response = requests.delete(url, headers=headers, params=params)
        
        if response.status_code == 200:
            return len(response.json()) if response.json() else 0
        else:
            print(f"⚠️ Error deleting documents: {response.status_code} - {response.text}")
            return 0
    except Exception as e:
        print(f"⚠️ Error deleting documents: {e}")
        return 0

def upload_week_data(week_data: Dict, hostel: str, season: str) -> bool:
    """Upload a single week's data"""
    try:
        data = {
            "hostel": hostel,
            "season": season,
            "week": week_data["week"],
            "days_data": week_data["days"],
            "campus": "boys" if hostel.startswith("BH") else "girls"
        }
        
        url = f"{SUPABASE_URL}/rest/v1/weekly_menus"
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code == 201:
            print(f"✓ Uploaded {hostel} ({season}) Week {week_data['week']}")
            return True
        else:
            print(f"✗ Failed {hostel} Week {week_data['week']}: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"✗ Failed {hostel} Week {week_data['week']}: {e}")
        return False

def process_menu_file(file_path: str) -> int:
    """Process a single menu JSON file"""
    filename = os.path.basename(file_path)
    season = "summer" if filename.startswith("S-") else "winter"
    hostel_prefix = "BH" if "BH" in filename else "LH"
    hostel_count = 12 if "BH" in filename else 4
    
    hostels = [f"{hostel_prefix}{i}" for i in range(1, hostel_count + 1)]
    
    print(f"\nProcessing: {filename} ({season}, {len(hostels)} hostels)")
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            menu_data = json.load(f)
        
        success_count = 0
        for hostel in hostels:
            deleted = delete_existing_menus(hostel, season)
            print(f"🗑️ Deleted {deleted} records for {hostel} ({season})")
            
            for week_data in menu_data["weeks"]:
                if upload_week_data(week_data, hostel, season):
                    success_count += 1
        
        return success_count
    except json.JSONDecodeError as e:
        print(f"🔥 JSON decode error in {filename}: {str(e)}")
        return 0
    except Exception as e:
        print(f"🔥 Unexpected error processing {filename}: {str(e)}")
        return 0

def main():
    print("=== ITER Hostel Menu Uploader (Supabase) ===")
    
    # Check connection
    try:
        url = f"{SUPABASE_URL}/rest/v1/weekly_menus?select=*&limit=1"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            print("✅ Connected to Supabase successfully")
        else:
            print(f"❌ Supabase connection failed: {response.status_code} - {response.text}")
            print("\nTroubleshooting:")
            print("1. Verify SUPABASE_URL and SUPABASE_KEY are correct")
            print("2. Ensure you created the 'weekly_menus' table")
            print("3. Check your internet connection")
            return
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        print("\nTroubleshooting:")
        print("1. Verify SUPABASE_URL and SUPABASE_KEY are correct")
        print("2. Ensure you created the 'weekly_menus' table")
        print("3. Check your internet connection")
        return
    
    menu_files = [
        "S-BH 1-12.json",
        "S-LH 1-4.json", 
        "W-BH 1-12.json",
        "W-LH 1-4.json"
    ]
    
    existing_files = [f for f in menu_files if os.path.exists(f)]
    
    if not existing_files:
        print("❌ No menu files found in current directory")
        print("Expected files:", *menu_files, sep="\n- ")
        return
    
    total_weeks = 0
    for file_path in existing_files:
        weeks_uploaded = process_menu_file(file_path)
        total_weeks += weeks_uploaded
        print(f"Uploaded {weeks_uploaded} weeks from {os.path.basename(file_path)}")
    
    print(f"\n✅ Done! Uploaded {total_weeks} week records total")

if __name__ == "__main__":
    main()