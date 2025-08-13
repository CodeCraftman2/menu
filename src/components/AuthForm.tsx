import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight, Home, Hash } from 'lucide-react';
import { Button } from './Button';
import { createUserProfile, UserSignupData, supabase } from '../utils/supabase';
import SupabaseAuthForm from './SupabaseAuthForm';

interface AuthFormProps {
  onLogin: (userData: any) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [adminMode, setAdminMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    rollNumber: '',
    gender: 'male' as 'male' | 'female',
    hostelCode: 'BH' as 'BH' | 'LH',
    hostelNumber: 1,
    roomNumber: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<typeof formData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<typeof formData> = {};

    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.rollNumber) newErrors.rollNumber = 'Roll number is required';
    if (!formData.roomNumber) newErrors.roomNumber = 'Room number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      // Simple login logic - in real app, validate against backend
      if (formData.email && formData.password) {
        onLogin({
          name: formData.email.split('@')[0],
          email: formData.email,
          preferences: {
            notifications: {
              global: false,
              breakfast: false,
              lunch: false,
              snacks: false,
              dinner: false
            }
          }
        });
      }
    } else {
      // Registration logic with hostel info
      if (!validateForm()) return;

      setLoading(true);
      try {
        if (adminMode) {
          // Admin registration: save to admins table (only email and name)
          try {
            // First check if admins table exists and has required columns
            const { error: checkError } = await supabase
              .from('admins')
              .select('id')
              .limit(1);
            
            if (checkError) {
              console.error('Admin table check error:', checkError);
              
              if (checkError.code === 'PGRST205' || checkError.message?.includes('does not exist')) {
                setErrors({ 
                  email: 'The admins table does not exist. Please run create_weekly_menus_and_admins.sql in your Supabase SQL Editor first.' 
                });
                setLoading(false);
                return;
              }
            }
            
            // Try to create admin with just ID first (in case email/name columns don't exist)
            const { data: adminData, error: adminError } = await supabase
              .from('admins')
              .insert([{ id: (await supabase.auth.getUser()).data.user?.id }])
              .select()
              .single();
              
            if (adminError) {
              console.error('Admin creation error (ID only):', adminError);
              
              // If columns don't exist error, provide clear instructions
              if (adminError.code === '42703' && adminError.message?.includes('column')) {
                setErrors({ 
                  email: 'Database schema issue. Please run the updated create_weekly_menus_and_admins.sql script which adds the missing columns.' 
                });
                setLoading(false);
                return;
              } else if (adminError.code === '23505' || adminError.message?.includes('duplicate key')) {
                // This is fine - admin already exists with this ID
                console.log('Admin already exists with this ID, continuing');
              } else {
                // Other error with plain ID insert
                setErrors({ email: `Admin creation failed: ${adminError.message}` });
                setLoading(false);
                return;
              }
            }
            
            // Now try with email and name too
            try {
              const { data, error } = await supabase
                .from('admins')
                .update({ email: formData.email, name: formData.name })
                .eq('id', (await supabase.auth.getUser()).data.user?.id)
                .select()
                .single();
                
              if (error) {
                // If columns don't exist error, we already handled it above
                if (error.code === '42703' && error.message?.includes('column')) {
                  // Successfully created admin with just ID, that's good enough
                  onLogin({
                    id: (await supabase.auth.getUser()).data.user?.id,
                    role: 'admin',
                    email: formData.email, // Use form data since we couldn't save it
                    name: formData.name,
                  });
                } else {
                  setErrors({ email: `Failed to update admin details: ${error.message}` });
                  setLoading(false);
                }
              } else {
                // Successfully created/updated admin with all fields
                onLogin({
                  ...data,
                  role: 'admin',
                  email: data.email || formData.email,
                  name: data.name || formData.name,
                });
              }
            } catch (updateError: any) {
              console.error('Admin update error:', updateError);
              // Still login the user since the admin record exists
              onLogin({
                id: (await supabase.auth.getUser()).data.user?.id,
                role: 'admin',
                email: formData.email,
                name: formData.name,
              });
            }
          } catch (error: any) {
            console.error('Admin creation exception:', error);
            setErrors({ 
              email: `An unexpected error occurred: ${error.message || 'Unknown error'}` 
            });
            setLoading(false);
          }
        } else {
          // User registration: save to users table
          const userData: UserSignupData = {
            email: formData.email,
            registration_no: formData.rollNumber,
            name: formData.name,
            gender: formData.gender,
            hostel_code: formData.hostelCode,
            hostel_number: formData.hostelNumber,
            room_number: formData.roomNumber
          };

          const user = await createUserProfile(userData);
          if (user) {
            onLogin({
              ...user,
              name: user.name,
              email: user.email,
              hostel: `${user.hostel_code}${user.hostel_number}`,
              preferences: {
                notifications: {
                  global: false,
                  breakfast: false,
                  lunch: false,
                  snacks: false,
                  dinner: false
                }
              }
            });
          } else {
            setErrors({ email: 'Failed to create user profile. Please try again.' });
          }
        }
      } catch (error) {
        console.error('Signup error:', error);
        setErrors({ email: 'An unexpected error occurred. Please try again.' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-set hostel code based on gender
    if (field === 'gender') {
      const newGender = value as 'male' | 'female';
      setFormData(prev => ({ 
        ...prev, 
        gender: newGender,
        hostelCode: newGender === 'male' ? 'BH' : 'LH',
        hostelNumber: 1 // Reset to first hostel when gender changes
      }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="w-full animate-fade-in-up">
      {/* Admin/User toggle */}
      <div className="flex justify-center mb-4">
        <div className="bg-white/10 rounded-2xl p-1 inline-flex">
          <button type="button" onClick={() => setAdminMode(false)} className={`px-4 py-2 rounded-2xl ${!adminMode ? 'bg-primary-500 text-white' : 'text-white/80'}`}>User</button>
          <button type="button" onClick={() => setAdminMode(true)} className={`px-4 py-2 rounded-2xl ${adminMode ? 'bg-primary-500 text-white' : 'text-white/80'}`}>Admin</button>
        </div>
      </div>
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in-up animate-delay-200">
        {adminMode && (
          <p className="text-white/70 mt-2">Admin mode: use Supabase email/password to sign in.</p>
        )}
        <div className="w-20 h-20 bg-gradient-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-glow">
          <span className="text-3xl">🍽️</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
          CCode
        </h1>
        <p className="text-white/70 text-lg md:text-xl max-w-sm mx-auto">
          Your smart mess menu companion
        </p>
      </div>

      {/* Form Card */}
      <div className="glass-card rounded-3xl p-6 md:p-8 shadow-glass transition-all duration-300 hover:glass-card-hover">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {isLogin ? 'Welcome Back!' : 'Join CCode'}
          </h2>
          <p className="text-white/60">
            {isLogin ? 'Sign in to access your mess menu' : 'Create your account with hostel information'}
          </p>
        </div>

        {adminMode ? (
          <div className="mt-4">
            <SupabaseAuthForm onLogin={(profile) => {
              // mark role as admin for app routing
              onLogin({ ...profile, role: 'admin' })
            }} />
          </div>
        ) : (
        <>
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          {!isLogin && (
            <>
              {/* Name */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50">
                  <User className="w-5 h-5 text-white" />
                </div>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 bg-white/5 border ${
                    errors.name ? 'border-red-400' : 'border-white/10'
                  } rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300`}
                  required
                />
                {errors.name && <p className="text-red-400 text-sm mt-1 ml-4">{errors.name}</p>}
              </div>
              
              {/* Roll Number */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50">
                  <Hash className="w-5 h-5 text-white" />
                </div>
                <input
                  type="text"
                  placeholder="Roll Number"
                  value={formData.rollNumber}
                  onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 bg-white/5 border ${
                    errors.rollNumber ? 'border-red-400' : 'border-white/10'
                  } rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300`}
                  required
                />
                {errors.rollNumber && <p className="text-red-400 text-sm mt-1 ml-4">{errors.rollNumber}</p>}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-white/90 text-sm font-medium mb-3">
                  Gender *
                </label>
                <div className="flex space-x-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={formData.gender === 'male'}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="mr-2 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-white/90">Male</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={formData.gender === 'female'}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="mr-2 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-white/90">Female</span>
                  </label>
                </div>
              </div>

              {/* Hostel Code (Auto-determined by gender) */}
              <div>
                <label className="block text-white/90 text-sm font-medium mb-3">
                  Hostel Type *
                </label>
                <div className="px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white/90">
                  {formData.hostelCode === 'BH' ? 'BH (Boys Hostel)' : 'LH (Ladies Hostel)'}
                  <span className="text-white/60 text-sm ml-2">- Auto-selected based on gender</span>
                </div>
              </div>

              {/* Hostel Number */}
              <div>
                <label className="block text-white/90 text-sm font-medium mb-3">
                  Hostel Number *
                </label>
                              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50">
                  <Home className="w-5 h-5 text-white" />
                </div>
                  <select
                    value={formData.hostelNumber}
                    onChange={(e) => handleInputChange('hostelNumber', parseInt(e.target.value))}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 cursor-pointer appearance-none"
                  >
                    {formData.hostelCode === 'BH' ? (
                      // Boys Hostel: 1-12
                      Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>
                          Hostel {num}
                        </option>
                      ))
                    ) : (
                      // Ladies Hostel: 1-4
                      Array.from({ length: 4 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>
                          Hostel {num}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 pointer-events-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {formData.hostelCode === 'BH' && (
                  <p className="text-white/50 text-xs mt-2 ml-4">
                    Click to see dropdown with 12 boys hostels (scroll to see more)
                  </p>
                )}
              </div>

              {/* Room Number */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <input
                  type="text"
                  placeholder="Room Number (e.g., A-101, B-201)"
                  value={formData.roomNumber}
                  onChange={(e) => handleInputChange('roomNumber', e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 bg-white/5 border ${
                    errors.roomNumber ? 'border-red-400' : 'border-white/10'
                  } rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300`}
                  required
                />
                {errors.roomNumber && <p className="text-red-400 text-sm mt-1 ml-4">{errors.roomNumber}</p>}
              </div>
            </>
          )}

          {/* Email */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50">
              <User className="w-5 h-5 text-white" />
            </div>
            <input
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full pl-12 pr-4 py-4 bg-white/5 border ${
                errors.email ? 'border-red-400' : 'border-white/10'
              } rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300`}
              required
            />
            {errors.email && <p className="text-red-400 text-sm mt-1 ml-4">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={`w-full pl-12 pr-12 py-4 bg-white/5 border ${
                errors.password ? 'border-red-400' : 'border-white/10'
              } rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors duration-200"
            >
              {showPassword ? <EyeOff className="w-5 h-5 text-white" /> : <Eye className="w-5 h-5 text-white" />}
            </button>
            {errors.password && <p className="text-red-400 text-sm mt-1 ml-4">{errors.password}</p>}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-primary hover:bg-gradient-primary/90 text-white font-semibold py-4 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-glow hover:shadow-glow-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>
              {loading 
                ? (isLogin ? 'Signing In...' : 'Creating Account...') 
                : (isLogin ? 'Sign In' : 'Create Account')
              }
            </span>
                            <ArrowRight className="w-5 h-5 ml-2 text-white" />
          </Button>
        </form>

        {/* Toggle Form Type */}
        <div className="text-center mt-6">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-white/70 hover:text-white transition-colors duration-200"
          >
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <span className="text-primary-400 font-semibold hover:text-primary-300">
              {isLogin ? 'Sign Up' : 'Sign In'}
            </span>
          </button>
        </div>
        </>
        )}
      </div>

      {/* Footer */}
      <div className="text-center mt-8 animate-fade-in-up animate-delay-500">
        <p className="text-white/50 text-sm">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default AuthForm;