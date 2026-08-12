import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import Navbar from './components/layout/Navbar';
import LandingPage from './pages/LandingPage/LandingPage';
import Footer from './components/layout/Footer';
import AuthPage from './pages/AuthPage/AuthPage';
import ResetPasswordView from './pages/AuthPage/ResetPasswordView';
import WorkspaceLayout from './pages/Workspace/WorkspaceLayout';
import AdminLayout from './pages/Admin/AdminLayout';
import ExamLayout from './pages/ExamArena/ExamLayout';
import PracticeLayout from './pages/PracticeArena/PracticeLayout';
import LegalPage from './pages/LegalPage/LegalPage';
import NotFoundPage from './pages/NotFoundPage';
import ScoreReportModal from './components/exam/ScoreReportModal';
import { supabase } from './lib/supabase';

// ─── SessionStorage helpers (survives refresh, cleared when tab closes) ────────

const SESSION_EXAM_CONFIG_KEY = 'session_examConfig';
const SESSION_EXAM_RESULT_KEY = 'session_examResult';

function ssGet(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function ssSet(key, value) {
  try {
    if (value == null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota — silently ignore */ }
}

function ssClear(...keys) {
  keys.forEach(k => { try { sessionStorage.removeItem(k); } catch {} });
}

/**
 * Clears all ExamLayout localStorage caches (exam_result:* and exam_progress:*)
 * so a freshly-started exam never picks up a stale result from a previous run.
 */
function clearAllExamLocalCaches() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('exam_result:') || k.startsWith('exam_progress:'))
      .forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

// ─── Route Guards ─────────────────────────────────────────────────────────────

/** Redirects to /login if not authenticated (saves the intended path for redirect-back) */
function PrivateRoute({ user, isInitializing, children }) {
  const location = useLocation();
  if (isInitializing) return <div style={{ height: '100vh', background: 'var(--bg-page)' }} />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

/** Redirects non-admins to 404 */
function AdminRoute({ user, isAdmin, isInitializing, children }) {
  if (isInitializing) return <div style={{ height: '100vh', background: 'var(--bg-page)' }} />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/404" replace />;
  return children;
}

/**
 * /exam guard — reads examConfig directly from sessionStorage (synchronously)
 * so it always sees the freshest value, even if React state hasn't flushed yet.
 *
 * /exam is visible in the URL during an active exam so the user can see it,
 * but the URL is NOT directly enterable to start a new exam:
 *   - logged-in visitors (no active exam config)  → /mocks
 *   - unauthenticated                             → /login
 * On a refresh the examConfig is restored from sessionStorage so the exam
 * continues from where the user left off.
 */
function ExamRoute({ user, isInitializing, children }) {
  const location = useLocation();
  // Read from sessionStorage directly — React state may not have flushed yet
  // when this component first renders after navigate('/exam') is called.
  const examConfig = ssGet(SESSION_EXAM_CONFIG_KEY);
  if (isInitializing) return <div style={{ height: '100vh', background: 'var(--bg-page)' }} />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!examConfig) return <Navigate to="/mocks" replace />;
  return children;
}

/**
 * /exam/results — protected by auth + a valid result in sessionStorage.
 * Logged-in users with no result (no active result, direct link) → /mocks.
 * Unauthenticated → /login.
 */
function ExamResultsRoute({ user, isInitializing, children }) {
  const location = useLocation();
  const hasResult = !!ssGet(SESSION_EXAM_RESULT_KEY);
  if (isInitializing) return <div style={{ height: '100vh', background: 'var(--bg-page)' }} />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!hasResult) return <Navigate to="/mocks" replace />;
  return children;
}

