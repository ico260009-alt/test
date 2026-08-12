import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const UzFlag = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '2px', border: '1px solid rgba(0,0,0,0.1)' }}>
    <rect width="16" height="4" fill="#0099B5"/>
    <rect y="4" width="16" height="4" fill="#FFFFFF"/>
    <rect y="8" width="16" height="4" fill="#1EB53A"/>
    <rect y="3.5" width="16" height="0.5" fill="#CE1126"/>
    <rect y="8" width="16" height="0.5" fill="#CE1126"/>
  </svg>
);

const RuFlag = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '2px', border: '1px solid rgba(0,0,0,0.1)' }}>
    <rect width="16" height="4" fill="#FFFFFF"/>
    <rect y="4" width="16" height="4" fill="#1C3578"/>
    <rect y="8" width="16" height="4" fill="#E4181C"/>
  </svg>
);
import { 
  LayoutDashboard, 
  FileText, 
  TrendingUp, 
  Bot, 
  CreditCard, 
  User, 
  LogOut,
  Menu,
  X,
  Globe,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Settings2,
  AlertTriangle,
  Bookmark,
  Calendar,
  Moon,
  Sun,
  ChevronDown,
  Edit3,
  Crown
} from 'lucide-react';
import DashboardView from './views/DashboardView';
import ProfileView from './views/ProfileView';
import PricingView from './views/PricingView';
import MocksView from './views/MocksView';
import ProgressView from './views/ProgressView';
import AiTutorView from './views/AiTutorView';
import CustomTestSetupView from './views/CustomTestSetupView';
import MistakesView from './views/MistakesView';
import BookmarksView from './views/BookmarksView';
import EssayReviewView from './views/EssayReviewView';
import { supabase } from '../../lib/supabase';
import './Workspace.css';

