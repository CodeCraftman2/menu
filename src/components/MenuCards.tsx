import React, { useState, useEffect } from 'react';
import { Clock, Bell, BellOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { fetchMenuForDate, DayMenu } from '../utils/supabase';
import { getCurrentSeason, getUserHostel, isFallbackMenu } from '../utils/menuUtils';

interface MenuCardsProps {
  menu: any;
  user: any;
  isToday: boolean;
  currentTime: Date;
}

const MenuCards: React.FC<MenuCardsProps> = ({ menu, user, isToday, currentTime }) => {
  const [notifications, setNotifications] = useState(() => {
    // Load saved notifications from localStorage on component mount
    const savedNotifications = localStorage.getItem('ccodeDashboardNotifications');
    if (savedNotifications) {
      try {
        return JSON.parse(savedNotifications);
      } catch (error) {
        console.error('Error parsing saved dashboard notifications:', error);
      }
    }
    // Fallback to user preferences or default
    return user.preferences?.notifications || {
      global: false,
      breakfast: false,
      lunch: false,
      snacks: false,
      dinner: false
    };
  });

  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = current week, -1 = previous week, 1 = next week
  const [selectedDate, setSelectedDate] = useState(new Date()); // Track which date is selected in week view
  const [selectedDateMenu, setSelectedDateMenu] = useState<DayMenu | null>(null);
  const [loading, setLoading] = useState(false);

  // Get user's hostel and current season
  const userHostel = getUserHostel(user);
  const currentSeason = getCurrentSeason();

  // Sync dashboard notifications with user preferences when they change
  useEffect(() => {
    if (user.preferences?.notifications) {
      // If user has global notifications enabled, sync dashboard state
      if (user.preferences.notifications.global) {
        const syncedNotifications = {
          global: true,
          breakfast: user.preferences.notifications.breakfast || false,
          lunch: user.preferences.notifications.lunch || false,
          snacks: user.preferences.notifications.snacks || false,
          dinner: user.preferences.notifications.dinner || false
        };
        setNotifications(syncedNotifications);
        localStorage.setItem('ccodeDashboardNotifications', JSON.stringify(syncedNotifications));
      }
    }
  }, [user.preferences?.notifications]);

  // Fetch menu for selected date
  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      try {
        const menuData = await fetchMenuForDate(selectedDate, userHostel, currentSeason);
        setSelectedDateMenu(menuData);
      } catch (error) {
        console.error('Error fetching menu for selected date:', error);
        setSelectedDateMenu(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [selectedDate, userHostel, currentSeason]);

  const getWeekDates = (weekOffset: number = 0) => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Monday = 0
    
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday + (weekOffset * 7));
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push(date);
    }
    
    return weekDates;
  };

  // Use the selectedDateMenu from state instead of hardcoded data

  const weekDates = getWeekDates(selectedWeek);

  const goToPreviousWeek = () => {
    setSelectedWeek(prev => prev - 1);
    // Reset selected date to first day of new week
    const newWeekDates = getWeekDates(selectedWeek - 1);
    setSelectedDate(newWeekDates[0]);
  };

  const goToNextWeek = () => {
    setSelectedWeek(prev => prev + 1);
    // Reset selected date to first day of new week
    const newWeekDates = getWeekDates(selectedWeek + 1);
    setSelectedDate(newWeekDates[0]);
  };

  const goToCurrentWeek = () => {
    setSelectedWeek(0);
    setSelectedDate(new Date()); // Reset to today
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const isCurrentWeek = selectedWeek === 0;
    const isSelected = date.toDateString() === selectedDate.toDateString();
    
    return {
      day: date.getDate().toString().padStart(2, '0'),
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      isToday,
      isCurrentWeek,
      isSelected
    };
  };

  // Use the selectedDateMenu from state (already fetched via useEffect)

  // Dashboard notifications are separate from profile notifications
  // These are one-time notifications for immediate use
  const toggleDashboardNotification = async (mealKey: string) => {
    const newNotifications = {
      ...notifications,
      [mealKey]: !notifications[mealKey]
    };
    
    setNotifications(newNotifications);
    
    // Save to localStorage for persistence
    localStorage.setItem('ccodeDashboardNotifications', JSON.stringify(newNotifications));
    
    // For dashboard, show immediate notification if enabling
    if (newNotifications[mealKey] && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      
      if (Notification.permission === 'granted') {
        // Show one-time notification for this meal
        new Notification('CCode Dashboard', {
          body: `Notifications enabled for ${mealKey} in dashboard! This is a one-time setting.`,
          icon: '/vite.svg'
        });
      }
    }
  };

  const getCurrentHour = () => {
    return currentTime.getHours() + currentTime.getMinutes() / 60;
  };

  const isCurrentMeal = (meal: any) => {
    if (!isToday) return false;
    const currentHour = getCurrentHour();
    return currentHour >= meal.timeRange.start && currentHour <= meal.timeRange.end;
  };

  // Create meals array based on selected date menu
  const createMealsFromMenu = (menuData: DayMenu | null) => {
    if (!menuData) {
      // Return fallback meals if no menu data
      return [
        {
          name: 'Breakfast',
          key: 'breakfast',
          emoji: '🥞',
          time: '7:00 - 9:00 AM',
          timeRange: { start: 7, end: 9 },
          gradient: 'from-primary-500 via-primary-600 to-primary-700',
          items: ['Loading...']
        },
        {
          name: 'Lunch',
          key: 'lunch',
          emoji: '🍽️',
          time: '12:30 - 2:30 PM',
          timeRange: { start: 12.5, end: 14.5 },
          gradient: 'from-secondary-500 via-secondary-600 to-secondary-700',
          items: ['Loading...']
        },
        {
          name: 'Snacks',
          key: 'snacks',
          emoji: '🧁',
          time: '6:00 - 7:45 PM',
          timeRange: { start: 18, end: 19.75 },
          gradient: 'from-accent-500 via-accent-600 to-accent-700',
          items: ['Loading...']
        },
        {
          name: 'Dinner',
          key: 'dinner',
          emoji: '🌙',
          time: '8:30 - 10:15 PM',
          timeRange: { start: 20.5, end: 22.25 },
          gradient: 'from-primary-600 via-primary-700 to-primary-800',
          items: ['Loading...']
        }
      ];
    }

    return [
      {
        name: 'Breakfast',
        key: 'breakfast',
        emoji: '🥞',
        time: '7:00 - 9:00 AM',
        timeRange: { start: 7, end: 9 },
        gradient: 'from-primary-500 via-primary-600 to-primary-700',
        items: menuData.breakfast
      },
      {
        name: 'Lunch',
        key: 'lunch',
        emoji: '🍽️',
        time: '12:30 - 2:30 PM',
        timeRange: { start: 12.5, end: 14.5 },
        gradient: 'from-secondary-500 via-secondary-600 to-secondary-700',
        items: menuData.lunch
      },
      {
        name: 'Snacks',
        key: 'snacks',
        emoji: '🧁',
        time: '6:00 - 7:45 PM',
        timeRange: { start: 18, end: 19.75 },
        gradient: 'from-accent-500 via-accent-600 to-accent-700',
        items: menuData.snacks
      },
      {
        name: 'Dinner',
        key: 'dinner',
        emoji: '🌙',
        time: '8:30 - 10:15 PM',
        timeRange: { start: 20.5, end: 22.25 },
        gradient: 'from-primary-600 via-primary-700 to-primary-800',
        items: menuData.dinner
      }
    ];
  };

  const meals = createMealsFromMenu(selectedDateMenu);

  return (
    <div className="space-y-6">
      {/* Week Calendar Section */}
      <div className="glass-card rounded-3xl p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold gradient-text">
              Checkout what's in this week!
            </h2>
            <div className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
              isFallbackMenu(selectedDateMenu) 
                ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                : 'bg-green-500/20 text-green-300 border border-green-500/30'
            }`}>
              {isFallbackMenu(selectedDateMenu) ? 'Sample Data' : 'Live Data'}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={goToPreviousWeek}
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </Button>
            <Button
              onClick={goToCurrentWeek}
              variant="outline"
              size="sm"
              className="text-xs px-3 py-1"
            >
              Today
            </Button>
            <Button
              onClick={goToNextWeek}
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>

        {/* Week Dates with Side Arrows */}
        <div className="relative">
          {/* Left Arrow */}
          <Button
            onClick={goToPreviousWeek}
            variant="glass"
            size="icon"
            className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2 z-10 w-8 h-8 md:w-10 md:h-10 rounded-full backdrop-blur-custom border-white/20"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </Button>

          {/* Right Arrow */}
          <Button
            onClick={goToNextWeek}
            variant="glass"
            size="icon"
            className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2 z-10 w-8 h-8 md:w-10 md:h-10 rounded-full backdrop-blur-custom border-white/20"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </Button>

          {/* Week Dates Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-1 sm:gap-2 md:gap-3 px-8 sm:px-10 md:px-12">
            {weekDates.map((date, index) => {
              const { day, dayName, isToday, isCurrentWeek, isSelected } = formatDate(date);
              
              return (
                <div
                  key={index}
                  className={`flex flex-col items-center p-2 sm:p-3 md:p-4 lg:p-5 rounded-xl sm:rounded-2xl transition-all duration-300 hover:scale-105 cursor-pointer ${
                    isToday
                      ? 'bg-gradient-primary text-white shadow-glow animate-pulse-slow'
                      : isSelected
                      ? 'bg-primary-500/20 border-2 border-primary-500 text-white'
                      : 'glass-card text-white/90 hover:bg-white/10 border border-white/10'
                  }`}
                  onClick={() => {
                    setSelectedDate(date); // Update selected date to show its menu
                  }}
                >
                  <div className={`text-sm sm:text-lg md:text-xl lg:text-2xl font-bold ${isToday ? 'text-white' : 'text-white'}`}>
                    {day}
                  </div>
                  <div className={`text-xs sm:text-xs md:text-sm font-medium ${isToday ? 'text-white/90' : 'text-white/60'}`}>
                    {dayName}
                  </div>
                  
                  {/* Show week info for this date - hidden on small screens */}
                  <div className="mt-1 sm:mt-2 text-center hidden sm:block">
                    <div className="text-xs text-white/50">
                      {isCurrentWeek ? 'This week' : selectedWeek < 0 ? `${Math.abs(selectedWeek)} week${Math.abs(selectedWeek) > 1 ? 's' : ''} ago` : `${selectedWeek} week${selectedWeek > 1 ? 's' : ''} ahead`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Week Navigation Info */}
        <div className="mt-4 text-center">
          <p className="text-white/60 text-sm">
            {selectedWeek === 0 
              ? 'Current Week' 
              : selectedWeek < 0 
                ? `${Math.abs(selectedWeek)} week${Math.abs(selectedWeek) > 1 ? 's' : ''} ago` 
                : `${selectedWeek} week${selectedWeek > 1 ? 's' : ''} ahead`
            }
          </p>
          <p className="text-white/40 text-xs mt-1 hidden sm:block">
            Click on dates to see their menu • Use arrows to navigate between weeks
          </p>
          <p className="text-white/40 text-xs mt-1 sm:hidden">
            Tap dates for menu • Use arrows to navigate
          </p>
          {selectedWeek !== 0 && (
            <p className="text-white/50 text-xs mt-1">
              Viewing: {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          )}
        </div>
      </div>

              {/* Current Menu Section */}
        <div className="glass-card rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold gradient-text">
              Menu for {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })} 🍽️
            </h2>
            <div className="flex items-center space-x-3">
              {loading && (
                <div className="flex items-center space-x-2 text-primary-400">
                  <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Loading...</span>
                </div>
              )}
              <div className="text-white/60 text-sm">
                {selectedWeek === 0 ? 'Current week' : `Date: ${selectedDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}`}
              </div>
            </div>
          </div>

        {/* Meal Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {meals.map((meal) => {
            const isCurrent = isCurrentMeal(meal);
            const hasNotification = notifications[meal.key] || notifications.global;
            
            return (
              <div
                key={meal.key}
                className={`relative glass-card rounded-3xl p-6 transition-all duration-300 hover:glass-card-hover flex flex-col min-h-80 ${
                  isCurrent ? 'ring-2 ring-primary-500 ring-opacity-50 shadow-glow' : ''
                }`}
              >
                {/* Notification Ball Icon */}
                <div className="absolute top-3 left-3">
                  <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    hasNotification
                      ? 'bg-yellow-400 animate-pulse shadow-glow'
                      : 'bg-white/30'
                  }`}></div>
                </div>

                {/* Header Section */}
                <div className="text-center mb-4">
                  <div className="text-3xl mb-2">{meal.emoji}</div>
                  <h3 className="text-lg font-semibold text-white mb-1">{meal.name}</h3>
                  <p className="text-white/60 text-sm">{meal.time}</p>
                </div>

                {/* Menu Items Section - Flexible */}
                <div className="flex-1 space-y-2 mb-4 min-h-0">
                  {meal.items.slice(0, 3).map((item, itemIndex) => (
                    <div key={itemIndex} className="text-white/80 text-sm text-center">
                      {item}
                    </div>
                  ))}
                  {meal.items.length > 3 && (
                    <div className="text-white/60 text-xs text-center">
                      +{meal.items.length - 3} more items
                    </div>
                  )}
                </div>

                {/* Bottom Section - Fixed at bottom */}
                <div className="mt-auto pt-2">
                  <div className="flex items-center justify-between">
                    <Button
                      onClick={() => toggleDashboardNotification(meal.key)}
                      variant={hasNotification ? 'primary' : 'ghost'}
                      size="sm"
                      className="flex-1 mr-2"
                    >
                      {hasNotification ? (
                        <>
                          <Bell className="w-4 h-4 mr-2 text-white" />
                          On
                        </>
                      ) : (
                        <>
                          <BellOff className="w-4 h-4 mr-2 text-white" />
                          Off
                        </>
                      )}
                    </Button>
                    
                    {isCurrent && (
                      <div className="flex items-center text-primary-400 text-sm">
                        <Clock className="w-4 h-4 mr-1 text-white" />
                        <span>Live</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MenuCards;