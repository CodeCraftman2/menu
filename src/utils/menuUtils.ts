import { fetchMenuForDate, fetchCurrentWeekMenu, DayMenu, WeeklyMenu } from './supabase'

// Default fallback menu in case Supabase data is not available
const fallbackMenu: DayMenu = {
  breakfast: ['POHA WITH PEANUTS', 'BANANA', 'TEA'],
  lunch: ['RICE, CHAPATI, DAL', 'CHICKEN CURRY/VEG CURRY', 'PICKLE', 'PAPAD', 'BUTTERMILK'],
  snacks: ['SAMOSA (2PCS)', 'GREEN CHUTNEY', 'TEA'],
  dinner: ['JEERA RICE', 'RAJMA MASALA/PANEER BUTTER MASALA', 'ROTI', 'SWEET LASSI']
}

// Function to check if menu data is fallback data
export const isFallbackMenu = (menu: DayMenu): boolean => {
  return JSON.stringify(menu) === JSON.stringify(fallbackMenu);
}

export const getMenuForDate = async (date: Date, hostel: string = 'BH1', season: string = 'summer'): Promise<DayMenu> => {
  try {
    const menu = await fetchMenuForDate(date, hostel, season)
    const isFallback = !menu || isFallbackMenu(menu);
    
    console.log('🍽️ getMenuForDate result:', {
      hasMenu: !!menu,
      isFallbackData: isFallback,
      source: isFallback ? '❌ FALLBACK DATA' : '✅ SUPABASE DATA',
      menuKeys: menu ? Object.keys(menu) : 'no data'
    });
    
    return menu || fallbackMenu
  } catch (error) {
    console.error('❌ Error fetching menu for date:', error)
    console.log('🔄 Returning fallback data due to error');
    return fallbackMenu
  }
}

export const getCurrentMeal = () => {
  const now = new Date()
  const currentHour = now.getHours() + now.getMinutes() / 60
  
  if (currentHour >= 7 && currentHour < 9) {
    return { type: 'Breakfast', key: 'breakfast' }
  } else if (currentHour >= 12.5 && currentHour < 14.5) {
    return { type: 'Lunch', key: 'lunch' }
  } else if (currentHour >= 18 && currentHour < 19.75) {
    return { type: 'Snacks', key: 'snacks' }
  } else if (currentHour >= 20.5 && currentHour < 22.25) {
    return { type: 'Dinner', key: 'dinner' }
  }
  
  return null
}

export const getNextMeal = async (hostel: string = 'BH1', season: string = 'summer') => {
  const now = new Date()
  const currentHour = now.getHours() + now.getMinutes() / 60
  
  console.log('🕐 getNextMeal called:', {
    currentHour,
    hostel,
    season,
    time: now.toLocaleTimeString()
  });
  
  try {
    const todayMenu = await getMenuForDate(now, hostel, season)
    
    console.log('📊 Today menu received:', {
      hasMenu: !!todayMenu,
      isFallback: todayMenu === fallbackMenu,
      breakfastItems: todayMenu?.breakfast?.length || 0,
      lunchItems: todayMenu?.lunch?.length || 0,
      snacksItems: todayMenu?.snacks?.length || 0,
      dinnerItems: todayMenu?.dinner?.length || 0
    });
    
    if (currentHour < 7) {
      const result = { type: 'Breakfast', items: todayMenu.breakfast, key: 'breakfast' };
      console.log('🌅 Next meal: Breakfast (before 7 AM)');
      return result;
    } else if (currentHour < 12.5) {
      const result = { type: 'Lunch', items: todayMenu.lunch, key: 'lunch' };
      console.log('🍽️ Next meal: Lunch (before 12:30 PM)');
      return result;
    } else if (currentHour < 18) {
      const result = { type: 'Snacks', items: todayMenu.snacks, key: 'snacks' };
      console.log('🧁 Next meal: Snacks (before 6 PM)');
      return result;
    } else if (currentHour < 20.5) {
      const result = { type: 'Dinner', items: todayMenu.dinner, key: 'dinner' };
      console.log('🌙 Next meal: Dinner (before 8:30 PM)');
      return result;
    } else {
      // Next day's breakfast
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowMenu = await getMenuForDate(tomorrow, hostel, season)
      const result = { type: 'Breakfast', items: tomorrowMenu.breakfast, key: 'breakfast' };
      console.log('🌅 Next meal: Tomorrow Breakfast (after 10:15 PM)');
      return result;
    }
  } catch (error) {
    console.error('❌ Error getting next meal:', error)
    // Return fallback data
    console.log('🔄 Using fallback menu data due to error');
    if (currentHour < 7) {
      return { type: 'Breakfast', items: fallbackMenu.breakfast, key: 'breakfast' }
    } else if (currentHour < 12.5) {
      return { type: 'Lunch', items: fallbackMenu.lunch, key: 'lunch' }
    } else if (currentHour < 18) {
      return { type: 'Snacks', items: fallbackMenu.snacks, key: 'snacks' }
    } else if (currentHour < 20.5) {
      return { type: 'Dinner', items: fallbackMenu.dinner, key: 'dinner' }
    } else {
      return { type: 'Breakfast', items: fallbackMenu.breakfast, key: 'breakfast' }
    }
  }
}

export const getMealTimes = () => {
  return [
    { name: 'Breakfast', start: '7:00 AM', end: '9:00 AM' },
    { name: 'Lunch', start: '12:30 PM', end: '2:30 PM' },
    { name: 'Snacks', start: '6:00 PM', end: '7:45 PM' },
    { name: 'Dinner', start: '8:30 PM', end: '10:15 PM' }
  ]
}

// Helper function to get current season
export const getCurrentSeason = (): string => {
  const month = new Date().getMonth() + 1
  // Summer: March (3) to August (8), Winter: September (9) to February (2)
  return month >= 3 && month <= 8 ? 'summer' : 'winter'
}

// Helper function to get user's hostel (this should come from user context)
export const getUserHostel = (user: any): string => {
  return user?.hostel || 'BH1'
}