import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://goecucoqhsedhilvwxeg.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvZWN1Y29xaHNlZGhpbHZ3eGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NjQ0MzIsImV4cCI6MjA3MDU0MDQzMn0.CYT8U5phPd7wA4qo5wUQsbxpvWju2fnMAXKdZSWiyTw'

export const supabase = createClient(supabaseUrl, supabaseKey)

// User interface
export interface User {
  id: string
  email: string
  registration_no: string
  name: string
  gender: 'male' | 'female'
  hostel_code: 'BH' | 'LH'
  hostel_number: number
  room_number: string
  created_at?: string
  updated_at?: string
}

// User signup data interface
export interface UserSignupData {
  email: string
  registration_no: string
  name: string
  gender: 'male' | 'female'
  hostel_code: 'BH' | 'LH'
  hostel_number: number
  room_number: string
}

export interface WeeklyMenu {
  id?: number
  hostel: string
  season: string
  week: number
  days_data: {
    monday: DayMenu
    tuesday: DayMenu
    wednesday: DayMenu
    thursday: DayMenu
    friday: DayMenu
    saturday: DayMenu
    sunday: DayMenu
  }
  campus: string
  created_at?: string
}

export interface DayMenu {
  breakfast: string[]
  lunch: string[]
  snacks: string[]
  dinner: string[]
}

// Admin interface
export interface Admin {
  id?: string
  email: string
  name: string
  created_at?: string
}

// User management functions
export const createUserProfile = async (userData: UserSignupData): Promise<User | null> => {
  try {
    // Require an authenticated user session for profile creation
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user?.id) {
      console.error('No authenticated Supabase user for profile creation');
      return null;
    }
    const authUserId = authData.user.id;

    const payload: any = {
      ...userData,
      id: authUserId,
    };

    // Use upsert to avoid 409 conflicts on repeated registrations
    const { data, error } = await supabase
      .from('users')
      .upsert([payload], { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);

      // If conflict persists, fetch existing record by id/email
      if (error.code === '23505' || error.status === 409) {
        const { data: existingById } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUserId)
          .single();
        if (existingById) return existingById as User;

        const { data: existingByEmail } = await supabase
          .from('users')
          .select('*')
          .eq('email', userData.email)
          .single();
        if (existingByEmail) return existingByEmail as User;
      }

      // Do not fabricate/mock users; enforce real persistence
      return null;
    }

    return data as User;
  } catch (error) {
    console.error('Error creating user profile:', error);
    // Do not fabricate user on error
    return null;
  }
}

export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching user profile:', error)
      // If table doesn't exist, return null (user will need to sign up again)
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        console.log('Users table not found, returning null')
        return null
      }
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

export const updateUserProfile = async (userId: string, updates: Partial<UserSignupData>): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating user profile:', error)
      // If table doesn't exist, return null
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        console.log('Users table not found, cannot update profile')
        return null
      }
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error updating user profile:', error)
    return null
  }
}

export const getUserHostel = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('hostel_code, hostel_number')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching user hostel:', error)
      return null
    }
    
    if (data) {
      return `${data.hostel_code}${data.hostel_number}`
    }
    
    return null
  } catch (error) {
    console.error('Error fetching user hostel:', error)
    return null
  }
}

