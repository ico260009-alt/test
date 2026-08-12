import React, { useState, useEffect } from 'react';
import { Flame, Calendar, Target, Award, ArrowRight, FileText, Bot, ListChecks } from 'lucide-react';
import NotificationsDropdown from '../../../components/NotificationsDropdown';
import { supabase } from '../../../lib/supabase';

export default function DashboardView({ lang, user, onNavigate, stats }) {
  const [daysLeft, setDaysLeft] = useState(0);
  const [countdownStr, setCountdownStr] = useState('');
  const [examDate, setExamDate] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [liveStats, setLiveStats] = useState({ streak: 0, avgScore: 0 });

  // Fetch real stats and profile from Supabase
  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        // Fetch profile to get custom exam date
        const { data: profile } = await supabase
          .from('profiles')
          .select('exam_date')
          .eq('id', user.id)
          .single();

        if (profile && profile.exam_date) {
          setExamDate(new Date(profile.exam_date));
        } else {
          setExamDate(new Date('2026-08-01T00:00:00')); // default
        }

        // Fetch all test sessions for stats and activity feed
        const { data: allSessions } = await supabase
          .from('test_sessions')
          .select('score, completed_at, test_id, mock_tests(title, subject, exam_system)')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false });

        if (allSessions && allSessions.length > 0) {
          // Set recent activity (first 5)
          const recentSessions = allSessions.slice(0, 5);
          setRecentActivity(recentSessions.map(s => ({
            id: s.test_id || Math.random(),
            title: s.mock_tests?.title || (lang === 'uz' ? 'Test natijalari' : 'Результаты теста'),
            score: s.score,
            time: s.completed_at,
            icon: 'test'
          })));

          // Calculate Streak
          let calculatedStreak = 0;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const sessionDates = [...new Set(allSessions
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
              calculatedStreak = 1;
              for (let i = 1; i < sessionDates.length; i++) {
                if (sessionDates[i - 1] - sessionDates[i] === oneDayMs) {
                  calculatedStreak++;
                } else {
                  break;
                }
              }
            }
          }

          // Calculate Average Score ONLY for DTM tests
          let calculatedAvgScore = 0;
          const dtmSessions = allSessions.filter(s => s.mock_tests?.exam_system === 'dtm');
          if (dtmSessions.length > 0) {
            const totalScore = dtmSessions.reduce((sum, s) => sum + (s.score || 0), 0);
            calculatedAvgScore = Math.round(totalScore / dtmSessions.length);
          }

          setLiveStats({
            streak: calculatedStreak,
            avgScore: calculatedAvgScore
          });
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoadingStats(false);
      }
    }

    fetchData();
  }, [user, lang]);

  // Live countdown timer
  useEffect(() => {
    if (!examDate) return;

    const updateTimer = () => {
      const now = new Date();
      const diffTime = examDate - now;

      if (diffTime <= 0) {
        setCountdownStr(lang === 'uz' ? 'Imtihon boshlandi!' : 'Экзамен начался!');
        setDaysLeft(0);
        return;
      }

      const d = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const h = Math.floor((diffTime / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diffTime / 1000 / 60) % 60);
      const s = Math.floor((diffTime / 1000) % 60);

      setDaysLeft(d);
      
      if (lang === 'uz') {
        setCountdownStr(`${d} kun, ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      } else {
        setCountdownStr(`${d} дн, ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    };

    updateTimer(); // initial call
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [examDate, lang]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (lang === 'uz') {
      if (hour < 12) return 'Xayrli tong';
      if (hour < 18) return 'Xayrli kun';
      return 'Xayrli kech';
    } else {
      if (hour < 12) return 'Доброе утро';
      if (hour < 18) return 'Добрый день';
      return 'Добрый вечер';
    }
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (lang === 'uz') {
      if (mins < 60) return `${mins} daqiqa oldin`;
      if (hours < 24) return `${hours} soat oldin`;
      return `${days} kun oldin`;
    } else {
      if (mins < 60) return `${mins} мин. назад`;
      if (hours < 24) return `${hours} ч. назад`;
      return `${days} дн. назад`;
    }
  };

  const emailName = user?.email?.split('@')[0] || 'abituriyent';
  const displayName = user?.full_name || (emailName.charAt(0).toUpperCase() + emailName.slice(1));

  return (
    <div className="dashboard-wrapper fade-in">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title" style={{ fontSize: '28px', marginBottom: '8px' }}>
            {getGreeting()}, <span style={{ background: 'linear-gradient(135deg, #2563EB 0%, #2563EB 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{displayName}</span> 👋
          </h1>
          <p className="dashboard-subtitle">
            {lang === 'uz' 
              ? "Bugungi o'quv rejangizni davom ettirishga tayyormisiz?" 
              : "Готовы продолжить свой учебный план сегодня?"}
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <NotificationsDropdown user={user} lang={lang} />
          <button onClick={() => onNavigate('mocks')} className="btn-primary-workspace">
            <span>{lang === 'uz' ? 'Mock test ishlash' : 'Пройти мок-тест'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </header>

      {/* Top Widgets Grid */}
      <div className="dashboard-widgets-grid">
        {/* Streak Widget */}
        <div className="widget-card streak-card">
          <div className="widget-icon-box bg-orange">
            <Flame size={24} className="text-orange" />
          </div>
          <div className="widget-content">
            <h3 className="widget-value">{liveStats.streak || 0} {lang === 'uz' ? 'kun' : 'дней'}</h3>
            <p className="widget-label">{lang === 'uz' ? 'Uzluksiz o\'qish' : 'Непрерывное обучение'}</p>
          </div>
          <div className="widget-decoration streak-deco"></div>
        </div>

        {/* Exam Countdown Widget */}
        <div className="widget-card countdown-card">
          <div className="widget-icon-box bg-blue">
            <Calendar size={24} className="text-blue" />
          </div>
          <div className="widget-content">
            <h3 className="widget-value" style={{ fontSize: '20px', whiteSpace: 'nowrap' }}>{countdownStr || '...'}</h3>
            <p className="widget-label">{lang === 'uz' ? 'Imtihongacha qoldi' : 'Осталось до экзамена'}</p>
          </div>
          <div className="widget-decoration countdown-deco"></div>
        </div>

        {/* Goal/Target Widget */}
        <div className="widget-card target-card">
          <div className="widget-icon-box bg-green">
            <Target size={24} className="text-green" />
          </div>
          <div className="widget-content">
            <h3 className="widget-value">{liveStats.avgScore || 0} <span style={{ fontSize: '14px', fontWeight: '500', color: 'rgba(15, 23, 42, 0.5)' }}>/ 189</span></h3>
            <p className="widget-label">{lang === 'uz' ? 'O\'rtacha ball' : 'Средний балл'}</p>
          </div>
        </div>
      </div>

      {/* Main Content Area (Radar + Recent) */}
      <div className="dashboard-main-grid">
        {/* Progress Radar (Mocked with CSS for now) */}
        <div className="glass-panel radar-panel">
          <div className="panel-header">
            <h2 className="panel-title">
              {lang === 'uz' ? 'Ko\'nikmalar Radari' : 'Радар Навыков'}
            </h2>
            <Award size={20} className="text-muted" />
          </div>
          
          <div className="radar-container">
            {/* Simple CSS-based Hexagon/Radar placeholder */}
            <div className="radar-chart-placeholder">
              <div className="radar-grid-bg"></div>
              <div className="radar-data-polygon"></div>
              
              <span className="radar-label label-top">Matn</span>
              <span className="radar-label label-right">Grammatika</span>
              <span className="radar-label label-bottom-right">Mantiq</span>
              <span className="radar-label label-bottom-left">Leksika</span>
              <span className="radar-label label-left">Uslubiyat</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-panel activity-panel">
          <div className="panel-header">
            <h2 className="panel-title">
              {lang === 'uz' ? 'So\'nggi Faollik' : 'Последняя Активность'}
            </h2>
          </div>
          
          <div className="activity-list">
            {loadingStats ? (
              <p style={{ color: 'rgba(15, 23, 42, 0.4)', padding: '16px', textAlign: 'center' }}>
                {lang === 'uz' ? 'Yuklanmoqda...' : 'Загрузка...'}
              </p>
            ) : recentActivity.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <FileText size={32} style={{ color: 'rgba(15, 23, 42, 0.15)', marginBottom: '12px' }} />
                <p style={{ color: 'rgba(15, 23, 42, 0.4)', fontSize: '14px' }}>
                  {lang === 'uz' 
                    ? 'Hali faollik yo\'q. Birinchi testingizni boshlang!' 
                    : 'Активности пока нет. Начните свой первый тест!'}
                </p>
              </div>
            ) : (
              recentActivity.map((item) => (
                <div key={item.id} className="activity-item premium-hover">
                  <div className="activity-icon-wrapper bg-blue">
                    <FileText size={18} className="text-blue" />
                  </div>
                  <div className="activity-details">
                    <h4>{item.title}</h4>
                    <p>
                      <span style={{ color: '#2563EB', fontWeight: '600' }}>{item.score} ball</span> • {getTimeAgo(item.time)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
