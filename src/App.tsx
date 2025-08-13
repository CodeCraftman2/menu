import React, { useState, useEffect } from 'react';
import AuthForm from './components/AuthForm';
import Dashboard from './components/Dashboard';
import AdminPage from './components/AdminPage';
import { initializeNotifications } from './utils/notificationUtils';
import { supabase } from './utils/supabase';
import './index.css';

function App() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Only restore saved user if there is an active Supabase session
      try {
        const savedUser = localStorage.getItem('ccodeUser');
        const { data: sessionData } = await supabase.auth.getSession();
        const hasSession = !!sessionData.session;

        if (savedUser && hasSession) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          if (userData.preferences?.notifications) {
            await initializeNotifications(userData.preferences.notifications);
          }
        } else if (savedUser && !hasSession) {
          // Clear stale local user if no Supabase session
          localStorage.removeItem('ccodeUser');
        }
      } catch (error) {
        console.error('Startup auth init error:', error);
        localStorage.removeItem('ccodeUser');
      } finally {
        setIsLoading(false);
      }
    };
    void init();
  }, []);

  const handleLogin = async (userData: any) => {
    setUser(userData);
    localStorage.setItem('ccodeUser', JSON.stringify(userData));
    
    // Initialize notifications for new user
    if (userData.preferences?.notifications) {
      await initializeNotifications(userData.preferences.notifications);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut failed or was unnecessary:', e);
    }
    setUser(null);
    localStorage.removeItem('ccodeUser');
    // Notifications will be automatically cleared when the app unmounts
  };

  const handleUpdateUser = async (userData: any) => {
    setUser(userData);
    localStorage.setItem('ccodeUser', JSON.stringify(userData));
    
    // Re-initialize notifications with updated preferences
    if (userData.preferences?.notifications) {
      await initializeNotifications(userData.preferences.notifications);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80 font-manrope text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 font-manrope relative">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-primary opacity-10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-gradient-secondary opacity-10 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-accent opacity-5 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen">
        {user ? (
          user.role === 'admin' ? (
            <AdminPage user={user} onLogout={handleLogout} />
          ) : (
            <Dashboard 
              user={user} 
              onLogout={handleLogout} 
              onUpdateUser={handleUpdateUser} 
            />
          )
        ) : (
          <div className="min-h-screen flex items-center justify-center container-responsive">
            <div className="w-full max-w-md">
              <AuthForm onLogin={handleLogin} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;