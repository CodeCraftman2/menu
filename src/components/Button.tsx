import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'glass' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon';
  children: React.ReactNode;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-gradient-primary hover:bg-gradient-primary/90 text-white shadow-glow hover:shadow-glow-hover focus:ring-primary-500',
    secondary: 'bg-gradient-secondary hover:bg-gradient-secondary/90 text-white shadow-glow hover:shadow-glow-hover focus:ring-secondary-500',
    accent: 'bg-gradient-accent hover:bg-gradient-accent/90 text-white shadow-glow hover:shadow-glow-hover focus:ring-accent-500',
    glass: 'glass-card hover:glass-card-hover text-white border-white/20 focus:ring-white/50',
    outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white focus:ring-primary-500',
    ghost: 'text-white/70 hover:text-white hover:bg-white/10 focus:ring-white/50'
  };
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm rounded-xl',
    md: 'px-6 py-3 text-base rounded-2xl',
    lg: 'px-8 py-4 text-lg rounded-2xl',
    xl: 'px-10 py-5 text-xl rounded-3xl',
    icon: 'w-12 h-12 rounded-2xl'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button className={classes} {...props}>
      {Icon && iconPosition === 'left' && (
        <Icon className={`w-5 h-5 ${size === 'icon' ? '' : 'mr-2'}`} />
      )}
      {children}
      {Icon && iconPosition === 'right' && (
        <Icon className={`w-5 h-5 ${size === 'icon' ? '' : 'ml-2'}`} />
      )}
    </button>
  );
};