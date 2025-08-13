import React, { useState } from 'react';
import { Menu, ChevronDown, ChevronRight } from 'lucide-react';

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="w-full flex items-center justify-between p-4 bg-dark-900">
      {/* Logo */}
      <div className="flex items-center space-x-2">
        {/* ...existing code for logo... */}
      </div>
      {/* Menu Icon for mobile */}
      <button
        className="md:hidden text-white"
        onClick={() => setOpen(!open)}
        aria-label="Open menu"
      >
        <Menu className="w-7 h-7 text-white" />
      </button>
      {/* Desktop Nav */}
      <div className="hidden md:flex items-center space-x-6">
        {/* Example nav item with arrow */}
        <div className="flex items-center space-x-1 cursor-pointer">
          <span className="text-white">Menu</span>
          <ChevronDown className="w-4 h-4 text-white" />
        </div>
        {/* ...other nav items... */}
      </div>
      {/* Mobile Nav Dropdown */}
      {open && (
        <div className="absolute top-full left-0 w-full bg-dark-900 shadow-lg z-50">
          <div className="flex flex-col space-y-2 p-4">
            {/* Example mobile nav item with arrow */}
            <div className="flex items-center space-x-1 cursor-pointer">
              <span className="text-white">Menu</span>
              <ChevronRight className="w-4 h-4 text-white" />
            </div>
            {/* ...other nav items... */}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;