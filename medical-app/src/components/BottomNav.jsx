import React from 'react';
import { Home, Users, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === '/') return null; // Hide on login screen

  const navItems = [
    { label: 'Início', icon: Home, path: '/dashboard' },
    { label: 'Exames/Registros', icon: Users, path: '/patient' }, // Navigates to the patient list/profile feature
    { label: 'Mais', icon: Menu, path: '#' }
  ];

  return (
    <div className="bottom-nav">
      {navItems.map((item, idx) => (
        <button
          key={idx}
          onClick={() => item.path !== '#' && navigate(item.path)}
          className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
        >
          <item.icon size={24} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}