import React, { useState, useEffect } from 'react';
import { Users, BookOpen, CreditCard, TrendingUp, ShieldAlert } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function AdminDashboard() {
  const [recentUsers, setRecentUsers] = useState([]);
  const [stats, setStats] = useState({ users: 0, tests: 0, subs: 0 });
  const [chartData, setChartData] = useState([0,0,0,0,0,0,0]);
  const [loading, setLoading] = useState(true);

  const [onlineUsers, setOnlineUsers] = useState(window.currentOnlineUsers || 0);

  useEffect(() => {
    // Listen to global event dispatched from App.jsx
    const handleOnlineChange = (e) => setOnlineUsers(e.detail);
    window.addEventListener('onlineUsersChanged', handleOnlineChange);

    async function fetchRecent() {
      try {
        // 1. Recent Users (ordered by created_at)
        const usersPromise = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5);
        
        // 2. Total Users Count
        const countUsersPromise = supabase.from('profiles').select('*', { count: 'exact', head: true });
        
        // 3. Subscriptions Count
        const countSubsPromise = supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('subscription_tier', 'free');
        
        // 4. Total Tests Taken
        const countTestsPromise = supabase.from('test_sessions').select('*', { count: 'exact', head: true });
        
        // 5. Chart Data (Last 7 days)
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const chartPromise = supabase.from('test_sessions').select('completed_at').gte('completed_at', d.toISOString());

        // 6. Registered Today
        const todayStr = new Date();
        todayStr.setHours(0,0,0,0);
        const todayUsersPromise = supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStr.toISOString());

        const [
          { data: recent }, 
          { count: totalUsers }, 
          { count: totalSubs }, 
          { count: totalTests },
          { data: sessions },
          { count: todayUsers }
        ] = await Promise.all([usersPromise, countUsersPromise, countSubsPromise, countTestsPromise, chartPromise, todayUsersPromise]);

        if (recent) setRecentUsers(recent);
        
        setStats({
          users: totalUsers || 0,
          tests: totalTests || 0,
          subs: totalSubs || 0,
          today: todayUsers || 0
        });

        // Calculate chart data (last 7 days counts)
        if (sessions) {
          const counts = [0,0,0,0,0,0,0];
          const today = new Date();
          sessions.forEach(s => {
            const date = new Date(s.completed_at);
            const diffTime = Math.abs(today - date);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays < 7) {
              counts[6 - diffDays]++;
            }
          });
          
          // Normalize for chart height (max 100%)
          const max = Math.max(...counts, 1);
          const normalized = counts.map(c => (c / max) * 100);
          setChartData(normalized);
        }
      } catch (err) {
        console.error('Error fetching recent users', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecent();

    return () => {
      window.removeEventListener('onlineUsersChanged', handleOnlineChange);
    };
  }, []);
  return (
    <div className="admin-view fade-in">
      <header className="admin-header">
        <h1>Umumiy Statistika</h1>
        <p>Platformaning joriy holati va asosiy ko'rsatkichlari</p>
      </header>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="stat-icon-wrapper bg-blue">
            <Users size={24} className="text-blue" />
          </div>
          <div className="stat-content">
            <h3>Jami Foydalanuvchilar</h3>
            <p className="stat-val">{loading ? '...' : stats.users}</p>
            <span className="stat-trend positive"><TrendingUp size={14} /> O'smoqda</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            <Users size={24} color="#10B981" />
          </div>
          <div className="stat-content">
            <h3>Bugun Qo'shilganlar</h3>
            <p className="stat-val">{loading ? '...' : stats.today}</p>
            <span className="stat-trend positive" style={{ color: '#10B981' }}><TrendingUp size={14} /> Yangi</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon-wrapper bg-orange">
            <BookOpen size={24} className="text-orange" />
          </div>
          <div className="stat-content">
            <h3>Ishlangan Testlar</h3>
            <p className="stat-val">{loading ? '...' : stats.tests}</p>
            <span className="stat-trend positive"><TrendingUp size={14} /> Jami</span>
          </div>
        </div>

        <div className="admin-stat-card" style={{ border: '2px solid rgba(16, 185, 129, 0.2)' }}>
          <div className="stat-icon-wrapper" style={{ background: '#10B981' }}>
            <div style={{ width: '12px', height: '12px', background: 'white', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
          </div>
          <div className="stat-content">
            <h3>Saytda Onlayn</h3>
            <p className="stat-val">{onlineUsers}</p>
            <span className="stat-trend positive" style={{ color: '#10B981' }}>Real vaqtda</span>
          </div>
        </div>
      </div>

      <div className="admin-dashboard-layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Chart Panel */}
        <div className="admin-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2>Test Ishlash Faolligi (7 kun)</h2>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '12px', height: '250px', position: 'relative', paddingTop: '40px' }}>
            {/* Real bars */}
            {chartData.map((h, i) => (
              <div key={i} style={{ flex: 1, background: 'linear-gradient(180deg, #2563EB 0%, rgba(59, 130, 246, 0.2) 100%)', height: `${Math.max(h, 5)}%`, borderRadius: '6px 6px 0 0', position: 'relative', transition: 'all 0.3s' }} className="admin-chart-bar" title="Testlar soni">
                <span style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', color: 'rgba(15, 23, 42, 0.4)' }}>{Math.round(h)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Users */}
        <div className="admin-panel" style={{ padding: '24px' }}>
          <h2 style={{ marginBottom: '16px' }}>So'nggi Ro'yxatdan O'tganlar</h2>
          <div className="admin-recent-users" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading ? <p className="text-muted">Yuklanmoqda...</p> : null}
            {!loading && recentUsers.length === 0 ? <p className="text-muted">Foydalanuvchilar topilmadi.</p> : null}
            
            {recentUsers.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(15, 23, 42, 0.03)', borderRadius: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                  {(u.full_name || 'A').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', color: '#0F172A', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {u.full_name || 'Kiritilmagan'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(15, 23, 42, 0.6)' }}>{u.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
