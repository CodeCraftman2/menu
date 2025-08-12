// Notification utility functions for CCode
export interface NotificationPreferences {
  global: boolean;
  breakfast: boolean;
  lunch: boolean;
  snacks: boolean;
  dinner: boolean;
}

export interface MealTime {
  type: string;
  time: string;
  timeRange: { start: number; end: number };
  enabled: boolean;
}

// Request notification permission from the user
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'default') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  return Notification.permission === 'granted';
};

// Show a notification immediately
export const showNotification = (
  title: string, 
  body: string, 
  options?: NotificationOptions
): Notification | null => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: '/vite.svg',
      badge: '/vite.svg',
      tag: 'ccode-notification',
      requireInteraction: false,
      silent: false,
      ...options
    });

    // Add click event listener
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
};

// Show meal reminder notification
export const showMealReminder = (mealType: string, timeUntilMeal: number): void => {
  const minutes = Math.floor(timeUntilMeal / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  
  let timeText = '';
  if (hours > 0) {
    timeText = `${hours} hour${hours > 1 ? 's' : ''} and ${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`;
  } else {
    timeText = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  showNotification(
    `🍽️ ${mealType} Reminder`,
    `${mealType} will be served in ${timeText}! Don't miss out on today's delicious meal.`,
    {
      tag: `meal-${mealType.toLowerCase()}`,
      requireInteraction: true
    }
  );
};

// Show meal start notification
export const showMealStart = (mealType: string, menuItems: string[]): void => {
  const itemsText = menuItems.slice(0, 3).join(', ');
  const moreText = menuItems.length > 3 ? ` and ${menuItems.length - 3} more items` : '';
  
  showNotification(
    `🎉 ${mealType} is Now Serving!`,
    `Today's ${mealType.toLowerCase()}: ${itemsText}${moreText}. Head to the mess now!`,
    {
      tag: `meal-serving-${mealType.toLowerCase()}`,
      requireInteraction: true
    }
  );
};

// Calculate time until next meal
export const getTimeUntilMeal = (mealTime: string): number => {
  const now = new Date();
  const [hours, minutes] = mealTime.split(':').map(Number);
  const mealDate = new Date();
  mealDate.setHours(hours, minutes, 0, 0);

  // If meal time has passed today, calculate for tomorrow
  if (mealDate <= now) {
    mealDate.setDate(mealDate.getDate() + 1);
  }

  return mealDate.getTime() - now.getTime();
};

// Schedule meal notifications based on preferences
export const scheduleMealNotifications = (preferences: NotificationPreferences): void => {
  // Clear any existing notifications
  clearAllMealNotifications();

  const mealTimes: MealTime[] = [
    {
      type: 'Breakfast',
      time: '7:00',
      timeRange: { start: 7, end: 9 },
      enabled: preferences.breakfast || preferences.global
    },
    {
      type: 'Lunch',
      time: '12:30',
      timeRange: { start: 12.5, end: 14.5 },
      enabled: preferences.lunch || preferences.global
    },
    {
      type: 'Snacks',
      time: '18:00',
      timeRange: { start: 18, end: 19.75 },
      enabled: preferences.snacks || preferences.global
    },
    {
      type: 'Dinner',
      time: '20:30',
      timeRange: { start: 20.5, end: 22.25 },
      enabled: preferences.dinner || preferences.global
    }
  ];

  mealTimes.forEach(meal => {
    if (meal.enabled) {
      scheduleMealNotification(meal);
    }
  });
};

// Schedule individual meal notification
const scheduleMealNotification = (meal: MealTime): void => {
  const timeUntilMeal = getTimeUntilMeal(meal.time);
  
  if (timeUntilMeal <= 0) {
    return; // Meal time has passed
  }

  // Schedule reminder 15 minutes before meal
  const reminderTime = timeUntilMeal - (15 * 60 * 1000);
  
  if (reminderTime > 0) {
    setTimeout(() => {
      showMealReminder(meal.type, 15 * 60 * 1000);
    }, reminderTime);
  }

  // Schedule meal start notification
  setTimeout(() => {
    // Get menu items for the meal (you can enhance this with actual menu data)
    const sampleMenuItems = getSampleMenuItems(meal.type);
    showMealStart(meal.type, sampleMenuItems);
  }, timeUntilMeal);

  // Schedule additional reminders if it's a long meal window
  const mealDuration = (meal.timeRange.end - meal.timeRange.start) * 60 * 60 * 1000;
  if (mealDuration > 2 * 60 * 60 * 1000) { // If meal lasts more than 2 hours
    const midMealTime = timeUntilMeal + (mealDuration / 2);
    setTimeout(() => {
      showNotification(
        `⏰ ${meal.type} Still Available`,
        `${meal.type} is still being served. Don't forget to grab your meal!`,
        { tag: `meal-mid-${meal.type.toLowerCase()}` }
      );
    }, midMealTime);
  }
};

// Get sample menu items for notifications
const getSampleMenuItems = (mealType: string): string[] => {
  const menuItems: { [key: string]: string[] } = {
    breakfast: ['BARA', 'GHUGUNI', 'TEA'],
    lunch: ['RICE', 'ROTI', 'DAL', 'CURRY'],
    snacks: ['PAMPDI CHAT', 'IMLI CHUTNI', 'TEA'],
    dinner: ['BIRIYANI', 'CURRY', 'RAITA']
  };
  
  return menuItems[mealType.toLowerCase()] || ['Delicious food'];
};

// Clear all scheduled meal notifications
export const clearAllMealNotifications = (): void => {
  // Clear any existing timeouts (you might want to store timeout IDs for better control)
  // For now, we'll rely on the browser's notification system
};

// Check if notifications are supported and enabled
export const checkNotificationSupport = (): {
  supported: boolean;
  permission: NotificationPermission | 'not-supported';
  canRequest: boolean;
} => {
  if (!('Notification' in window)) {
    return {
      supported: false,
      permission: 'not-supported',
      canRequest: false
    };
  }

  return {
    supported: true,
    permission: Notification.permission,
    canRequest: Notification.permission === 'default'
  };
};

// Initialize notification system
export const initializeNotifications = async (preferences: NotificationPreferences): Promise<boolean> => {
  const support = checkNotificationSupport();
  
  if (!support.supported) {
    console.warn('Notifications not supported in this browser');
    return false;
  }

  if (support.permission === 'default') {
    const granted = await requestNotificationPermission();
    if (granted) {
      scheduleMealNotifications(preferences);
      return true;
    }
    return false;
  }

  if (support.permission === 'granted') {
    scheduleMealNotifications(preferences);
    return true;
  }

  return false;
};

// Handle notification actions (e.g., clicking "View Menu")
export const handleNotificationAction = (action: string, mealType?: string): void => {
  switch (action) {
    case 'view-menu':
      // You can implement navigation to menu view here
      console.log('Navigate to menu view');
      break;
    case 'dismiss':
      // Notification will be automatically dismissed
      break;
    default:
      console.log('Unknown notification action:', action);
  }
};