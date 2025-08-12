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

#### **Step 1: Set up the users table**
```bash
python setup_database.py
```

This will create:
- `users` table with proper structure
- Row Level Security (RLS) policies
- Indexes for performance
- Triggers for automatic timestamp updates

#### **Step 2: Create the weekly_menus table**
```sql
CREATE TABLE weekly_menus (
  id BIGSERIAL PRIMARY KEY,
  hostel TEXT NOT NULL,
  season TEXT NOT NULL,
  week INTEGER NOT NULL,
  days_data JSONB NOT NULL,
  campus TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_weekly_menus_hostel_season_week ON weekly_menus(hostel, season, week);
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
