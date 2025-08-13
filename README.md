# ITER Hostel Menu Dashboard

A modern React dashboard for ITER hostel students to view their weekly meal menus, built with TypeScript, Tailwind CSS, and Supabase.

## Features

- 🍽️ **Real-time Menu Data**: Fetches menu data from Supabase database
- 👤 **User Management**: Complete user profiles with hostel and room information
- 📅 **Weekly Calendar View**: Navigate between weeks and view daily menus
- 🏠 **Personalized Menus**: Shows menus specific to user's hostel (BH1-12 for boys, LH1-4 for girls)
- 🔔 **Smart Notifications**: Get notified about upcoming meals
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🎨 **Modern UI**: Beautiful glassmorphism design with smooth animations
- ⚡ **Fast Performance**: Built with Vite for optimal development experience

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Supabase JS Client** for database operations

### Backend
- **Supabase** for database and authentication
- **Python** script for menu data upload and database setup

## Setup Instructions

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file in the root directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-supabase-anon-key
```

For the Python scripts, also add:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-role-key
```

### 3. Database Setup

#### **Step 1: Set up the database tables**
Run the following SQL script in your Supabase SQL Editor (Project > SQL):

```bash
# Execute the SQL scripts to create all necessary tables
cat create_weekly_menus_and_admins.sql | supabase sql
cat create_users_table.sql | supabase sql
```

Or manually copy and execute the contents of these files in your Supabase SQL Editor:
- `create_weekly_menus_and_admins.sql` - Creates weekly_menus and admins tables
- `create_users_table.sql` - Creates users table

This will create:
- `users` table for student profiles
- `admins` table for admin users
- `weekly_menus` table for menu data
- Row Level Security (RLS) policies
- Indexes for performance
- Triggers for automatic timestamp updates

#### **Step 2: Create the weekly_menus table**
```sql
CREATE TABLE weekly_menus (
  id BIGSERIAL PRIMARY KEY,
  hostel_code TEXT NOT NULL CHECK (hostel_code IN ('BH', 'LH')),
  hostel_number INTEGER NOT NULL CHECK (hostel_number > 0),
  season TEXT NOT NULL,
  week INTEGER NOT NULL,
  days_data JSONB NOT NULL,
  campus TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- No foreign key to users table
);

-- Create indexes for better performance
CREATE INDEX idx_weekly_menus_hostel_season_week ON weekly_menus(hostel_code, hostel_number, season, week);
CREATE INDEX idx_weekly_menus_campus ON weekly_menus(campus);
```

### 4. Upload Menu Data

Use the Python script to upload your menu data:

```bash
python menu_uploader.py
```

The script expects JSON files in the following format:
- `S-BH 1-12.json` (Summer Boys Hostel)
- `S-LH 1-4.json` (Summer Ladies Hostel)
- `W-BH 1-12.json` (Winter Boys Hostel)
- `W-LH 1-4.json` (Winter Ladies Hostel)

### 4.1 Secure writes with RLS (required for admin uploads)

Run the SQL in create_weekly_menus_and_admins.sql inside Supabase SQL Editor (Project > SQL):
- Creates weekly_menus table
- Creates admins table (list of admin user IDs)
- Enables RLS so only admins can INSERT/UPDATE/DELETE; everyone can SELECT

Then insert your admin user id into admins:
```sql
INSERT INTO admins(id) VALUES ('<your-auth-user-uuid>');
```

Optional: use the Python uploader with a service role key (recommended for automation):
- Set SUPABASE_SERVICE_KEY in your environment. The script prefers it.
- If you don’t have service key, sign in as admin via the UI and use the Admin page to upload.

Uploader authentication options (in order of preference):
- SUPABASE_SERVICE_KEY: bypasses RLS. Easiest for CLI/script uploads.
- SUPABASE_ADMIN_EMAIL + SUPABASE_ADMIN_PASSWORD: the script will sign in to Supabase Auth and use that JWT. Ensure this auth user’s id is present in admins table.
- SUPABASE_KEY: fallback single key (anon or admin). Anon cannot write with RLS on; use only for reads or if you disabled RLS (not recommended).

