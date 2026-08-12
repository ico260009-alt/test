import React, { useState } from 'react';
import { Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ResetPasswordView({ lang = 'uz', onComplete }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(lang === 'ru' ? 'Пароли не совпадают' : 'Parollar mos kelmadi');
      return;
    }
    if (password.length < 6) {
      setError(lang === 'ru' ? 'Пароль должен содержать минимум 6 символов' : 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-minimal">
        <h1 className="auth-title">
          {lang === 'ru' ? 'Сброс пароля' : 'Parolni yangilash'}
        </h1>
        <p className="auth-subtitle">
          {lang === 'ru' ? 'Введите новый пароль для вашей учетной записи.' : 'Hisobingiz uchun yangi parolni kiriting.'}
        </p>

        {success ? (
          <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
            <p style={{ color: '#059669', fontWeight: '600', margin: 0 }}>
              {lang === 'ru' ? 'Пароль успешно изменен!' : 'Parol muvaffaqiyatli o\'zgartirildi!'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field-group">
              <label className="auth-label">
                {lang === 'ru' ? 'Новый пароль' : 'Yangi parol'}
              </label>
              <div className="auth-input-box">
                <Lock size={18} color="rgba(15, 23, 42, 0.4)" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={lang === 'ru' ? 'Введите новый пароль' : 'Yangi parolni kiriting'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-eye-btn"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-field-group">
              <label className="auth-label">
                {lang === 'ru' ? 'Подтвердите пароль' : 'Parolni tasdiqlang'}
              </label>
              <div className="auth-input-box">
                <Lock size={18} color="rgba(15, 23, 42, 0.4)" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={lang === 'ru' ? 'Подтвердите новый пароль' : 'Yangi parolni tasdiqlang'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

            {error && (
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '16px' }}>
                <AlertCircle size={18} color="#0F172A" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '13px', color: '#0F172A', margin: 0, lineHeight: '1.4' }}>
                  {error}
                </p>
              </div>
            )}

            <button type="submit" className="btn-auth-primary" disabled={loading}>
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>{lang === 'ru' ? 'Сохранить' : 'Saqlash'}</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
