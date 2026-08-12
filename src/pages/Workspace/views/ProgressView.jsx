import React, { useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Lock, TrendingUp, ArrowRight, ArrowLeft, Activity, Sparkles, BrainCircuit, Target, Filter, ChevronUp, ChevronDown, Trophy, Flame, Eye, X, BarChart2, Star, AlertTriangle, RefreshCw, ThumbsUp, BookOpen, Zap } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts';
import ReactMarkdown from 'react-markdown';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getScoreColor(score) {
  if (score >= 85) return { color: '#059669', bg: '#D1FAE5', label: '🟢' };
  if (score >= 60) return { color: '#D97706', bg: '#FEF3C7', label: '🟡' };
  return { color: '#DC2626', bg: '#FEE2E2', label: '🔴' };
}

function ScoreBadge({ score }) {
  const { color, bg } = getScoreColor(score);
  return (
    <span style={{ padding: '4px 10px', borderRadius: '8px', background: bg, color, fontWeight: '800', fontSize: '14px' }}>
      {score}
    </span>
  );
}

// ── Streak Calculator ─────────────────────────────────────────────────────────

function calcStreak(history) {
  if (!history.length) return 0;
  const days = [...new Set(history.map(t => new Date(t.completed_at).toDateString()))].sort((a, b) => new Date(b) - new Date(a));
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (const dayStr of days) {
    const d = new Date(dayStr);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((cursor - d) / 86400000);
    if (diff <= 1) { streak++; cursor = d; }
    else break;
  }
  return streak;
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

function DetailModal({ session, onClose, isUz }) {
  const score = session.score || 0;
  const { color, bg } = getScoreColor(score);
  const totalQ = session.mock_tests?.question_count || null;
  const estimatedCorrect = totalQ ? Math.round((score / 100) * totalQ) : null;
  const examSystem = session.mock_tests?.exam_system?.toUpperCase() || '-';
  const subject = session.mock_tests?.subject || '-';
  const title = session.mock_tests?.title || subject;

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="fade-in-up" style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>{title}</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>{formatDate(session.completed_at)}</p>
          </div>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={20} color="#64748B" />
          </button>
        </div>

        {/* Score ring */}
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: bg, border: `6px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', flexDirection: 'column' }}>
            <div style={{ fontSize: '32px', fontWeight: '900', color, lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: '12px', color, fontWeight: '600', opacity: 0.8 }}>{isUz ? 'ball' : 'баллов'}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600', marginBottom: '4px' }}>{isUz ? 'Fan' : 'Предмет'}</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>{subject}</div>
            </div>
            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600', marginBottom: '4px' }}>{isUz ? 'Imtihon' : 'Экзамен'}</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>{examSystem}</div>
            </div>
            {totalQ && (
              <div style={{ background: '#ECFDF5', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#065F46', fontWeight: '600', marginBottom: '4px' }}>{isUz ? 'To\'g\'ri (taxminan)' : 'Верно (прибл.)'}</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#059669' }}>{estimatedCorrect} / {totalQ}</div>
              </div>
            )}
            <div style={{ background: score >= 85 ? '#FEF3C7' : score >= 60 ? '#EFF6FF' : '#FEF2F2', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600', marginBottom: '4px' }}>{isUz ? 'Daraja' : 'Уровень'}</div>
              <div style={{ fontSize: '13px', fontWeight: '800', color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                {score >= 85 ? <><Trophy size={14}/> {isUz ? "A'la" : 'Отлично'}</> : score >= 60 ? <><ThumbsUp size={14}/> {isUz ? 'Yaxshi' : 'Хорошо'}</> : <><BookOpen size={14}/> {isUz ? 'Mashq kerak' : 'Практика'}</>}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          <button onClick={onClose} style={{ width: '100%', padding: '12px', background: '#0F172A', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}>
            {isUz ? 'Yopish' : 'Закрыть'}
          </button>
        </div>
      </div>
    </div>
  , document.body);
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProgressView({ lang, user, stats, onNavigate }) {
  const isUz = lang === 'uz';
  const hasPremium = user?.subscription_until && new Date(user.subscription_until) > new Date() && user.subscription_tier !== 'free';

  const [testHistory, setTestHistory] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterExam, setFilterExam] = useState('all');
  const [sortDir, setSortDir] = useState('desc');
  const [detailSession, setDetailSession] = useState(null);
  const [goalScore, setGoalScore] = useState(() => parseInt(localStorage.getItem(`189prep_goal_${user?.id}`) || '0'));
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(goalScore || '');

  useEffect(() => {
    if (!hasPremium) return;
    async function fetchData() {
      const { data, error } = await supabase
        .from('test_sessions')
        .select('id, score, completed_at, test_id, mock_tests(subject, exam_system, title, question_count)')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: true });
      if (!error && data) {
        setTestHistory(data);
        if (data.length > 0) fetchAiAnalysis(data.slice(-10));
      }
    }
    fetchData();
  }, [hasPremium, user.id]);

  const fetchAiAnalysis = async (history) => {
    if (!history || history.length === 0) return;
    const cacheKey = `189prep_progress_analysis_${user.id}_len_${history.length}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { setAiAnalysis(cached); return; }
    setIsAnalyzing(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : '');
      const response = await fetch(`${apiUrl}/api/analyze-progress`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ((await supabase.auth.getSession()).data.session?.access_token || '')
        },
        body: JSON.stringify({ testHistory: history, lang })
      });
      const data = await response.json();
      setAiAnalysis(data.analysis);
      localStorage.setItem(cacheKey, data.analysis);
    } catch (e) {
      setAiAnalysis(isUz ? "Tahlil qilishda xatolik yuz berdi." : "Произошла ошибка при анализе.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Locked ──────────────────────────────────────────────────────────────────
  if (!hasPremium) {
    return (
      <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)' }}>
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '48px', background: '#FFFFFF', borderRadius: '32px', border: '1px solid rgba(15, 23, 42, 0.1)', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.1)' }}>
          <div style={{ width: '88px', height: '88px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px auto' }}>
            <Lock size={40} color="#2563EB" />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#0F172A', marginBottom: '16px', letterSpacing: '-0.5px' }}>
            {isUz ? 'Pro tarifiga o\'ting' : 'Перейдите на тариф Pro'}
          </h2>
          <p style={{ fontSize: '16px', color: 'rgba(15, 23, 42, 0.6)', marginBottom: '36px', lineHeight: '1.6' }}>
            {isUz
              ? 'Batafsil statistika, AI tahlili va o\'sish grafigini ko\'rish uchun Pro tarifiga obuna bo\'lishingiz kerak.'
              : 'Для просмотра детальной статистики, ИИ-анализа и графиков вам необходим тариф Pro.'}
          </p>
          <button onClick={() => onNavigate('pricing')} style={{ width: '100%', padding: '16px', background: '#0F172A', color: '#FFFFFF', borderRadius: '16px', border: 'none', fontSize: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 8px 16px -4px rgba(15, 23, 42, 0.2)' }}>
            <TrendingUp size={20} />
            <span>{isUz ? "Ta'riflarni ko'rish" : "Посмотреть тарифы"}</span>
            <ArrowRight size={20} />
          </button>
          <button onClick={() => onNavigate('dashboard')} style={{ width: '100%', padding: '16px', background: 'transparent', color: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px', border: 'none', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
            <ArrowLeft size={18} />
            <span>{isUz ? 'Bosh sahifaga qaytish' : 'Вернуться на главную'}</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const allSubjects = [...new Set(testHistory.map(t => t.mock_tests?.subject).filter(Boolean))];
  const allExams = [...new Set(testHistory.map(t => t.mock_tests?.exam_system).filter(Boolean))];

  const filteredHistory = useMemo(() => {
    let h = [...testHistory];
    if (filterSubject !== 'all') h = h.filter(t => t.mock_tests?.subject === filterSubject);
    if (filterExam !== 'all') h = h.filter(t => t.mock_tests?.exam_system === filterExam);
    return sortDir === 'desc' ? h.reverse() : h;
  }, [testHistory, filterSubject, filterExam, sortDir]);

  const chartData = testHistory.map((t, index) => ({
    name: `${index + 1}`,
    score: t.score || 0,
    date: formatDate(t.completed_at),
  }));

  const highestScore = testHistory.length > 0 ? Math.max(...testHistory.map(t => t.score || 0)) : 0;
  const latestScore = testHistory.length > 0 ? (testHistory[testHistory.length - 1].score || 0) : 0;
  const avgScore = testHistory.length > 0 ? Math.round(testHistory.reduce((s, t) => s + (t.score || 0), 0) / testHistory.length) : 0;
  const streak = calcStreak(testHistory);

  const subjectStats = {};
  testHistory.forEach(t => {
    const subj = t.mock_tests?.subject || 'Unknown';
    if (!subjectStats[subj]) subjectStats[subj] = { totalScore: 0, count: 0 };
    subjectStats[subj].totalScore += t.score || 0;
    subjectStats[subj].count += 1;
  });
  const subjectAverages = Object.entries(subjectStats)
    .filter(([s]) => s !== 'Unknown' && s !== 'unknown')
    .map(([subject, data]) => ({ subject, avg: Math.round(data.totalScore / data.count) }))
    .sort((a, b) => b.avg - a.avg);

  const bestSubject = subjectAverages[0]?.subject || '-';
  const worstSubject = subjectAverages[subjectAverages.length - 1]?.subject || '-';

  const examStats = {};
  testHistory.forEach(t => {
    const exam = t.mock_tests?.exam_system || 'Unknown';
    if (!examStats[exam]) examStats[exam] = { totalScore: 0, count: 0 };
    examStats[exam].totalScore += t.score || 0;
    examStats[exam].count += 1;
  });
  const examAverages = Object.entries(examStats)
    .filter(([e]) => e !== 'Unknown' && e !== 'unknown')
    .map(([exam, data]) => ({ exam: exam.toUpperCase(), avg: Math.round(data.totalScore / data.count) }))
    .sort((a, b) => b.avg - a.avg);

  const saveGoal = () => {
    const v = parseInt(goalInput);
    if (!isNaN(v) && v > 0 && v <= 100) {
      setGoalScore(v);
      localStorage.setItem(`189prep_goal_${user?.id}`, v);
    }
    setEditingGoal(false);
  };

  // ── Custom Tooltip ────────────────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const sc = d.score;
      const { color, bg } = getScoreColor(sc);
      return (
        <div style={{ background: '#fff', border: `2px solid ${color}`, borderRadius: '12px', padding: '12px 16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>{d.date}</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color }}>{sc}</div>
        </div>
      );
    }
    return null;
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', width: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
      {detailSession && <DetailModal session={detailSession} onClose={() => setDetailSession(null)} isUz={isUz} />}

      {/* Header */}
      <header style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #10B981, #059669)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.25)' }}>
          <TrendingUp size={28} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.5px' }}>
            {isUz ? 'Progress va Analitika' : 'Прогресс и Аналитика'}
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '15px', marginTop: '4px' }}>
            {isUz ? "Sizning o'qish tarixingiz va AI tahlili" : "История вашего обучения и ИИ-анализ"}
          </p>
        </div>
      </header>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { icon: <Activity size={20} />, bg: '#EFF6FF', iconColor: '#3B82F6', label: isUz ? "O'rtacha ball" : 'Средний балл', value: avgScore, type: 'score' },
          { icon: <TrendingUp size={20} />, bg: '#F0FDF4', iconColor: '#22C55E', label: isUz ? 'Eng yuqori' : 'Максимум', value: highestScore, type: 'score' },
          { icon: <Target size={20} />, bg: '#FFF7ED', iconColor: '#F97316', label: isUz ? "So'nggi natija" : 'Последний', value: latestScore, type: 'score' },
          { icon: <Flame size={20} />, bg: '#FEF2F2', iconColor: '#EF4444', label: isUz ? 'Streak (kun)' : 'Стрик (дней)', value: streak, type: 'streak' },
          { icon: <BarChart2 size={20} />, bg: '#F5F3FF', iconColor: '#8B5CF6', label: isUz ? 'Jami testlar' : 'Всего тестов', value: testHistory.length, type: 'count' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#FFFFFF', padding: '18px 16px', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ background: card.bg, padding: '7px', borderRadius: '10px', color: card.iconColor, display: 'flex' }}>{card.icon}</div>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600', lineHeight: 1.2 }}>{card.label}</span>
            </div>
            {card.type === 'score' ? (
              <ScoreBadge score={card.value} />
            ) : card.type === 'streak' ? (
              <div style={{ fontSize: '26px', fontWeight: '800', color: card.value > 0 ? '#EF4444' : '#94A3B8' }}>{card.value}</div>
            ) : (
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A' }}>{card.value}</div>
            )}
          </div>
        ))}
      </div>

      {/* Goal Score Card */}
      <div style={{ background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', borderRadius: '20px', padding: '20px 24px', border: '1px solid #DDD6FE', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#8B5CF6', color: 'white', padding: '10px', borderRadius: '12px' }}>
            <Star size={20} />
          </div>
          <div>
            <div style={{ fontWeight: '700', color: '#4C1D95', fontSize: '15px' }}>
              {isUz ? 'Maqsadli ball' : 'Целевой балл'}
            </div>
            <div style={{ fontSize: '13px', color: '#6D28D9' }}>
              {isUz ? 'Grafikda ko\'rsatiladi' : 'Отображается на графике'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {editingGoal ? (
            <>
              <input
                type="number" min="1" max="100"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                style={{ width: '80px', padding: '8px 12px', borderRadius: '10px', border: '2px solid #8B5CF6', fontSize: '16px', fontWeight: '700', color: '#4C1D95', outline: 'none', textAlign: 'center' }}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && saveGoal()}
              />
              <button onClick={saveGoal} style={{ padding: '8px 16px', background: '#8B5CF6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                {isUz ? 'Saqlash' : 'Сохранить'}
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: '28px', fontWeight: '800', color: '#4C1D95' }}>{goalScore > 0 ? goalScore : '—'}</span>
              <button onClick={() => { setGoalInput(goalScore || ''); setEditingGoal(true); }} style={{ padding: '8px 16px', background: 'white', color: '#8B5CF6', border: '2px solid #8B5CF6', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                {isUz ? "O'zgartirish" : 'Изменить'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* AI Analysis Card */}
      <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', padding: '24px', borderRadius: '24px', border: '1px solid #BFDBFE', marginBottom: '28px', position: 'relative', overflow: 'hidden' }}>
        <Sparkles size={120} color="#3B82F6" style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.08 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: '#3B82F6', color: 'white', padding: '8px', borderRadius: '10px' }}>
            <BrainCircuit size={20} />
          </div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1E3A8A' }}>
            {isUz ? 'AI Tahlil va Maslahatlar' : 'ИИ-Анализ и Советы'}
          </h2>
        </div>
        <div style={{ fontSize: '15px', color: '#1E40AF', lineHeight: '1.7', position: 'relative', zIndex: 2 }}>
          {isAnalyzing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="spin-anim"><Sparkles size={16} /></div>
              {isUz ? 'Natijalaringiz tahlil qilinmoqda...' : 'Анализ ваших результатов...'}
            </div>
          ) : (
            <div className="markdown-body" style={{ background: 'transparent' }}>
              {aiAnalysis
                ? <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                : <p style={{ margin: 0 }}>{isUz ? 'Hozircha tahlil uchun yetarli test yechilmagan.' : 'Пока недостаточно тестов для анализа.'}</p>}
            </div>
          )}
        </div>
        {/* Refresh analysis */}
        {aiAnalysis && (
          <button
            onClick={() => {
              const cacheKey = `189prep_progress_analysis_${user.id}_len_${testHistory.slice(-10).length}`;
              localStorage.removeItem(cacheKey);
              setAiAnalysis(null);
              fetchAiAnalysis(testHistory.slice(-10));
            }}
            style={{ marginTop: '16px', padding: '8px 16px', background: 'white', border: '1px solid #BFDBFE', borderRadius: '10px', color: '#2563EB', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} />
            {isUz ? 'Yangi tahlil olish' : 'Обновить анализ'}
          </button>
        )}
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div style={{ background: '#FFFFFF', borderRadius: '24px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>
              {isUz ? 'Ballar dinamikasi' : 'Динамика баллов'}
            </h2>
            <div style={{ display: 'flex', gap: '10px', fontSize: '12px', fontWeight: '600' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#059669', background: '#D1FAE5', padding: '4px 10px', borderRadius: '20px' }}><Zap size={12} fill="#059669" /> 85+</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#D97706', background: '#FEF3C7', padding: '4px 10px', borderRadius: '20px' }}><Zap size={12} fill="#D97706" /> 60–84</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#DC2626', background: '#FEE2E2', padding: '4px 10px', borderRadius: '20px' }}><Zap size={12} fill="#DC2626" /> 0–59</span>
            </div>
          </div>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                {goalScore > 0 && (
                  <ReferenceLine y={goalScore} stroke="#8B5CF6" strokeDasharray="6 3" strokeWidth={2} label={{ value: isUz ? `Maqsad: ${goalScore}` : `Цель: ${goalScore}`, position: 'right', fill: '#8B5CF6', fontSize: 12, fontWeight: 700 }} />
                )}
                <Line type="monotone" dataKey="score" name={isUz ? "Ball" : "Балл"} stroke="#2563EB" strokeWidth={3} dot={({ cx, cy, payload }) => {
                  const { color } = getScoreColor(payload.score);
                  return <circle key={cx} cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={2} />;
                }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {subjectAverages.length > 0 && (
        <div style={{ background: '#FFFFFF', borderRadius: '24px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', marginBottom: '28px' }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>
            {isUz ? "Fanlar bo'yicha o'rtacha ballar" : "Средние баллы по предметам"}
          </h2>
          <div style={{ height: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectAverages} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} itemStyle={{ color: '#0F172A', fontWeight: 'bold' }} cursor={{ fill: '#F1F5F9' }} />
                <Bar dataKey="avg" name={isUz ? "O'rtacha Ball" : "Средний балл"} radius={[8, 8, 0, 0]}
                  fill="#10B981"
                  label={{ position: 'top', fontSize: 12, fontWeight: 700, fill: '#64748B' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Worst subject warning */}
          {subjectAverages.length > 1 && (
            <div style={{ marginTop: '16px', padding: '12px 16px', background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#DC2626', fontWeight: '600' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              {isUz ? `Eng zaif fan: ${worstSubject} — ko'proq mashq qiling!` : `Слабый предмет: ${worstSubject} — нужно больше практики!`}
            </div>
          )}
        </div>
      )}

      {examAverages.length > 0 && (
        <div style={{ background: '#FFFFFF', borderRadius: '24px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', marginBottom: '28px' }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>
            {isUz ? "Imtihon turlari bo'yicha o'rtacha ballar" : "Средние баллы по типам экзаменов"}
          </h2>
          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={examAverages} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="exam" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 'bold' }} dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} itemStyle={{ color: '#0F172A', fontWeight: 'bold' }} cursor={{ fill: '#F1F5F9' }} />
                <Bar dataKey="avg" name={isUz ? "O'rtacha Ball" : "Средний балл"} fill="#8B5CF6" radius={[8, 8, 0, 0]} label={{ position: 'top', fontSize: 12, fontWeight: 700, fill: '#64748B' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Test History Table with Filters */}
      {testHistory.length > 0 && (
        <div style={{ background: '#FFFFFF', borderRadius: '24px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>
              {isUz ? "Testlar tarixi" : "История тестов"}
            </h2>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Filter size={16} color="#64748B" />
              {allSubjects.length > 1 && (
                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', color: '#0F172A', background: '#F8FAFC', cursor: 'pointer', outline: 'none' }}>
                  <option value="all">{isUz ? 'Barcha fanlar' : 'Все предметы'}</option>
                  {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              {allExams.length > 1 && (
                <select value={filterExam} onChange={e => setFilterExam(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', color: '#0F172A', background: '#F8FAFC', cursor: 'pointer', outline: 'none' }}>
                  <option value="all">{isUz ? 'Barcha imtihonlar' : 'Все экзамены'}</option>
                  {allExams.map(e => <option key={e} value={e}>{e.toUpperCase()}</option>)}
                </select>
              )}
              <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#0F172A' }}>
                {sortDir === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                {isUz ? 'Sana' : 'Дата'}
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: '13px' }}>
                  <th style={{ padding: '10px 16px', fontWeight: '600' }}>№</th>
                  <th style={{ padding: '10px 16px', fontWeight: '600' }}>{isUz ? "Sana" : "Дата"}</th>
                  <th style={{ padding: '10px 16px', fontWeight: '600' }}>{isUz ? "Fan" : "Предмет"}</th>
                  <th style={{ padding: '10px 16px', fontWeight: '600' }}>{isUz ? "Imtihon" : "Экзамен"}</th>
                  <th style={{ padding: '10px 16px', fontWeight: '600' }}>{isUz ? "Ball" : "Балл"}</th>
                  <th style={{ padding: '10px 16px', fontWeight: '600' }}>{isUz ? "Batafsil" : "Детали"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((t, idx) => (
                  <tr key={t.id || idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#94A3B8', fontWeight: '600' }}>
                      {filteredHistory.length - idx}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' }}>
                      {formatDate(t.completed_at)}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#3B82F6', fontWeight: '600' }}>
                      {t.mock_tests?.subject || '-'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '4px 10px', background: '#F1F5F9', borderRadius: '6px', fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                        {t.mock_tests?.exam_system ? t.mock_tests.exam_system.toUpperCase() : '-'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <ScoreBadge score={t.score || 0} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button onClick={() => setDetailSession(t)}
                        style={{ padding: '6px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', color: '#2563EB', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Eye size={13} /> {isUz ? "Ko'rish" : "Смотреть"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredHistory.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>
                {isUz ? "Filtrga mos test topilmadi" : "Тестов по фильтру не найдено"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {testHistory.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px', color: '#64748B' }}>
          <Trophy size={48} color="#E2E8F0" style={{ marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: '#0F172A' }}>
            {isUz ? "Hali birorta test yechilmagan" : "Тестов пока нет"}
          </h3>
          <p style={{ margin: 0 }}>
            {isUz ? "Mock testlarni ishlang va natijalaringiz bu yerda ko'rinadi." : "Проходите тесты, и результаты появятся здесь."}
          </p>
          <button onClick={() => onNavigate('mocks')} style={{ marginTop: '20px', padding: '12px 24px', background: '#0F172A', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '15px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ArrowRight size={18} />
            {isUz ? "Mock testlarga o'tish" : "Перейти к тестам"}
          </button>
        </div>
      )}
    </div>
  );
}
