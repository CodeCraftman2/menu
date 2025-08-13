import React, { useState } from 'react';
import { supabase, createUserProfile, UserSignupData } from '../utils/supabase';
import { requestNotificationPermission, initializeNotifications } from '../utils/notificationUtils';

interface SupabaseAuthFormProps {
  onLogin: (userData: any) => void;
}

const SupabaseAuthForm: React.FC<SupabaseAuthFormProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    rollNumber: '',
    gender: 'male' as 'male' | 'female',
    hostelCode: 'BH' as 'BH' | 'LH',
    hostelNumber: 1,
    roomNumber: '',
    notifications: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'gender') {
      setFormData(prev => ({
        ...prev,
        hostelCode: value === 'male' ? 'BH' : 'LH',
        hostelNumber: 1
      }));
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isLogin) {
      // Login with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // Fetch user profile from Supabase
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('email', formData.email)
        .single();
      if (profile) {
        onLogin(profile);
        if (profile.preferences?.notifications) {
          await initializeNotifications(profile.preferences.notifications);
        }
      }
      setLoading(false);
    } else {
      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Save user profile in custom users table (existing app behavior)
      const userData: UserSignupData = {
        email: formData.email,
        registration_no: formData.rollNumber,
        name: formData.name,
        gender: formData.gender,
        hostel_code: formData.hostelCode,
        hostel_number: formData.hostelNumber,
        room_number: formData.roomNumber
      };
      const userProfile = await createUserProfile(userData);
      if (userProfile) {
        // Save notification preference
        // @ts-ignore - augmenting runtime object
        userProfile.preferences = {
          notifications: {
            global: formData.notifications,
            breakfast: formData.notifications,
            lunch: formData.notifications,
            snacks: formData.notifications,
            dinner: formData.notifications
          }
        };
        onLogin(userProfile);
        if (formData.notifications) {
          await requestNotificationPermission();
          await initializeNotifications((userProfile as any).preferences.notifications);
        }
      }
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto glass-card p-6 rounded-3xl">
      <h2 className="text-2xl font-bold text-white mb-4">{isLogin ? 'Login' : 'Sign Up'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <>
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 text-white"
              required
            />
            <input
              type="text"
              placeholder="Roll Number"
              value={formData.rollNumber}
              onChange={e => handleInputChange('rollNumber', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 text-white"
              required
            />
            <div className="flex space-x-4">
              <label>
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={formData.gender === 'male'}
                  onChange={e => handleInputChange('gender', e.target.value)}
                /> Male
              </label>
              <label>
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={formData.gender === 'female'}
                  onChange={e => handleInputChange('gender', e.target.value)}
                /> Female
              </label>
            </div>
            <div>
              <label>Hostel Type: {formData.hostelCode}</label>
            </div>
            <select
              value={formData.hostelNumber}
              onChange={e => handleInputChange('hostelNumber', parseInt(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-white/10 text-white"
            >
              {formData.hostelCode === 'BH'
                ? Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>Hostel {num}</option>
                  ))
                : Array.from({ length: 4 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>Hostel {num}</option>
                  ))}
            </select>
            <input
              type="text"
              placeholder="Room Number"
              value={formData.roomNumber}
              onChange={e => handleInputChange('roomNumber', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 text-white"
              required
            />
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.notifications}
                onChange={e => handleInputChange('notifications', e.target.checked)}
              />
              <span className="text-white">Enable meal notifications</span>
            </label>
          </>
        )}
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={e => handleInputChange('email', e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/10 text-white"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={e => handleInputChange('password', e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/10 text-white"
          required
        />
        {error && <div className="text-red-400">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-primary text-white py-3 rounded-xl font-bold"
        >
          {loading ? (isLogin ? 'Logging in...' : 'Signing up...') : (isLogin ? 'Login' : 'Sign Up')}
        </button>
      </form>
      <div className="mt-4 text-center">
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-primary-400 underline"
        >
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
};

export default SupabaseAuthForm;
