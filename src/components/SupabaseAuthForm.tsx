import React, { useState, useEffect } from 'react';
import { supabase, createUserProfile, UserSignupData, createAdminProfile } from '../utils/supabase';
import { requestNotificationPermission, initializeNotifications } from '../utils/notificationUtils';

interface SupabaseAuthFormProps {
  onLogin: (userData: any) => void;
  isAdmin?: boolean;  // New prop to indicate admin mode
}

const SupabaseAuthForm: React.FC<SupabaseAuthFormProps> = ({ onLogin, isAdmin = false }) => {
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
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Check for OAuth redirects on component mount
  useEffect(() => {
    const handleOAuthRedirect = async () => {
      // If the URL contains a hash, it might be an OAuth redirect
      if (window.location.hash) {
        setOauthLoading(true);
        setError(null);
        
        try {
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('OAuth session error:', error);
            setError(`OAuth error: ${error.message}`);
            setOauthLoading(false);
            return;
          }
          
          if (data?.session?.user) {
            console.log('OAuth login successful', data.session.user);
            
            // Check if admin or regular user based on the isAdmin prop
            if (isAdmin) {
              const { data: adminProfile } = await supabase
                .from('admins')
                .select('*')
                .eq('id', data.session.user.id)
                .single();
              
              if (adminProfile) {
                onLogin({
                  ...adminProfile,
                  role: 'admin',
                  email: adminProfile.email || data.session.user.email
                });
              } else {
                // Create admin profile for OAuth user if first time
                const adminProfile = await createAdminProfile({ 
                  email: data.session.user.email || '', 
                  name: data.session.user.user_metadata?.full_name || 'Admin User' 
                });
                
                if (adminProfile) {
                  onLogin({ 
                    ...adminProfile, 
                    role: 'admin', 
                    email: adminProfile.email || data.session.user.email 
                  });
                } else {
                  setError('Failed to create admin profile. If this is the first admin, ensure the SQL script was applied.');
                  await supabase.auth.signOut();
                }
              }
            } else {
              // Regular user flow
              // Check if user exists
              const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('email', data.session.user.email)
                .single();
              
              if (profile) {
                onLogin(profile);
              } else {
                // For OAuth users, we might need additional information
                // For now, set a placeholder indicating more info needed
                setInfo('Please complete your profile information below');
                setFormData(prev => ({
                  ...prev,
                  email: data.session.user.email || '',
                  name: data.session.user.user_metadata?.full_name || ''
                }));
                setIsLogin(false); // Switch to sign-up form
              }
            }
          }
        } catch (e: any) {
          console.error('OAuth redirect handling error:', e);
          setError(`OAuth processing error: ${e.message}`);
        } finally {
          setOauthLoading(false);
          // Clear the hash to avoid processing the OAuth redirect again on refresh
          window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
        }
      }
    };
    
    handleOAuthRedirect();
  }, [isAdmin, onLogin]);

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

  const handleResetPassword = async () => {
    setError(null);
    setInfo(null);
    if (!formData.email) {
      setError('Enter your email to receive a reset link.');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: window.location.origin
      });
      if (error) {
        setError(error.message);
      } else {
        setInfo('Password reset email sent. Check your inbox (and spam).');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to send reset email');
    }
  };

  const handleOAuthLogin = async (provider: 'github') => {
    setError(null);
    setOauthLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + window.location.pathname
        }
      });
      
      if (error) {
        console.error('OAuth initiation error:', error);
        setError(`Failed to start ${provider} login: ${error.message}`);
      }
      
      // No need to call onLogin here, as we'll be redirected to the OAuth provider
      // and will handle the response in useEffect
    } catch (e: any) {
      console.error('OAuth error:', e);
      setError(`OAuth error: ${e.message}`);
    } finally {
      setOauthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    if (isLogin) {
      // Log attempt info for debugging
      console.log(`Attempting login for: ${formData.email} (Admin mode: ${isAdmin})`);
      
      // Login with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });
      
      if (error) {
        // Provide clearer guidance, especially for admins
        console.error('Login error:', error);
        const raw = error.message || '';
        
        if (raw.toLowerCase().includes('invalid login credentials')) {
          if (isAdmin) {
            // Check if email exists in admins table regardless of auth
            const { data: adminData, error: adminError } = await supabase
              .from('admins')
              .select('email')
              .eq('email', formData.email)
              .maybeSingle();
              
            if (adminData) {
              setError(
                'Your email exists in the admin table, but your password is incorrect or your auth account is not set up. ' +
                'Please try using "Sign Up" first to create your auth account with this email.'
              );
            } else {
              setError(
                'Invalid login credentials. Note: You need both (1) an entry in the admins table AND ' +
                '(2) a Supabase Auth account with the same email. Please sign up first.'
              );
            }
          } else {
            setError('Invalid login credentials. Please check your email and password or reset your password.');
          }
        } else {
          setError(raw);
        }
        setLoading(false);
        return;
      }

      // Additional debug info
      console.log('Auth successful, user:', data.user?.id);
      
      if (isAdmin) {
        // For admin login, check the admins table
        const { data: adminProfile } = await supabase
          .from('admins')
          .select('*')
          .eq('id', data.user?.id)
          .single();
        
        if (adminProfile) {
          // User exists in admins table, they are an admin
          onLogin({
            ...adminProfile,
            role: 'admin',
            email: adminProfile.email || data.user?.email
          });
        } else {
          // User authenticated but not in admins table
          setError("Your account doesn't have admin privileges");
          setLoading(false);
          // Sign out the user since they're not an admin
          await supabase.auth.signOut();
          return;
        }
      } else {
        // For regular user login, check the users table
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
      }
      setLoading(false);
    } else {
      // Sign up with Supabase Auth
      const { error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (isAdmin) {
        // Admin sign-up flow: ensure authenticated, then create admin profile
        let currentUser = (await supabase.auth.getUser()).data.user;
        if (!currentUser) {
          // Some projects require email confirmation to get a session. Try immediate sign-in.
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password
          });
          if (signInError) {
            setError(`Sign-in required to finalize admin setup. ${signInError.message}`);
            setLoading(false);
            return;
          }
          currentUser = signInData.user;
        }

        const adminProfile = await createAdminProfile({ email: formData.email, name: formData.name });
        if (!adminProfile) {
          setError('Failed to create admin profile. If this is the first admin, ensure the SQL script was applied.');
          setLoading(false);
          return;
        }

        onLogin({ ...adminProfile, role: 'admin', email: adminProfile.email || formData.email });
        setLoading(false);
        return;
      }

      // Regular user sign-up flow: Save user profile in custom users table
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
        // @ts-expect-error augmenting runtime object
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

  if (oauthLoading) {
    return (
      <div className="max-w-md mx-auto glass-card p-6 rounded-3xl text-center">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white/80 font-manrope text-lg">Processing authentication...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto glass-card p-6 rounded-3xl">
      <h2 className="text-2xl font-bold text-white mb-4">{isLogin ? 'Login' : 'Sign Up'}</h2>
      
      {/* OAuth Section */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => handleOAuthLogin('github')}
          disabled={loading}
          className="w-full bg-gray-800 text-white py-3 rounded-xl font-bold mb-2 flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          {isLogin ? 'Sign in with GitHub' : 'Sign up with GitHub'}
        </button>
      </div>
      
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/20"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-dark-900 px-4 text-sm text-white/60">or continue with email</span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <>
            {isAdmin ? (
              <>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 text-white"
                  required
                />
                {/* Admin sign-up only needs name; email/password fields are below */}
              </>
            ) : (
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
        {isLogin && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={!formData.email || loading}
              className="text-primary-300 underline disabled:opacity-50"
            >
              Forgot password?
            </button>
            {isAdmin && (
              <span className="text-white/60">New admin? Use Sign Up first.</span>
            )}
          </div>
        )}
        {error && <div className="text-red-400 mt-2">{error}</div>}
        {info && <div className="text-green-400 mt-2">{info}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-primary text-white py-3 rounded-xl font-bold mt-2"
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
