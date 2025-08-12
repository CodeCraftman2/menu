import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Search } from 'lucide-react';
import { Button } from './Button';
import { getMenuForDate, getCurrentSeason, getUserHostel, isFallbackMenu } from '../utils/menuUtils';

interface CalendarViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  user: any;
}

const CalendarView: React.FC<CalendarViewProps> = ({ selectedDate, onDateSelect, user }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchDate, setSearchDate] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Get user's hostel and current season
  const userHostel = getUserHostel(user);
  const currentSeason = getCurrentSeason();

  // Fetch menu data when selected date changes
  useEffect(() => {
    const fetchMenuData = async () => {
      setLoading(true);
      try {
        console.log('📅 Calendar fetching menu for:', {
          date: selectedDate.toDateString(),
          userHostel,
          currentSeason
        });

        const menuData = await getMenuForDate(selectedDate, userHostel, currentSeason);
        
        console.log('📅 Calendar menu data received:', {
          hasMenu: !!menuData,
          isFallback: menuData ? isFallbackMenu(menuData) : 'No data',
          source: menuData && isFallbackMenu(menuData) ? '❌ FALLBACK DATA' : '✅ SUPABASE DATA'
        });

        setSelectedMenu(menuData);
      } catch (error) {
        console.error('❌ Error fetching calendar menu:', error);
        setSelectedMenu(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuData();
  }, [selectedDate, userHostel, currentSeason]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() - 1);
      return newMonth;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + 1);
      return newMonth;
    });
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onDateSelect(today);
  };

  const handleDateSearch = () => {
    if (!searchDate) return;
    
    const parsedDate = new Date(searchDate);
    if (isNaN(parsedDate.getTime())) {
      alert('Please enter a valid date');
      return;
    }
    
    setCurrentMonth(parsedDate);
    onDateSelect(parsedDate);
    setSearchDate('');
    setShowSearch(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDateSearch();
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Calendar Header */}
      <div className="glass-card rounded-3xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold gradient-text flex items-center">
            <CalendarIcon className="w-6 h-6 md:w-7 md:h-7 mr-2 text-white" />
            {formatMonthYear(currentMonth)}
          </h2>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowSearch(!showSearch)}
              variant="glass"
              size="icon"
              className="w-8 h-8 md:w-10 md:h-10 rounded-full backdrop-blur-custom"
            >
              <Search className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </Button>
            <Button
              onClick={goToToday}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Today
            </Button>
          </div>
        </div>
        
        {/* Date Search */}
        {showSearch && (
          <div className="mb-4 p-4 glass-card rounded-2xl border border-white/10">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-4 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
                  placeholder="Select a date..."
                />
              </div>
              <Button
                onClick={handleDateSearch}
                variant="primary"
                size="sm"
                className="px-4 py-3"
              >
                Go
              </Button>
            </div>
            <p className="text-white/60 text-xs mt-2">
              Enter a date to quickly navigate to that day's menu
            </p>
          </div>
        )}
        
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={goToPreviousMonth}
            variant="ghost"
            size="icon"
            className="w-10 h-10 md:w-12 md:h-12 rounded-full"
          >
                          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </Button>
          
          <span className="text-white/70 font-medium text-base md:text-lg">
            {formatMonthYear(currentMonth)}
          </span>
          
          <Button
            onClick={goToNextMonth}
            variant="ghost"
            size="icon"
            className="w-10 h-10 md:w-12 md:h-12 rounded-full"
          >
                          <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </Button>
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 md:gap-3">
          {/* Day Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="h-8 md:h-10 flex items-center justify-center">
              <span className="text-xs md:text-sm font-medium text-white/60">{day}</span>
            </div>
          ))}
          
          {/* Calendar Days */}
          {days.map((date, index) => {
            if (!date) {
              return <div key={index} className="h-12 md:h-16 lg:h-20" />;
            }

            return (
              <div
                key={index}
                onClick={() => onDateSelect(date)}
                className={`h-12 md:h-16 lg:h-20 rounded-2xl transition-all duration-300 cursor-pointer flex flex-col items-center justify-center ${
                  isToday(date)
                    ? 'bg-gradient-primary text-white shadow-glow animate-pulse-slow'
                    : isSelected(date)
                    ? 'bg-primary-500/20 border-2 border-primary-500 text-white'
                    : isCurrentMonth(date)
                    ? 'glass-card text-white hover:bg-white/10 border border-white/10'
                    : 'text-white/30'
                }`}
              >
                <div className={`text-sm md:text-base lg:text-lg font-bold ${
                  isToday(date) ? 'text-white' : 'text-white'
                }`}>
                  {date.getDate()}
                </div>
                
                {/* Show if it's today */}
                {isToday(date) && (
                  <div className="text-xs text-white/90 mt-1">
                    Today
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Menu */}
      {loading ? (
        <div className="glass-card rounded-3xl p-4 md:p-6">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-white">Loading menu...</span>
          </div>
        </div>
      ) : selectedMenu ? (
        <div className="glass-card rounded-3xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-lg md:text-xl font-semibold gradient-text">
              Menu for {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              isFallbackMenu(selectedMenu) 
                ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                : 'bg-green-500/20 text-green-300 border border-green-500/30'
            }`}>
              {isFallbackMenu(selectedMenu) ? 'Sample Data' : 'Live Data'}
            </div>
          </div>
          
          <div className="space-y-4 md:space-y-6">
            {Object.entries(selectedMenu).map(([mealType, items]) => (
              <div key={mealType} className="glass-card rounded-2xl p-4 md:p-6 border border-white/10">
                <h4 className="text-base md:text-lg font-semibold text-white mb-3 capitalize">
                  {mealType}
                </h4>
                <ul className="space-y-2 md:space-y-3">
                  {Array.isArray(items) && items.map((item, index) => (
                    <li key={index} className="flex items-center text-white/90 text-sm md:text-base">
                      <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-gradient-primary rounded-full mr-3"></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-6 text-center">
          <div className="text-6xl mb-4"></div>
          <h3 className="text-lg md:text-xl font-semibold text-white mb-2">No Menu Available</h3>
          <p className="text-white/70 text-sm md:text-base">
            No menu is available for the selected date. Please select another date.
          </p>
        </div>
      )}
    </div>
  );
};

export default CalendarView;