export const fetchMenuForDate = async (date: Date, hostel: string, season: string): Promise<DayMenu | null> => {
  try {
    // Get the week number for the given date
    const startOfYear = new Date(date.getFullYear(), 0, 1)
    const weekNumber = Math.ceil((((date.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7)
    
    // Get the day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = date.getDay()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[dayOfWeek]
    
    console.log('🔍 Supabase query params:', {
      hostel,
      season,
      weekNumber,
      dayOfWeek,
      dayName,
      date: date.toDateString()
    });

    // First try to get data for the requested week
    let { data, error } = await supabase
      .from('weekly_menus')
      .select('days_data')
      .eq('hostel', hostel)
      .eq('season', season)
      .eq('week', weekNumber)
      .single()
    
    // If no data found for the requested week, try to get data from available weeks
    if (error || !data) {
      console.log('⚠️ No data for week', weekNumber, '- trying to find available data');
      
      // Get any available data for this hostel and season
      const { data: availableData, error: availableError } = await supabase
        .from('weekly_menus')
        .select('days_data')
        .eq('hostel', hostel)
        .eq('season', season)
        .limit(1)
        .single()
      
      if (availableData && !availableError) {
        console.log('✅ Found available data from another week, using it');
        data = availableData;
        error = null;
      } else {
        console.log('❌ No available data found for this hostel and season');
      }
    }
    
    if (error) {
      console.error('❌ Supabase error fetching menu:', error)
      return null
    }
    
    console.log('📊 Supabase response:', {
      hasData: !!data,
      hasDaysData: !!(data && data.days_data),
      dataType: data ? typeof data.days_data : 'no data',
      isArray: data && Array.isArray(data.days_data)
    });
    
    if (data && data.days_data) {
      // Handle the actual data structure: array of 7 day objects
      if (Array.isArray(data.days_data)) {
        // The data is an array where index 0 = Sunday, 1 = Monday, etc.
        const dayIndex = dayOfWeek
        const dayData = data.days_data[dayIndex]
        
        console.log('📅 Day data found:', {
          dayIndex,
          hasDayData: !!dayData,
          dayDataKeys: dayData ? Object.keys(dayData) : 'no data'
        });
        
        if (dayData) {
          // Convert the data format to match our interface
          const result = {
            breakfast: dayData.BREAKFAST ? dayData.BREAKFAST.split(', ') : [],
            lunch: dayData.LUNCH ? dayData.LUNCH.split(', ') : [],
            snacks: dayData.SNACKS ? dayData.SNACKS.split(', ') : [],
            dinner: dayData.DINNER ? dayData.DINNER.split(', ') : []
          };
          
          console.log('✅ Converted menu data:', {
            breakfastItems: result.breakfast.length,
            lunchItems: result.lunch.length,
            snacksItems: result.snacks.length,
            dinnerItems: result.dinner.length
          });
          
          return result;
        }
      }
      
      // Fallback to the expected structure if it exists
      if (data.days_data[dayName as keyof typeof data.days_data]) {
        console.log('🔄 Using fallback data structure');
        return data.days_data[dayName as keyof typeof data.days_data]
      }
    }
    
    console.log('❌ No menu data found, returning null');
    return null
  } catch (error) {
    console.error('❌ Error fetching menu:', error)
    return null
  }
}

export const fetchCurrentWeekMenu = async (hostel: string, season: string): Promise<WeeklyMenu | null> => {
  try {
    const currentDate = new Date()
    const startOfYear = new Date(currentDate.getFullYear(), 0, 1)
    const weekNumber = Math.ceil((((currentDate.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7)
    
    const { data, error } = await supabase
      .from('weekly_menus')
      .select('*')
      .eq('hostel', hostel)
      .eq('season', season)
      .eq('week', weekNumber)
      .single()
    
    if (error) {
      console.error('Error fetching current week menu:', error)
      return null
    }
    
    if (data) {
      // Convert the actual data structure to our expected interface
      if (Array.isArray(data.days_data)) {
        const convertedDaysData = {
          sunday: convertDayData(data.days_data[0]),
          monday: convertDayData(data.days_data[1]),
          tuesday: convertDayData(data.days_data[2]),
          wednesday: convertDayData(data.days_data[3]),
          thursday: convertDayData(data.days_data[4]),
          friday: convertDayData(data.days_data[5]),
          saturday: convertDayData(data.days_data[6])
        }
        
        return {
          ...data,
          days_data: convertedDaysData
        }
      }
      
      return data
    }
    
    return null
  } catch (error) {
    console.error('Error fetching current week menu:', error)
    return null
  }
}

// Helper function to convert the actual data format to our expected format
const convertDayData = (dayData: any): DayMenu => {
  if (!dayData) {
    return { breakfast: [], lunch: [], snacks: [], dinner: [] }
  }
  
  return {
    breakfast: dayData.BREAKFAST ? dayData.BREAKFAST.split(', ') : [],
    lunch: dayData.LUNCH ? dayData.LUNCH.split(', ') : [],
    snacks: dayData.SNACKS ? dayData.SNACKS.split(', ') : [],
    dinner: dayData.DINNER ? dayData.DINNER.split(', ') : []
  }
}

export const createAdminProfile = async (adminData: { email: string, name: string }): Promise<Admin | null> => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .insert([adminData])
      .select()
      .single();

    if (error) {
      console.error('Error creating admin profile:', error);
      
      // Check for specific errors
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        console.error('The admins table does not exist. Please run create_weekly_menus_and_admins.sql');
      } else if (error.code === '42501' || error.message?.includes('permission denied')) {
        console.error('Permission denied. If this is the first admin, ensure the "Bootstrap first admin" policy exists.');
      }
      
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error creating admin profile:', error);
    return null;
  }
}
