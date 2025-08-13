import React, { useState } from 'react';
import SupabaseAuthForm from './SupabaseAuthForm';

interface AuthFormProps {
  onLogin: (userData: any) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
  const [adminMode, setAdminMode] = useState(false);

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
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">CCode</h1>
        <p className="text-white/70 text-lg md:text-xl max-w-sm mx-auto">Your smart mess menu companion</p>
      </div>

      {/* Auth Card */}
      <div className="glass-card rounded-3xl p-6 md:p-8 shadow-glass transition-all duration-300 hover:glass-card-hover">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Access your account</h2>
          <p className="text-white/60">Sign in or sign up using Supabase Auth</p>
        </div>
        <div className="mt-4">
          <SupabaseAuthForm
            isAdmin={adminMode}
            onLogin={(profile) => onLogin(profile)}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-8 animate-fade-in-up animate-delay-500">
        <p className="text-white/50 text-sm">By continuing, you agree to our Terms of Service and Privacy Policy</p>
      </div>
    </div>
  );
};

export default AuthForm;