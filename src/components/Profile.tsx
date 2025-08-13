import React, { useState, useEffect } from 'react';
import { User, Mail, Settings, Bell, LogOut, Save, Edit3, BellOff, Home } from 'lucide-react';
import { Button } from './Button';
import { 
  scheduleMealNotifications, 
  checkNotificationSupport,
  requestNotificationPermission
} from '../utils/notificationUtils';

interface ProfileProps {
  user: any;
  onLogout: () => void;
  onUpdateUser: (userData: any) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onLogout, onUpdateUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({ ...user });
  const [notificationSupport, setNotificationSupport] = useState({
    supported: false,
    permission: 'default' as NotificationPermission | 'not-supported',
    canRequest: false
  });

  useEffect(() => {
    // Check notification support when component mounts
    const support = checkNotificationSupport();
    setNotificationSupport(support);
  }, []);

  const handleSave = () => {
    onUpdateUser(editedUser);
    setIsEditing(false);
    
    // Schedule notifications based on new preferences
    if (editedUser.preferences?.notifications) {
      scheduleMealNotifications(editedUser.preferences.notifications);
    }
  };

  const handleCancel = () => {
    setEditedUser({ ...user });
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setEditedUser(prev => ({ ...prev, [field]: value }));
  };

  const handleGlobalNotificationToggle = async () => {
    const currentGlobal = editedUser.preferences?.notifications?.global || false;
    const newGlobal = !currentGlobal;
    
    // If enabling global, turn on all meal notifications
    // If disabling global, turn off all meal notifications
    const newNotifications = {
      global: newGlobal,
      breakfast: newGlobal,
      lunch: newGlobal,
      snacks: newGlobal,
      dinner: newGlobal
    };
    
    setEditedUser((prev: any) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        notifications: newNotifications
      }
    }));

    // If enabling notifications, request permission first
    if (newGlobal && notificationSupport.permission === 'default') {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationSupport((prev: any) => ({ ...prev, permission: 'granted', canRequest: false }));
        // Schedule notifications immediately
        scheduleMealNotifications(newNotifications);
      } else {
        // If permission denied, revert the change
        setEditedUser((prev: any) => ({
          ...prev,
          preferences: {
            ...prev.preferences,
            notifications: { ...prev.preferences.notifications, global: false }
          }
        }));
      }
    } else if (newGlobal) {
      // Permission already granted, schedule notifications
      scheduleMealNotifications(newNotifications);
    }
  };

  const handleIndividualNotificationToggle = async (key: string) => {
    const newNotifications = {
      ...editedUser.preferences.notifications,
      [key]: !editedUser.preferences.notifications[key]
    };
    
    // If any individual meal is turned off, turn off global
    // If all individual meals are turned on, turn on global
    const allMealsOn = ['breakfast', 'lunch', 'snacks', 'dinner'].every(
      meal => newNotifications[meal]
    );
    
    newNotifications.global = allMealsOn;
    
    setEditedUser((prev: any) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        notifications: newNotifications
      }
    }));

    // If enabling notifications, check permission
    if (newNotifications[key] && notificationSupport.permission === 'default') {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationSupport((prev: any) => ({ ...prev, permission: 'granted', canRequest: false }));
        // Schedule notifications immediately
        scheduleMealNotifications(newNotifications);
      } else {
        // If permission denied, revert the change
        setEditedUser((prev: any) => ({
          ...prev,
          preferences: {
            ...prev.preferences,
            notifications: { ...prev.preferences.notifications, [key]: false, global: false }
          }
        }));
      }
    } else if (newNotifications[key]) {
      // Permission already granted, schedule notifications
      scheduleMealNotifications(newNotifications);
    }
  };

  const getNotificationStatus = (key: string) => {
    return editedUser.preferences?.notifications?.[key] || false;
  };

  const getGlobalStatus = () => {
    return getNotificationStatus('global');
  };

  const getMealStatus = (mealKey: string) => {
    return getNotificationStatus(mealKey);
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationSupport(prev => ({ ...prev, permission: 'granted', canRequest: false }));
      // Schedule notifications if any are enabled
      if (editedUser.preferences?.notifications) {
        scheduleMealNotifications(editedUser.preferences.notifications);
      }
    }
  };



  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Profile Header */}
      <div className="glass-card rounded-3xl p-6 text-center">
        <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow">
          <User className="w-10 h-10 md:w-12 md:h-12 text-white" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{user.name}</h2>
        <p className="text-white/70 text-sm md:text-base">{user.email}</p>
        {user.rollNumber && (
          <p className="text-white/60 text-sm mt-1">Roll: {user.rollNumber}</p>
        )}
        {user.hostelCode && user.hostelNumber && (
          <p className="text-white/60 text-sm mt-1">{user.hostelCode} {user.hostelNumber}</p>
        )}
        {user.roomNumber && (
          <p className="text-white/60 text-sm mt-1">Room: {user.roomNumber}</p>
        )}
      </div>

      {/* Profile Actions */}
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
                            <Settings className="w-5 h-5 mr-2 text-white" />
            Profile Settings
          </h3>
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
              icon={Edit3}
            >
              Edit
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button
                onClick={handleCancel}
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                variant="primary"
                size="sm"
                icon={Save}
              >
                Save
              </Button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Name</label>
              <input
                type="text"
                value={editedUser.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
              <input
                type="email"
                value={editedUser.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Roll Number</label>
              <input
                type="text"
                value={editedUser.rollNumber}
                onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Hostel Code</label>
              <input
                type="text"
                value={editedUser.hostelCode}
                onChange={(e) => handleInputChange('hostelCode', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Hostel Number</label>
              <input
                type="number"
                value={editedUser.hostelNumber}
                onChange={(e) => handleInputChange('hostelNumber', parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Room Number</label>
              <input
                type="text"
                value={editedUser.roomNumber}
                onChange={(e) => handleInputChange('roomNumber', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl">
              <User className="w-5 h-5 text-white/60" />
              <span className="text-white">{user.name}</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl">
              <Mail className="w-5 h-5 text-white/60" />
              <span className="text-white">{user.email}</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl">
              <User className="w-5 h-5 text-white/60" />
              <span className="text-white">Roll: {user.rollNumber}</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl">
              <Home className="w-5 h-5 text-white/60" />
              <span className="text-white">{user.hostelCode} {user.hostelNumber}</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl">
              <Home className="w-5 h-5 text-white/60" />
              <span className="text-white">Room: {user.roomNumber}</span>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Notification Preferences */}
      <div className="glass-card rounded-3xl p-6">
        <h3 className="text-lg font-semibold text-white flex items-center mb-4">
                          <Bell className="w-5 h-5 mr-2 text-white" />
          Notification Preferences
        </h3>

        {/* Notification Permission Status */}
        {!notificationSupport.supported ? (
          <div className="mb-4 p-3 bg-red-500/20 rounded-2xl border border-red-500/30">
            <p className="text-red-300 text-sm">
              ⚠️ Notifications are not supported in this browser
            </p>
          </div>
        ) : notificationSupport.permission === 'denied' ? (
          <div className="mb-4 p-3 bg-red-500/20 rounded-2xl border border-red-500/30">
            <p className="text-red-300 text-sm">
              ⚠️ Notifications are blocked. Please enable them in your browser settings.
            </p>
          </div>
        ) : notificationSupport.permission === 'default' ? (
          <div className="mb-4 p-3 bg-yellow-500/20 rounded-2xl border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <p className="text-yellow-300 text-sm">
                🔔 Enable notifications to get meal reminders
              </p>
              <Button
                onClick={handleRequestPermission}
                variant="primary"
                size="sm"
              >
                Enable
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-green-500/20 rounded-2xl border border-green-500/30">
            <p className="text-green-300 text-sm">
              ✅ Notifications are enabled and working
            </p>
          </div>
        )}
        
        {/* Global Toggle */}
        <div className="mb-6 p-4 bg-gradient-primary/10 rounded-2xl border border-primary-500/20">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-white font-semibold">All Meal Notifications</h4>
              <p className="text-white/70 text-sm">Master switch for all meal notifications</p>
            </div>
            <Button
              onClick={handleGlobalNotificationToggle}
              variant={getGlobalStatus() ? 'primary' : 'ghost'}
              size="sm"
              className="w-20"
              icon={getGlobalStatus() ? Bell : BellOff}
              disabled={!notificationSupport.supported || notificationSupport.permission === 'denied'}
            >
              {getGlobalStatus() ? 'On' : 'Off'}
            </Button>
          </div>
        </div>

        {/* Individual Meal Toggles */}
        <div className="space-y-3">
          <h4 className="text-white/80 font-medium text-sm mb-3">Individual Meal Settings</h4>
          
          {['breakfast', 'lunch', 'snacks', 'dinner'].map((mealKey) => (
            <div key={mealKey} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl">
              <div className="flex items-center space-x-3">
                <span className="text-white capitalize font-medium">{mealKey}</span>
                {getMealStatus(mealKey) && (
                  <span className="text-xs bg-primary-500 text-white px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <Button
                onClick={() => handleIndividualNotificationToggle(mealKey)}
                variant={getMealStatus(mealKey) ? 'primary' : 'ghost'}
                size="sm"
                className="w-16"
                icon={getMealStatus(mealKey) ? Bell : BellOff}
                disabled={!notificationSupport.supported || notificationSupport.permission === 'denied'}
              >
                {getMealStatus(mealKey) ? 'On' : 'Off'}
              </Button>
            </div>
          ))}
        </div>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-white/5 rounded-2xl">
          <p className="text-white/60 text-xs">
            💡 <strong>Tip:</strong> Use "All Meal Notifications" to quickly enable/disable all notifications, 
            or customize individual meals below. Individual settings will override the global setting.
          </p>
          <p className="text-white/60 text-xs mt-2">
            🔔 <strong>Notifications:</strong> You'll receive reminders 15 minutes before meals and when meals start serving.
          </p>
        </div>
      </div>

      {/* Logout Section */}
      <div className="glass-card rounded-3xl p-6">
        <div className="text-center">
          <Button
            onClick={onLogout}
            variant="secondary"
            className="w-full"
            icon={LogOut}
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;