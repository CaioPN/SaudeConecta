import React, { useState, useEffect, useRef } from 'react';
import { Home, Users, Menu, User, HelpCircle, FileText, LogOut, Lock } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (location.pathname === '/') return null; // Hide on login screen

  const navItems = [
    { label: 'Início', icon: Home, path: '/dashboard' },
    { label: 'Exames/Registros', icon: Users, path: '/patient' }, // Navigates to the patient list/profile feature
    { label: 'Mais', icon: Menu, path: '#' }
  ];

  const handleMenuClick = (path) => {
    setIsMenuOpen(false);
    if (path) navigate(path);
  };

  return (
    <div className="bottom-nav" ref={menuRef}>
      {/* Popup Overlay Menu */}
      {isMenuOpen && (
        <div className="more-menu-overlay">
          <button onClick={() => handleMenuClick('/profile')} className="more-menu-item">
            <User size={20} />
            <span>Meu perfil</span>
          </button>
          <button onClick={() => handleMenuClick('/faq')} className="more-menu-item">
            <HelpCircle size={20} />
            <span>Dúvidas frequentes</span>
          </button>
          <button onClick={() => handleMenuClick('/terms')} className="more-menu-item">
            <FileText size={20} />
            <span>Termos de utilização</span>
          </button>
          <button onClick={() => handleMenuClick('/privacy')} className="more-menu-item">
            <Lock size={20} />
            <span>Portal de Privacidade</span>
          </button>
          <div className="more-menu-divider"></div>
          <button onClick={() => handleMenuClick('/')} className="more-menu-item logout">
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      )}

      {navItems.map((item, idx) => (
        <button
          key={idx}
          onClick={() => {
            if (item.label === 'Mais') setIsMenuOpen(!isMenuOpen);
            else handleMenuClick(item.path);
          }}
          className={`nav-item ${location.pathname === item.path || (item.label === 'Mais' && isMenuOpen) ? 'active' : ''}`}
        >
          <item.icon size={24} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}