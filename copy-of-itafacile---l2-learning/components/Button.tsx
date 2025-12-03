import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const baseStyle = "font-bold py-3 px-6 rounded-xl shadow-md transition-transform transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white border-b-4 border-blue-700",
    secondary: "bg-white hover:bg-gray-50 text-gray-700 border-b-4 border-gray-200",
    success: "bg-green-500 hover:bg-green-600 text-white border-b-4 border-green-700",
    danger: "bg-red-500 hover:bg-red-600 text-white border-b-4 border-red-700",
  };

  return (
    <button 
      type="button"
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};