Example .env for service key:
```
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_KEY=<your-service-role-key>
```

Example .env for admin email/password:
```
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_KEY=<your-anon-key>
SUPABASE_ADMIN_EMAIL=admin@example.com
SUPABASE_ADMIN_PASSWORD=yourStrongPassword
```

Then run:
```
python menu_uploader.py
```

### 4.2 Run Python uploader automatically from Admin UI (local dev)

If you want the Admin page to actually run the Python script when you upload files (instead of the built‑in browser uploader), first install the local server dependencies and start the helper:

```
npm i express multer
npm run dev:admin-uploader
```

Then, in the Admin page, switch the mode to "Python (local)" and upload your JSON files. The UI will send the files to http://localhost:5050, which:
- Saves them in the project root with their filenames (e.g., S-BH 1-12.json),
- Executes: python menu_uploader.py,
- Streams back logs to the Admin UI.

Notes:
- This is only for local development. Do not expose this server publicly.
- Set SUPABASE_SERVICE_KEY in your shell before starting the helper to bypass RLS, or ensure your admin user is present in the admins table if using email/password.

### 5. Run the Application

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
project/
├── src/
│   ├── components/          # React components
│   │   ├── Dashboard.tsx   # Main dashboard view
│   │   ├── MenuCards.tsx   # Menu display component
│   │   ├── CalendarView.tsx # Calendar interface
│   │   ├── Profile.tsx     # User profile
│   │   └── AuthForm.tsx    # Authentication & signup form
│   ├── utils/
│   │   ├── supabase.ts     # Supabase client & API functions
│   │   └── menuUtils.ts    # Menu utility functions
│   └── App.tsx             # Main app component
├── menu_uploader.py        # Python script for menu data upload
├── setup_database.py       # Python script for database setup
├── requirements.txt         # Python dependencies
└── package.json            # Node.js dependencies
```

## Data Format

### **Menu Data Structure**
The menu data should follow this structure:

```json
{
  "weeks": [
    {
      "week": 1,
      "days": {
        "monday": {
          "breakfast": ["Item 1", "Item 2", "Item 3"],
          "lunch": ["Item 1", "Item 2", "Item 3"],
          "snacks": ["Item 1", "Item 2", "Item 3"],
          "dinner": ["Item 1", "Item 2", "Item 3"]
        },
        "tuesday": { ... },
        "wednesday": { ... },
        "thursday": { ... },
        "friday": { ... },
        "saturday": { ... },
        "sunday": { ... }
      }
    }
  ]
}
```

### **User Profile Structure**
Users will provide:
- **Full Name**: Student's complete name
- **Email**: ITER email address
- **Registration Number**: Student registration number
- **Gender**: Male or Female
- **Hostel Type**: BH (Boys Hostel) or LH (Ladies Hostel)
- **Hostel Number**: 1-12 for boys, 1-4 for girls
- **Room Number**: Specific room assignment (e.g., A-101, B-201)

## User Flow

### **1. Sign Up Process**
1. User clicks "Sign Up" on the login form
2. **Single form** collects all information:
   - Basic details: Name, Email, Password, Roll Number
   - Hostel info: Gender, Hostel Type (auto-determined), Hostel Number, Room Number
3. Profile created in Supabase database
4. User automatically logged in and redirected to dashboard

### **2. Personalized Experience**
- **Hostel-specific menus**: Users see menus for their specific hostel
- **Room tracking**: System knows which building and room the user is in
- **Campus awareness**: Automatically detects boys vs. girls hostel
- **Smart defaults**: Hostel type automatically set based on gender selection

### **3. Data Security**
- **Row Level Security (RLS)**: Users can only access their own data
- **Encrypted storage**: All sensitive information is securely stored
- **Privacy protection**: Personal details are not shared between users

## Features

### Dashboard
- View current day's menu for your hostel
- See next upcoming meal
- Quick navigation between weeks
- Real-time updates

### Calendar View
- Monthly calendar interface
- Week-by-week navigation
- Daily menu previews for your hostel

### Profile Management
- View and edit personal information
- Update hostel or room details
- Manage notification preferences
- Account settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue in the GitHub repository.
