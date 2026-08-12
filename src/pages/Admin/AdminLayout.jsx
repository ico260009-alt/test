import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, BookOpen, Settings, LogOut, ArrowLeft } from 'lucide-react';
import AdminDashboard from './views/AdminDashboard';
import AdminUsers from './views/AdminUsers';
import AdminTests from './views/AdminTests';
import AdminSettings from './views/AdminSettings';
import AdminAnalytics from './views/AdminAnalytics';
import AdminNotifications from './views/AdminNotifications';
import AdminAuditLogs from './views/AdminAuditLogs';
import AdminReports from './views/AdminReports';
import AdminSecurity from './views/AdminSecurity';
import { BarChart2, Bell, Shield, FileText, List } from 'lucide-react';
import './Admin.css';

export default function AdminLayout({ user, onLogout, onExitAdmin }) {
  const [activeView, setActiveView] = useState(() => {
    const saved = localStorage.getItem('admin_activeView');
    return saved ? JSON.parse(saved) : 'dashboard';
  });

  useEffect(() => localStorage.setItem('admin_activeView', JSON.stringify(activeView)), [activeView]);

  const navItems = [
    { id: 'dashboard', label: 'Boshqaruv Paneli', icon: LayoutDashboard },
    { id: 'users', label: 'Foydalanuvchilar', icon: Users },
    { id: 'tests', label: 'Testlar', icon: BookOpen },
    { id: 'analytics', label: 'Analitika (QA)', icon: BarChart2 },
    { id: 'reports', label: 'Hisobotlar', icon: FileText },
    { id: 'notifications', label: 'Xabarnomalar', icon: Bell },
    { id: 'audit', label: 'Audit Jurnali', icon: List },
    { id: 'security', label: 'Xavfsizlik', icon: Shield },
    { id: 'settings', label: 'Sozlamalar', icon: Settings },
  ];

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-top">
          <div className="admin-brand">
            <span className="admin-logo-text">189PREP <span className="admin-badge">ADMIN</span></span>
          </div>

          <nav className="admin-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`admin-nav-item ${activeView === item.id ? 'active' : ''}`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="admin-sidebar-bottom">
          <button onClick={onExitAdmin} className="admin-nav-item">
            <ArrowLeft size={20} />
            <span>Workspace'ga qaytish</span>
          </button>
          
          <button onClick={onLogout} className="admin-nav-item text-red">
            <LogOut size={20} />
            <span>Tizimdan chiqish</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {activeView === 'dashboard' && <AdminDashboard />}
        {activeView === 'users' && <AdminUsers />}
        { activeView === 'tests' && <AdminTests /> }
        { activeView === 'analytics' && <AdminAnalytics /> }
        { activeView === 'reports' && <AdminReports /> }
        { activeView === 'notifications' && <AdminNotifications /> }
        { activeView === 'audit' && <AdminAuditLogs /> }
        { activeView === 'security' && <AdminSecurity /> }
        { activeView === 'settings' && <AdminSettings /> }
      </main>
    </div>
  );
}
