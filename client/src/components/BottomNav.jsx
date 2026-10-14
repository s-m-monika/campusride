import React from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, Clock, Cpu, User, Bike } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRide } from '../context/RideContext';

const BottomNav = () => {
  const { mode } = useAuth();
  const { activeRide } = useRide();

  const isDriver = mode === 'driver';

  const navItems = isDriver
    ? [
        { to: '/driver', icon: Bike, label: 'Dashboard' },
        { to: '/history', icon: Clock, label: 'Rides' },
        { to: '/algorithms', icon: Cpu, label: 'Algorithms' },
        { to: '/profile', icon: User, label: 'Profile' }
      ]
    : [
        { to: '/home', icon: Compass, label: 'Home' },
        { to: activeRide ? '/tracking' : '/history', icon: Clock, label: activeRide ? 'Active Ride' : 'Rides', badge: !!activeRide },
        { to: '/algorithms', icon: Cpu, label: 'Algorithms' },
        { to: '/profile', icon: User, label: 'Profile' }
      ];

  // `isDriver` depends on `mode`; both consts above are retained for clarity.

  return (
    <nav className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 pt-2 pb-safe-plus flex items-center justify-around shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all relative ${
                isActive
                  ? 'text-red-500 font-bold scale-105'
                  : 'text-gray-400 hover:text-gray-600 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
                  )}
                </div>
                <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default BottomNav;