export default function WorkspaceLayout({ user, lang, setLang, onLogout, isAdmin, onEnterAdmin, onStartExam, onStartMistakeRetry, onStartCustomExam, initialView }) {
  const navigate = useNavigate();
  // activeView is always derived from the URL (initialView prop), not localStorage.
  // When a sidebar button is clicked, we navigate to the new URL which re-renders
  // WorkspaceLayout with the updated initialView prop.
  const activeView = initialView || 'dashboard';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef(null);
  const [stats, setStats] = useState({ streak: 0, avgScore: 0, totalTests: 0 });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    async function fetchStats() {
      try {
        const { data: sessions } = await supabase
          .from('test_sessions')
          .select('score, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false });

        let avgScore = 0;
        let streak = 0;

        if (sessions && sessions.length > 0) {
          const totalScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0);
          avgScore = Math.round(totalScore / sessions.length);

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const sessionDates = [...new Set(sessions
            .filter(s => s.completed_at)
            .map(s => {
              const d = new Date(s.completed_at);
              d.setHours(0, 0, 0, 0);
              return d.getTime();
            })
          )].sort((a, b) => b - a);

          if (sessionDates.length > 0) {
            const oneDayMs = 86400000;
            const mostRecent = sessionDates[0];
            if (today.getTime() - mostRecent <= oneDayMs) {
              streak = 1;
              for (let i = 1; i < sessionDates.length; i++) {
                if (sessionDates[i - 1] - sessionDates[i] === oneDayMs) {
                  streak++;
                } else {
                  break;
                }
              }
            }
          }
        }
        setStats({ streak, avgScore, totalTests: sessions?.length || 0 });
      } catch (err) {
        console.error('Error fetching layout stats:', err);
      }
    }
    fetchStats();
  }, [user]);

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const toggleLang = () => {
    setLang(lang === 'uz' ? 'ru' : 'uz');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      onLogout();
    } catch (err) {
      console.error('Error logging out:', err);
      // Fallback local logout
      onLogout();
    }
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, labelUz: 'Bosh sahifa', labelRu: 'Главная' },
    { id: 'mocks', icon: FileText, labelUz: 'Mocklar', labelRu: 'Моки' },
    { id: 'bookmarks', icon: Bookmark, labelUz: 'Eslatmalar', labelRu: 'Закладки' },
    { id: 'progress', icon: TrendingUp, labelUz: 'Progress', labelRu: 'Прогресс' },
    { id: 'ai-tutor', icon: Bot, labelUz: 'AI ustoz', labelRu: 'ИИ-репетитор' },
    { id: 'essay-review', icon: Edit3, labelUz: 'AI Esse', labelRu: 'ИИ Эссе' }
  ];

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView lang={lang} user={user} onNavigate={(tab) => navigate(`/${tab}`)} stats={stats} />;
      case 'mocks':
        return <MocksView lang={lang} user={user} onStartExam={onStartExam} onNavigate={(tab) => navigate(`/${tab}`)} />;
      case 'custom-test':
        return <CustomTestSetupView lang={lang} onStartCustomTest={onStartCustomExam} />;
      case 'mistakes':
        return <MistakesView lang={lang} onStartMistakeRetry={onStartMistakeRetry} />;
      case 'bookmarks':
        return <BookmarksView lang={lang} onStartMistakeRetry={onStartMistakeRetry} />;
      case 'progress':
        return <ProgressView lang={lang} stats={stats} user={user} onNavigate={(tab) => navigate(`/${tab}`)} />;
      case 'ai-tutor':
        return <AiTutorView lang={lang} user={user} stats={stats} onNavigate={(tab) => navigate(`/${tab}`)} />;
      case 'essay-review':
        return <EssayReviewView lang={lang} user={user} />;
      case 'pricing':
        return <PricingView lang={lang} />;
      case 'profile':
        return <ProfileView lang={lang} user={user} isAdmin={isAdmin} />;
      default:
        return <DashboardView lang={lang} user={user} onNavigate={(tab) => navigate(`/${tab}`)} stats={stats} />;
    }
  };

  return (
    <div className="workspace-container">
      {/* Mobile Header / Hamburger */}
      <div className="workspace-mobile-header">
        <div 
          className="minimal-brand" 
          style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          onClick={() => { navigate('/dashboard'); setIsMobileMenuOpen(false); }}
        >
          <img 
            src="/logo-189.png" 
            alt="189 Logo" 
            style={{ height: '38px', width: 'auto', objectFit: 'contain' }} 
          />
          <span style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.8px', color: '#0F172A' }}>
            PREP
          </span>
        </div>
        <button className="btn-icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} color="#0F172A" /> : <Menu size={24} color="#0F172A" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`workspace-sidebar ${isMobileMenuOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-top">
          <div 
            className="minimal-brand" 
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: isCollapsed ? '0 0 24px 0' : '0 12px 24px 12px', cursor: 'pointer', justifyContent: isCollapsed ? 'center' : 'flex-start' }}
            onClick={() => navigate('/dashboard')}
          >
            <img 
              src="/logo-189.png" 
              alt="189 Logo" 
              style={{ height: '38px', width: 'auto', objectFit: 'contain' }} 
            />
            {!isCollapsed && (
              <span style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.8px', color: '#0F172A' }}>
                PREP
              </span>
            )}
          </div>

          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  navigate(`/${item.id}`);
                  setIsMobileMenuOpen(false);
                }}
                className={`sidebar-nav-item ${activeView === item.id ? 'active' : ''}`}
                title={isCollapsed ? (lang === 'uz' ? item.labelUz : item.labelRu) : ''}
              >
                <item.icon size={20} className="nav-icon" />
                {!isCollapsed && <span>{lang === 'uz' ? item.labelUz : item.labelRu}</span>}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          {/* Profile Button */}
          <button 
            onClick={() => {
              navigate('/profile');
              setIsMobileMenuOpen(false);
            }} 
            className={`sidebar-bottom-item ${activeView === 'profile' ? 'active-bottom' : ''}`}
            style={{ 
              background: activeView === 'profile' ? '#0F172A' : 'transparent',
              color: activeView === 'profile' ? '#FFFFFF' : '#0F172A',
            }}
            title={isCollapsed ? (lang === 'uz' ? 'Profil' : 'Профиль') : ''}
          >
            <User size={18} className="nav-icon" style={{ opacity: activeView === 'profile' ? 1 : 0.8 }} />
            {!isCollapsed && <span>{lang === 'uz' ? 'Profil' : 'Профиль'}</span>}
          </button>

          {/* Language Switcher */}
          <div ref={langRef} style={{ position: 'relative', width: '100%' }}>
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="sidebar-bottom-item"
              style={{ width: '100%', justifyContent: isCollapsed ? 'center' : 'space-between' }}
              title={isCollapsed ? (lang === 'uz' ? "O'zbekcha" : "Русский") : ''}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {lang === 'uz' ? <UzFlag /> : <RuFlag />}
                {!isCollapsed && <span>{lang === 'uz' ? "O'zbekcha" : "Русский"}</span>}
              </div>
              {!isCollapsed && <ChevronDown size={14} color="#0F172A" style={{ opacity: 0.5 }} />}
            </button>
            {isLangOpen && (
              <div style={{ position: 'absolute', bottom: '100%', left: '0', marginBottom: '8px', background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.1)', borderRadius: '8px', padding: '4px', display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '120px', zIndex: 50, boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setLang('uz'); setIsLangOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: lang === 'uz' ? 'rgba(15, 23, 42, 0.04)' : 'transparent', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#0F172A', width: '100%', textAlign: 'left' }}
                >
                  <UzFlag /> O'zbekcha
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setLang('ru'); setIsLangOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: lang === 'ru' ? 'rgba(15, 23, 42, 0.04)' : 'transparent', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#0F172A', width: '100%', textAlign: 'left' }}
                >
                  <RuFlag /> Русский
                </button>
              </div>
            )}
          </div>
          

          {/* Admin Switch Button */}
          {isAdmin && (
            <>
              <button 
                onClick={onEnterAdmin} 
                className="sidebar-bottom-item"
                style={{ color: '#2563eb', marginBottom: '8px' }}
                title={isCollapsed ? "Admin Panel" : ""}
              >
                <ShieldAlert size={18} className="nav-icon" />
                {!isCollapsed && <span>{lang === 'uz' ? 'Admin Panel' : 'Админ Панель'}</span>}
              </button>
            </>
          )}

          {/* Logout */}
          <button onClick={handleLogout} className="sidebar-bottom-item" title={isCollapsed ? (lang === 'uz' ? 'Chiqish' : 'Выйти') : ''}>
            <LogOut size={18} className="nav-icon" />
            {!isCollapsed && <span>{lang === 'uz' ? 'Chiqish' : 'Выйти'}</span>}
          </button>

          {/* Collapse Toggle */}
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="sidebar-collapse-btn desktop-only">
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="workspace-main">
        {renderActiveView()}
      </main>
      
      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div className="workspace-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}
    </div>
  );
}