/** Redirects already-authenticated users away from /login */
function GuestRoute({ user, isInitializing, children }) {
  if (isInitializing) return <div style={{ height: '100vh', background: 'var(--bg-page)' }} />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('app_lang');
    return saved ? JSON.parse(saved) : 'uz';
  });
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  // Exam / Practice state — restored from sessionStorage on refresh
  const [examConfig, setExamConfig] = useState(() => ssGet(SESSION_EXAM_CONFIG_KEY));
  const [practiceConfig, setPracticeConfig] = useState(null);

  // Keep sessionStorage in sync with examConfig state
  useEffect(() => {
    ssSet(SESSION_EXAM_CONFIG_KEY, examConfig);
  }, [examConfig]);

  // Persist lang preference
  useEffect(() => localStorage.setItem('app_lang', JSON.stringify(lang)), [lang]);

  // ── Auth helpers ─────────────────────────────────────────────────────────────

  const fetchProfile = async (userId) => {
    if (!userId) return { isAdmin: false, profile: null };
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    return { isAdmin: data?.role === 'admin', profile: data };
  };

  const mergeUserWithProfile = (authUser, profile) => {
    if (!authUser) return null;
    return {
      ...authUser,
      full_name: profile?.full_name || null,
      phone: profile?.phone || null,
      subscription_until: profile?.subscription_until || null,
      subscription_tier: profile?.subscription_tier || 'free',
      target_score: profile?.target_score || null,
      target_university: profile?.target_university || null,
    };
  };

  const processPendingExamSubmit = async (userId) => {
    try {
      const pendingStr = localStorage.getItem('pending_exam_submit');
      if (pendingStr) {
        const pending = JSON.parse(pendingStr);
        if (pending && pending.user_id === userId && pending.test_id) {
          const { error } = await supabase.from('test_sessions').insert([{
            user_id: pending.user_id,
            test_id: pending.test_id,
            score: pending.score,
            completed_at: new Date().toISOString()
          }]);
          if (error) console.error('Pending exam submit failed:', error);
        }
        localStorage.removeItem('pending_exam_submit');
      }
    } catch (e) {
      console.error('Failed to process pending exam submit', e);
      localStorage.removeItem('pending_exam_submit');
    }
  };

  // ── Auth setup ───────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { isAdmin: adminStatus, profile } = await fetchProfile(session.user.id);
        setUser(mergeUserWithProfile(session.user, profile));
        setIsAdmin(adminStatus);
        await processPendingExamSubmit(session.user.id);
      } else {
        setUser(null);
      }
      setIsInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        navigate('/reset-password', { replace: true });
      }

      if (session?.user) {
        const { isAdmin: adminStatus, profile } = await fetchProfile(session.user.id);
        setUser(mergeUserWithProfile(session.user, profile));
        setIsAdmin(adminStatus);
        await processPendingExamSubmit(session.user.id);

        if (event === 'SIGNED_IN') {
           fetch('/api/auth/log', {
             method: 'POST',
             headers: {
               'Authorization': `Bearer ${session.access_token}`,
               'Content-Type': 'application/json'
             }
           }).catch(console.error);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setExamConfig(null);
        setPracticeConfig(null);
        ssClear(SESSION_EXAM_CONFIG_KEY, SESSION_EXAM_RESULT_KEY);
      }
      setIsInitializing(false);
    });

    // Online presence tracking
    let globalChannel;
    supabase.auth.getSession().then(({ data: { session } }) => {
      const userId = session?.user?.id || 'guest-' + Math.random().toString(36).substring(7);
      globalChannel = supabase.channel('global_online', {
        config: { presence: { key: userId } },
      });

      const updatePresence = () => {
        const state = globalChannel.presenceState();
        let count = 0;
        const users = [];
        for (const id in state) {
          count += state[id].length;
          state[id].forEach(p => {
             if (p.online_at) users.push(p);
          });
        }
        window.currentOnlineUsers = count;
        window.dispatchEvent(new CustomEvent('onlineUsersChanged', { detail: count }));
        window.dispatchEvent(new CustomEvent('onlineUsersDataChanged', { detail: users }));
      };

      globalChannel
        .on('presence', { event: 'sync' }, updatePresence)
        .on('presence', { event: 'join' }, updatePresence)
        .on('presence', { event: 'leave' }, updatePresence)
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            let ipAddress = 'Noma\'lum';
            try {
              const res = await fetch('https://api.ipify.org?format=json');
              const data = await res.json();
              ipAddress = data.ip;
            } catch (e) {
              // ignore
            }

            await globalChannel.track({
              online_at: new Date().toISOString(),
              user_id: session?.user?.id || userId,
              email: session?.user?.email || 'Mehmon',
              full_name: session?.user?.user_metadata?.full_name || 'Mehmon',
              ip_address: ipAddress,
              device_info: navigator.userAgent
            });
          }
        });
    });

    return () => {
      subscription.unsubscribe();
      if (globalChannel) supabase.removeChannel(globalChannel);
    };
  }, []);

  // ── Action handlers ───────────────────────────────────────────────────────────

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setExamConfig(null);
    setPracticeConfig(null);
    ssClear(SESSION_EXAM_CONFIG_KEY, SESSION_EXAM_RESULT_KEY);
    navigate('/', { replace: true });
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    // Redirect back to the page the user was trying to visit before login,
    // or to /dashboard as the default.
    const from = location.state?.from?.pathname || '/dashboard';
    navigate(from, { replace: true });
  };

  const handleStartExam = (testIdOrConfig) => {
    // Clear stale sessionStorage result AND all localStorage exam caches so
    // ExamLayout doesn't find an old cached result and jump straight to /exam/results.
    ssClear(SESSION_EXAM_RESULT_KEY);
    clearAllExamLocalCaches();
    const config = (typeof testIdOrConfig === 'object' && testIdOrConfig.isALevel)
      ? { customConfig: testIdOrConfig, testId: null }
      : { testId: testIdOrConfig, customConfig: null };
    // Write to sessionStorage SYNCHRONOUSLY before navigate so ExamRoute
    // sees the value on the very first render (React state flush may lag behind).
    ssSet(SESSION_EXAM_CONFIG_KEY, config);
    setExamConfig(config);
    navigate('/exam');
  };

  const handleStartCustomExam = (config) => {
    ssClear(SESSION_EXAM_RESULT_KEY);
    clearAllExamLocalCaches();
    const examCfg = { customConfig: config, testId: null };
    ssSet(SESSION_EXAM_CONFIG_KEY, examCfg);
    setExamConfig(examCfg);
    navigate('/exam');
  };

  const handleStartMistakeRetry = (ids) => {
    setPracticeConfig({ retryIds: ids });
    navigate('/practice');
  };

  /**
   * Called by ExamLayout when the exam is finished and a result is ready.
   * Saves result to sessionStorage (survives refresh) and navigates to /exam/results.
   */
  const handleExamComplete = (resultObj) => {
    ssSet(SESSION_EXAM_RESULT_KEY, resultObj);
    // Clear the exam config — the exam is over
    setExamConfig(null);
    navigate('/exam/results', { replace: true });
  };

  const handleExitResults = () => {
    ssClear(SESSION_EXAM_RESULT_KEY, SESSION_EXAM_CONFIG_KEY);
    setExamConfig(null);
    navigate('/mocks', { replace: true });
  };

  const handleExitExam = () => {
    ssClear(SESSION_EXAM_CONFIG_KEY);
    setExamConfig(null);
    navigate('/mocks', { replace: true });
  };

  const handleExitPractice = () => {
    setPracticeConfig(null);
    navigate('/dashboard', { replace: true });
  };

  if (isRecoveryMode) {
    return <ResetPasswordView lang={lang} onComplete={() => { setIsRecoveryMode(false); navigate('/dashboard', { replace: true }); }} />;
  }

  // ── Routes ────────────────────────────────────────────────────────────────────

  return (
    <Routes>
      {/* ── Public ─────────────────────────────────────── */}
      <Route
        path="/"
        element={
          isInitializing
            ? <div style={{ height: '100vh', background: 'var(--bg-page)' }} />
            : user
              ? <Navigate to="/dashboard" replace />
              : (
                <div className="app-container">
                  <div>
                    <Navbar lang={lang} setLang={setLang} onStartTest={() => navigate('/login')} />
                    <main>
                      <LandingPage lang={lang} onStartTest={() => navigate('/login')} />
                    </main>
                  </div>
                  <Footer lang={lang} onOpenLegal={(type) => navigate(`/legal/${type}`)} />
                </div>
              )
        }
      />

      <Route
        path="/login"
        element={
          <GuestRoute user={user} isInitializing={isInitializing}>
            <AuthPage
              lang={lang}
              onAuthSuccess={handleAuthSuccess}
              onBackToHome={() => navigate('/')}
            />
          </GuestRoute>
        }
      />

      <Route
        path="/reset-password"
        element={
          <ResetPasswordView
            lang={lang}
            onComplete={() => navigate('/dashboard', { replace: true })}
          />
        }
      />

      <Route
        path="/legal/:type"
        element={<LegalPage onBack={() => navigate(-1)} />}
      />

      {/* ── Protected: Workspace tabs ───────────────────── */}
      {[
        'dashboard', 'mocks', 'bookmarks', 'progress',
        'ai-tutor', 'essay-review', 'profile', 'pricing',
        'mistakes', 'custom-test',
      ].map((tab) => (
        <Route
          key={tab}
          path={`/${tab}`}
          element={
            <PrivateRoute user={user} isInitializing={isInitializing}>
              <WorkspaceLayout
                user={user}
                lang={lang}
                setLang={setLang}
                onLogout={handleLogout}
                isAdmin={isAdmin}
                onEnterAdmin={() => navigate('/admin')}
                onStartExam={handleStartExam}
                onStartMistakeRetry={handleStartMistakeRetry}
                onStartCustomExam={handleStartCustomExam}
                initialView={tab}
              />
            </PrivateRoute>
          }
        />
      ))}

      {/* ── Protected: Active Exam ──────────────────────── */}
      <Route
        path="/exam"
        element={
          <ExamRoute user={user} isInitializing={isInitializing}>
            {/* Read config from sessionStorage directly (same source ExamRoute uses) */}
            {(() => {
              const cfg = ssGet(SESSION_EXAM_CONFIG_KEY);
              return (
                <ExamLayout
                  user={user}
                  testId={cfg?.testId}
                  customConfig={cfg?.customConfig}
                  onExamComplete={handleExamComplete}
                  onExit={handleExitExam}
                />
              );
            })()}
          </ExamRoute>
        }
      />

      {/* ── Protected: Exam Results ─────────────────────── */}
      <Route
        path="/exam/results"
        element={
          <ExamResultsRoute user={user} isInitializing={isInitializing}>
            <ScoreReportModal
              result={ssGet(SESSION_EXAM_RESULT_KEY)}
              onRestart={handleExitResults}
              onExit={handleExitResults}
              user={user}
            />
          </ExamResultsRoute>
        }
      />

      {/* ── Protected: Practice ─────────────────────────── */}
      <Route
        path="/practice"
        element={
          <PrivateRoute user={user} isInitializing={isInitializing}>
            {practiceConfig
              ? (
                <PracticeLayout
                  user={user}
                  config={null}
                  retryIds={practiceConfig?.retryIds}
                  onExit={handleExitPractice}
                />
              )
              : <Navigate to="/dashboard" replace />
            }
          </PrivateRoute>
        }
      />

      {/* ── Admin ───────────────────────────────────────── */}
      <Route
        path="/admin"
        element={
          <AdminRoute user={user} isAdmin={isAdmin} isInitializing={isInitializing}>
            <AdminLayout
              user={user}
              onLogout={handleLogout}
              onExitAdmin={() => navigate('/dashboard')}
            />
          </AdminRoute>
        }
      />

      {/* ── 404 ─────────────────────────────────────────── */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
