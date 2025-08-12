import React, { useState, useEffect } from 'react';
import { Calendar, User, ArrowRight, Menu, X, ArrowLeft } from 'lucide-react';
import { Button } from './Button';
import MenuCards from './MenuCards';
import CalendarView from './CalendarView';
import Profile from './Profile';
import { getMenuForDate, getNextMeal, getCurrentMeal, getCurrentSeason, getUserHostel, isFallbackMenu } from '../utils/menuUtils';
import { getUserProfile, User as UserType } from '../utils/supabase';

interface DashboardProps {
  user: any;
  onLogout: () => void;
  onUpdateUser: (userData: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onUpdateUser }) => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'calendar' | 'profile'>('dashboard');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentMenu, setCurrentMenu] = useState<any>(null);
  const [nextMeal, setNextMeal] = useState<any>(null);
  const [currentMeal, setCurrentMeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserType | null>(null);

  // Get user's hostel and current season
  const userHostel = user?.hostel || 'BH1'; // Fallback to BH1 if no hostel info
  const currentSeason = getCurrentSeason();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Fetch user profile from Supabase
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        try {
          const profile = await getUserProfile(user.id);
          setUserProfile(profile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };

    fetchUserProfile();
  }, [user?.id]);

  // Fetch menu data when component mounts or user changes
  useEffect(() => {
    const fetchMenuData = async () => {
      setLoading(true);
      try {
        console.log('🔍 Fetching menu data for:', {
          selectedDate: selectedDate.toDateString(),
          userHostel,
          currentSeason,
          currentTime: currentTime.toLocaleTimeString()
        });

        const [menuData, nextMealData] = await Promise.all([
          getMenuForDate(selectedDate, userHostel, currentSeason),
          getNextMeal(userHostel, currentSeason)
        ]);

        console.log('📊 Menu data received:', {
          menuData: menuData ? '✅ Success' : '❌ Failed',
          nextMealData: nextMealData ? '✅ Success' : '❌ Failed',
          menuDataKeys: menuData ? Object.keys(menuData) : 'No data',
          nextMealType: nextMealData?.type,
          nextMealItems: nextMealData?.items?.length || 0,
          isMenuFallback: menuData ? isFallbackMenu(menuData) : 'No data',
          isNextMealFallback: nextMealData ? isFallbackMenu({ breakfast: nextMealData.items, lunch: [], snacks: [], dinner: [] }) : 'No data'
        });

        setCurrentMenu(menuData);
        setNextMeal(nextMealData);
        
        // Get current meal data
        const currentMealInfo = getCurrentMeal();
        console.log('🕐 Current meal info:', currentMealInfo);

        if (currentMealInfo && menuData) {
          const mealItems = menuData[currentMealInfo.key as keyof typeof menuData];
          console.log('🍽️ Current meal items:', {
            mealKey: currentMealInfo.key,
            hasItems: !!mealItems,
            itemCount: mealItems?.length || 0,
            items: mealItems
          });

          if (mealItems) {
            setCurrentMeal({
              type: currentMealInfo.type,
              items: mealItems,
              key: currentMealInfo.key
            });
          } else {
            setCurrentMeal(null);
          }
        } else {
          setCurrentMeal(null);
        }
      } catch (error) {
        console.error('❌ Error fetching menu data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuData();
  }, [selectedDate, userHostel, currentSeason, currentTime]);

  const renderHeader = () => {
    switch (currentView) {
      case 'profile':
        return (
          <div className="bg-gradient-primary p-4 md:p-6 rounded-t-3xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <Button
                onClick={() => setCurrentView('dashboard')}
                variant="glass"
                size="icon"
                className="rounded-full backdrop-blur-custom"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </Button>
              <h1 className="text-xl md:text-2xl font-bold text-white">Profile</h1>
              <div className="w-10" />
            </div>
          </div>
        );
      case 'calendar':
        return (
          <div className="bg-gradient-primary p-4 md:p-6 rounded-t-3xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <Button
                onClick={() => setCurrentView('dashboard')}
                variant="glass"
                size="icon"
                className="rounded-full backdrop-blur-custom"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </Button>
              <h1 className="text-xl md:text-2xl font-bold text-white">Menu Calendar</h1>
              <div className="w-10" />
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-gradient-primary p-4 md:p-6 rounded-t-3xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 md:w-12 md:h-12 glass-card rounded-full flex items-center justify-center border border-white/20">
                  <User className="w-4 h-4 md:w-5 md:w-5 text-white" />
                </div>
                <span className="text-white font-medium text-sm md:text-base">{user.name}</span>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-4">
                <Button
                  onClick={() => setCurrentView('calendar')}
                  variant="glass"
                  className="backdrop-blur-custom border-white/30 text-white hover:bg-white/20"
                >
                  <Calendar className="w-4 h-4 mr-2 text-white" />
                  <span>Calendar Menu</span>
                </Button>
                <Button
                  onClick={() => setCurrentView('profile')}
                  variant="glass"
                  className="backdrop-blur-custom border-white/30 text-white hover:bg-white/20"
                >
                  <User className="w-4 h-4 mr-2 text-white" />
                  <span>Profile</span>
                </Button>
                <Button
                  onClick={onLogout}
                  variant="secondary"
                  size="sm"
                >
                  Logout
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <Button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                variant="glass"
                size="icon"
                className="w-8 h-8 md:w-10 md:h-10 rounded-full backdrop-blur-custom md:hidden"
              >
                <div className="relative w-5 h-5">
                  <div className={`absolute inset-0 transition-all duration-300 ${
                    isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
                  }`}>
                    <Menu className="w-5 h-5 text-white" />
                  </div>
                  <div className={`absolute inset-0 transition-all duration-300 ${
                    isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
                  }`}>
                    <X className="w-5 h-5 text-white" />
                  </div>
                </div>
              </Button>
            </div>
            
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2">
              Hello, {user.name.split(' ')[0]}
            </h1>
            <p className="text-white/80 mb-4 md:mb-6 text-sm md:text-base">
              Welcome back! Here's what's cooking today. Let's help you plan your meals better.
            </p>
            
            {/* Mobile Calendar Button */}
            <Button
              onClick={() => setCurrentView('calendar')}
              variant="glass"
              className="backdrop-blur-custom border-white/30 text-white hover:bg-white/20 md:hidden"
            >
              <Calendar className="w-4 h-4 text-white" />
              <span>Calendar Menu</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </Button>
          </div>
        );
    }
  };

  const renderMobileMenu = () => {
    if (!isMobileMenuOpen) return null;
    
    return (
      <div className="fixed inset-0 z-50 md:hidden">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
        <div className="absolute right-0 top-0 h-full w-80 bg-dark-900 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Menu</h3>
            <Button
              onClick={() => setIsMobileMenuOpen(false)}
              variant="ghost"
              size="icon"
            >
              <X className="w-5 h-5 text-white" />
            </Button>
          </div>
          <div className="space-y-4">
            <Button
              onClick={() => {
                setCurrentView('dashboard');
                setIsMobileMenuOpen(false);
              }}
              variant="ghost"
              className="w-full justify-start"
            >
              <Calendar className="w-5 h-5 mr-3 text-white" />
              Dashboard
            </Button>
            <Button
              onClick={() => {
                setCurrentView('calendar');
                setIsMobileMenuOpen(false);
              }}
              variant="ghost"
              className="w-full justify-start"
            >
              <Calendar className="w-5 h-5 mr-3 text-white" />
              Calendar
            </Button>
            <Button
              onClick={() => {
                setCurrentView('profile');
                setIsMobileMenuOpen(false);
              }}
              variant="ghost"
              className="w-full justify-start"
            >
              <User className="w-5 h-5 mr-3 text-white" />
              Profile
            </Button>
            <div className="pt-4 border-t border-white/10">
              <Button
                onClick={() => {
                  onLogout();
                  setIsMobileMenuOpen(false);
                }}
                variant="secondary"
                className="w-full"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (currentView === 'profile') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 relative overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-primary opacity-10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-gradient-secondary opacity-10 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        
        {/* Responsive Container for Profile */}
        <div className="max-w-6xl mx-auto">
          {/* Web Layout */}
          <div className="hidden md:block">
            <div className="glass-card min-h-screen border border-white/10">
              {renderHeader()}
              <Profile user={user} onLogout={onLogout} onUpdateUser={onUpdateUser} />
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden">
            <div className="max-w-md mx-auto glass-card min-h-screen border-x border-white/10">
              {renderHeader()}
              <Profile user={user} onLogout={onLogout} onUpdateUser={onUpdateUser} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'calendar') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 relative overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-primary opacity-10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-gradient-secondary opacity-10 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        
        {/* Responsive Container for Calendar */}
        <div className="max-w-6xl mx-auto">
          {/* Web Layout */}
          <div className="hidden md:block">
            <div className="glass-card min-h-screen border border-white/10">
              {renderHeader()}
              <CalendarView
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                user={user}
              />
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden">
            <div className="max-w-md mx-auto glass-card min-h-screen border-x border-white/10">
              {renderHeader()}
              <CalendarView
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                user={user}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-primary opacity-10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-gradient-secondary opacity-10 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-accent opacity-5 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
      
      {/* Responsive Container */}
      <div className="max-w-6xl mx-auto">
        {/* Web Layout */}
        <div className="hidden md:block">
          <div className="glass-card min-h-screen border border-white/10">
            {renderHeader()}
            
            <div className="p-6 space-y-6">
              {/* Meal Status Section - Shows Current Meal if serving, otherwise Next Meal */}
              {loading ? (
                <div className="glass-card rounded-3xl p-6 shadow-glass border border-white/20">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-gradient-primary rounded-full animate-pulse-slow"></div>
                    <h2 className="text-lg font-semibold gradient-text">Meal Status</h2>
                  </div>
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </div>
              ) : currentMeal ? (
                <div className="glass-card rounded-3xl p-6 shadow-glass border border-white/20 transition-all duration-300 hover:glass-card-hover">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gradient-primary rounded-full animate-pulse-slow"></div>
                      <h2 className="text-lg font-semibold gradient-text">Current Meal</h2>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isFallbackMenu(currentMenu) 
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                        : 'bg-green-500/20 text-green-300 border border-green-500/30'
                    }`}>
                      {isFallbackMenu(currentMenu) ? 'Sample Data' : 'Live Data'}
                    </div>
                  </div>
                  <p className="text-white/70 text-sm mb-4">
                    The meal currently being served.
                  </p>
                  
                  <div className="glass-card rounded-2xl p-4 border border-white/10">
                    <h3 className="gradient-text font-semibold text-lg mb-2">
                      {currentMeal.type}
                    </h3>
                    <ul className="space-y-1">
                      {currentMeal.items.map((item: string, index: number) => (
                        <li key={index} className="flex items-center text-white/90">
                          <div className="w-1.5 h-1.5 bg-gradient-primary rounded-full mr-2"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : nextMeal ? (
                <div className="glass-card rounded-3xl p-6 shadow-glass border border-white/20 transition-all duration-300 hover:glass-card-hover">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gradient-primary rounded-full animate-pulse-slow"></div>
                      <h2 className="text-lg font-semibold gradient-text">Next Meal</h2>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isFallbackMenu(currentMenu) 
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                        : 'bg-green-500/20 text-green-300 border border-green-500/30'
                    }`}>
                      {isFallbackMenu(currentMenu) ? 'Sample Data' : 'Live Data'}
                    </div>
                  </div>
                  <p className="text-white/70 text-sm mb-4">
                    Your upcoming meal in the mess. Plan ahead and enjoy!
                  </p>
                  
                  <div className="glass-card rounded-2xl p-4 border border-white/10">
                    <h3 className="gradient-text font-semibold text-lg mb-2">
                      {nextMeal.type}
                    </h3>
                    <ul className="space-y-1">
                      {nextMeal.items.map((item: string, index: number) => (
                        <li key={index} className="flex items-center text-white/90">
                          <div className="w-1.5 h-1.5 bg-gradient-primary rounded-full mr-2"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              {/* Current Menu */}
              <MenuCards 
                menu={currentMenu} 
                user={user}
                isToday={selectedDate.toDateString() === new Date().toDateString()}
                currentTime={currentTime}
              />
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          <div className="max-w-md mx-auto glass-card min-h-screen border-x border-white/10">
            {renderHeader()}
            
            <div className="p-4 space-y-6">
              {/* Meal Status Section - Shows Current Meal if serving, otherwise Next Meal */}
              {loading ? (
                <div className="glass-card rounded-3xl p-4 md:p-6 shadow-glass border border-white/20">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-gradient-primary rounded-full animate-pulse-slow"></div>
                    <h2 className="text-lg font-semibold gradient-text">Meal Status</h2>
                  </div>
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </div>
              ) : currentMeal ? (
                <div className="glass-card rounded-3xl p-4 md:p-6 shadow-glass border border-white/20 transition-all duration-300 hover:glass-card-hover">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gradient-primary rounded-full animate-pulse-slow"></div>
                      <h2 className="text-lg font-semibold gradient-text">Current Meal</h2>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isFallbackMenu(currentMenu) 
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                        : 'bg-green-500/20 text-green-300 border border-green-500/30'
                    }`}>
                      {isFallbackMenu(currentMenu) ? 'Sample Data' : 'Live Data'}
                    </div>
                  </div>
                  <p className="text-white/70 text-sm mb-4">
                    The meal currently being served.
                  </p>
                  
                  <div className="glass-card rounded-2xl p-4 border border-white/10">
                    <h3 className="gradient-text font-semibold text-lg mb-2">
                      {currentMeal.type}
                    </h3>
                    <ul className="space-y-1">
                      {currentMeal.items.map((item: string, index: number) => (
                        <li key={index} className="flex items-center text-white/90">
                          <div className="w-1.5 h-1.5 bg-gradient-primary rounded-full mr-2"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : nextMeal ? (
                <div className="glass-card rounded-3xl p-4 md:p-6 shadow-glass border border-white/20 transition-all duration-300 hover:glass-card-hover">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gradient-primary rounded-full animate-pulse-slow"></div>
                      <h2 className="text-lg font-semibold gradient-text">Next Meal</h2>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isFallbackMenu(currentMenu) 
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                        : 'bg-green-500/20 text-green-300 border border-green-500/30'
                    }`}>
                      {isFallbackMenu(currentMenu) ? 'Sample Data' : 'Live Data'}
                    </div>
                  </div>
                  <p className="text-white/70 text-sm mb-4">
                    Your upcoming meal in the mess. Plan ahead and enjoy!
                  </p>
                  
                  <div className="glass-card rounded-2xl p-4 border border-white/10">
                    <h3 className="gradient-text font-semibold text-lg mb-2">
                      {nextMeal.type}
                    </h3>
                    <ul className="space-y-1">
                      {nextMeal.items.map((item: string, index: number) => (
                        <li key={index} className="flex items-center text-white/90">
                          <div className="w-1.5 h-1.5 bg-gradient-primary rounded-full mr-2"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              {/* Current Menu */}
              <MenuCards 
                menu={currentMenu} 
                user={user}
                isToday={selectedDate.toDateString() === new Date().toDateString()}
                currentTime={currentTime}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {renderMobileMenu()}
    </div>
  );
};

export default Dashboard;