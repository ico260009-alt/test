import React, { useState } from 'react';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import TelegramLoginWidget from '../../components/auth/TelegramLoginWidget';
export default function AuthPage({ lang = 'uz', onAuthSuccess, onBackToHome }) {
  const [loading, setLoading] = useState(null); // 'google', 'telegram', or null
  const [error, setError] = useState(null);

  const handleGoogleAuth = async () => {
    setLoading('google');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
      setLoading(null);
    }
  };

  const handleTelegramAuth = async (user) => {
    setLoading('telegram');
    setError(null);
    try {
      // Send telegram user data to our backend for verification and session generation
      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Non-JSON response from server:", text);
        const snippet = text.substring(0, 100).replace(/\n/g, ' ');
        throw new Error(`Server xatosi: ${snippet}... Iltimos loyihani Vercel'dan to'g'ri Redeploy qiling.`);
      }
      
      if (!res.ok) {
        throw new Error(data.error || 'Telegram orqali kirishda xatolik');
      }

      // Set session in Supabase client
      const { error: sessionError } = await supabase.auth.setSession(data.session);
      
      if (sessionError) throw sessionError;

      // Successfully logged in
      onAuthSuccess({
        email: data.user.email,
        id: data.user.id
      });
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="auth-page-wrapper">
      {/* Back to Home Button */}
      <button
        onClick={onBackToHome}
        className="auth-back-btn"
      >
        <ArrowLeft size={16} />
        <span>{lang === 'ru' ? 'Назад' : 'Orqaga'}</span>
      </button>

      <div className="auth-card-minimal">
        {/* Top Logo Badge */}
        <div className="auth-logo-top" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', justifyContent: 'center' }}>
          <img 
            src="/logo-189.png" 
            alt="189 Logo" 
            style={{ height: '56px', width: 'auto', objectFit: 'contain' }} 
          />
          <span style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '-0.8px', color: '#0F172A' }}>
            prep
          </span>
        </div>

        <h1 className="auth-title">
          {lang === 'ru' ? 'С возвращением!' : 'Xush kelibsiz!'}
        </h1>

        <p className="auth-subtitle" style={{ marginBottom: '32px' }}>
          {lang === 'ru' ? 'Выберите способ входа для продолжения.' : 'Davom etish uchun kirish usulini tanlang.'}
        </p>

        {/* Error Message */}
        {error && (
          <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '16px' }}>
            <AlertCircle size={18} color="#0F172A" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '13px', color: '#0F172A', margin: 0, lineHeight: '1.4' }}>
              {error}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'slideUpFade 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards' }}>
          
          {/* Telegram Sign In Button */}
          <div className="telegram-widget-wrapper" style={{ opacity: loading !== null && loading !== 'telegram' ? 0.6 : 1, pointerEvents: loading !== null ? 'none' : 'auto', position: 'relative' }}>
            {loading === 'telegram' && (
              <div style={{ 
                position: 'absolute', 
                inset: -2, // slightly larger to cover fully
                zIndex: 10, 
                background: 'rgba(255,255,255,0.4)', 
                backdropFilter: 'blur(3px)',
                WebkitBackdropFilter: 'blur(3px)',
                borderRadius: '14px', 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'slideUpFade 0.2s ease-out'
              }}>
                 <div style={{ 
                    background: '#3390EC', 
                    borderRadius: '50%', 
                    padding: '8px', 
                    display: 'flex',
                    boxShadow: '0 4px 12px rgba(51, 144, 236, 0.4)'
                  }}>
                   <Loader2 size={20} className="animate-spin" color="#FFF" />
                 </div>
              </div>
            )}
            <TelegramLoginWidget
              botName={import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'placeholder_bot'}
              buttonSize="large"
              cornerRadius={12}
              lang={lang === 'ru' ? 'ru' : 'en'}
              onAuthCallback={handleTelegramAuth}
            />
          </div>

          <div className="auth-divider">
            <span>{lang === 'ru' ? 'ИЛИ' : 'YOKI'}</span>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading !== null}
            className="btn-auth-google"
            style={{ opacity: loading !== null ? 0.7 : 1, cursor: loading !== null ? 'not-allowed' : 'pointer' }}
          >
            {loading === 'google' ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.37 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
            )}
            <span>
              {lang === 'ru' ? 'Продолжить через Google' : 'Google orqali davom etish'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
