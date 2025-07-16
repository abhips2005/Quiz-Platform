import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import { 
  PlusIcon, 
  HomeIcon, 
  DocumentTextIcon,
  BookmarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  PlayIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import './Layout.css';

const Layout: React.FC = () => {
  const { dbUser, logout, isLoading } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);
  
  // Close mobile menu on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Safety timeout for loading state
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading]);

  if (isLoading && !loadingTimeout) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (loadingTimeout) {
    console.warn('Layout loading timeout - proceeding without auth check');
  }

  if (!dbUser) {
    return <Navigate to="/login" replace />;
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'My Quizzes', href: '/quizzes', icon: DocumentTextIcon },
    { name: 'Question Bank', href: '/question-bank', icon: BookmarkIcon },
    { name: 'Host Game', href: '/game/host', icon: PlayIcon },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  ];

  const isCurrentPath = (path: string) => location.pathname === path;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button 
          className="mobile-menu-button"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <XMarkIcon /> : <Bars3Icon />}
        </button>
        <h1>Quizizz Platform</h1>
        <div></div> {/* Spacer for center alignment */}
      </div>

      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={closeMobileMenu}
      ></div>

      {/* Sidebar */}
      <div className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="logo">Quizizz</h1>
          <p className="logo-subtitle">Platform</p>
        </div>

        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`nav-item ${isCurrentPath(item.href) ? 'active' : ''}`}
              >
                <Icon className="nav-icon" />
                <span>{item.name}</span>
              </Link>
            );
          })}
          
          {dbUser.role === 'TEACHER' && (
            <Link
              to="/quiz/create"
              className={`nav-item create-quiz ${isCurrentPath('/quiz/create') ? 'active' : ''}`}
            >
              <PlusIcon className="nav-icon" />
              <span>Create Quiz</span>
            </Link>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <UserCircleIcon className="user-avatar" />
            <div className="user-details">
              <p className="user-name">{dbUser.firstName} {dbUser.lastName}</p>
              <p className="user-role">{dbUser.role}</p>
            </div>
          </div>
          <button onClick={logout} className="logout-button">
            <ArrowRightOnRectangleIcon className="logout-icon" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout; 