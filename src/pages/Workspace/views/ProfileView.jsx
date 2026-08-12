import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Target, GraduationCap, Lock, Save, Loader2, AlertTriangle, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function ProfileView({ lang, user, isAdmin }) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  
  // State for form fields
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    targetUniversity: '',
    targetScore: '189',
    examDate: ''
  });

  useEffect(() => {
    async function getProfile() {
      if (!user) return;
      try {
        setFetching(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, phone, target_university, target_score, exam_date')
          .eq('id', user.id)
          .single();
          
        if (data) {
          let formattedDate = '';
          if (data.exam_date) {
            const dateObj = new Date(data.exam_date);
            const tzOffset = dateObj.getTimezoneOffset() * 60000;
            formattedDate = (new Date(dateObj - tzOffset)).toISOString().slice(0, 16);
          }
          
          setFormData({
            fullName: data.full_name || '',
            phone: data.phone || '',
            targetUniversity: data.target_university || '',
            targetScore: data.target_score || '189',
            examDate: formattedDate
          });
        }
      } catch (error) {
        console.error('Error fetching profile', error);
      } finally {
        setFetching(false);
      }
    }
    getProfile();
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setSuccessMsg('');
    try {
      // Clean up inputs to match SQL validation
      const cleanPhone = formData.phone ? formData.phone.replace(/[\s-]/g, '') : null;
      // If phone is just "+", treat as null
      const finalPhone = (cleanPhone === '+' || cleanPhone === '') ? null : cleanPhone;

      const { error, data } = await supabase.rpc('update_my_profile', {
        p_full_name: formData.fullName?.trim() || null,
        p_phone: finalPhone,
        p_target_score: formData.targetScore?.trim() || null,
        p_target_university: formData.targetUniversity?.trim() || null,
        p_exam_date: formData.examDate || null
      });

      if (error) {
        console.error('Supabase RPC error details:', error);
        throw error;
      }
      
      onUpdateProfile({ 
        ...user, 
        full_name: formData.fullName,
        phone: formData.phone,
        target_score: formData.targetScore,
        target_university: formData.targetUniversity
      });
      
      setSuccessMsg(lang === 'uz' ? 'Ma\'lumotlar saqlandi!' : 'Данные сохранены!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert(lang === 'uz' ? `Xatolik yuz berdi: ${error.message || 'Iltimos qayta urinib ko\'ring'}` : `Произошла ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await supabase.auth.resetPasswordForEmail(user.email);
      alert(lang === 'uz' ? 'Parolni tiklash havolasi emailingizga yuborildi!' : 'Ссылка для сброса пароля отправлена на ваш email!');
    } catch (err) {
      console.error(err);
      alert(lang === 'uz' ? 'Xatolik yuz berdi.' : 'Произошла ошибка.');
    }
  };

  const toggleAdminPro = async () => {
    if (!user || !isAdmin) return;
    try {
      const isPro = user.subscription_tier !== 'free';
      const newTier = isPro ? 'free' : 'pro';
      const newUntil = isPro ? null : new Date(Date.now() + 365*24*60*60*1000).toISOString();
      const { error } = await supabase.from('profiles').update({
        subscription_tier: newTier,
        subscription_until: newUntil
      }).eq('id', user.id);
      if (error) throw error;
      window.location.reload();
    } catch(err) {
      console.error(err);
      alert('Xatolik yuz berdi');
    }
  };

  return (
    <div className="profile-wrapper fade-in">
      <header className="dashboard-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="dashboard-title">
            {lang === 'uz' ? 'Profil Sozlamalari' : 'Настройки Профиля'}
          </h1>
          <p className="dashboard-subtitle">
            {lang === 'uz' ? 'Shaxsiy ma\'lumotlar va imtihon maqsadlarini boshqarish' : 'Управление личными данными и целями экзамена'}
          </p>
        </div>
      </header>

      <div className="profile-grid">
        {/* Left Column: Avatar & Quick Info */}
        <div className="profile-col-left">
          <div className="glass-panel profile-user-card">
            <div className="avatar-lg bg-blue">
              <User size={40} className="text-blue" />
            </div>
            <h2 className="profile-name">
              {fetching ? '...' : (formData.fullName || (lang === 'uz' ? 'Abituriyent' : 'Студент'))}
            </h2>
            <p className="profile-email">{user?.email}</p>
            <div className="profile-role-badge">
              {lang === 'uz' ? 'Foydalanuvchi' : 'Пользователь'}
            </div>
            {isAdmin && (
              <button 
                onClick={toggleAdminPro} 
                className="btn-outline-primary" 
                style={{ marginTop: '16px', width: '100%', fontSize: '13px' }}
              >
                {user?.subscription_tier !== 'free' ? 'PRO o\'chirish (Admin)' : 'PRO yoqish (Admin)'}
              </button>
            )}
          </div>

          <div className="glass-panel profile-danger-zone">
            <h3 className="danger-title">
              <AlertTriangle size={18} />
              {lang === 'uz' ? 'Xavfsizlik' : 'Безопасность'}
            </h3>
            <button onClick={handlePasswordReset} className="btn-outline-danger">
              <Lock size={16} />
              {lang === 'uz' ? 'Parolni yangilash havolasini yuborish' : 'Отправить ссылку для обновления пароля'}
            </button>
          </div>
        </div>

        {/* Right Column: Edit Forms */}
        <div className="profile-col-right">
          <div className="glass-panel">
            <form onSubmit={handleSave} className="profile-form">
              <h3 className="form-section-title">{lang === 'uz' ? 'Shaxsiy Ma\'lumotlar' : 'Личные Данные'}</h3>
              
              <div className="form-row">
                <div className="input-group">
                  <label>{lang === 'uz' ? 'To\'liq ism' : 'Полное имя'}</label>
                  <div className="input-box">
                    <User size={18} color="rgba(15, 23, 42, 0.4)" />
                    <input 
                      type="text" 
                      name="fullName"
                      placeholder={lang === 'uz' ? 'Ismingizni kiriting' : 'Введите ваше имя'}
                      value={formData.fullName}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                
                <div className="input-group">
                  <label>{lang === 'uz' ? 'Telefon raqam' : 'Номер телефона'}</label>
                  <div className="input-box">
                    <Phone size={18} color="rgba(15, 23, 42, 0.4)" />
                    <input 
                      type="tel" 
                      name="phone"
                      placeholder="+998 90 123 45 67"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Email</label>
                  <div className="input-box disabled">
                    <Mail size={18} color="rgba(15, 23, 42, 0.4)" />
                    <input 
                      type="email" 
                      value={user?.email || ''} 
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="divider-horizontal"></div>

              <h3 className="form-section-title">{lang === 'uz' ? 'Imtihon Maqsadlari' : 'Цели Экзамена'}</h3>
              
              <div className="form-row">
                <div className="input-group">
                  <label>{lang === 'uz' ? 'Maqsad qilingan OTM / Fakultet' : 'Целевой ВУЗ / Факультет'}</label>
                  <div className="input-box">
                    <GraduationCap size={18} color="rgba(15, 23, 42, 0.4)" />
                    <input 
                      type="text" 
                      name="targetUniversity"
                      placeholder={lang === 'uz' ? 'Masalan: JIDU' : 'Например: УМЭД'}
                      value={formData.targetUniversity}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                
                <div className="input-group">
                  <label>{lang === 'uz' ? 'Maqsad qilingan ball' : 'Целевой балл'}</label>
                  <div className="input-box">
                    <Target size={18} color="rgba(15, 23, 42, 0.4)" />
                    <select name="targetScore" value={formData.targetScore} onChange={handleChange}>
                      <option value="189">189 (Maksimal)</option>
                      <option value="150">150+</option>
                      <option value="120">120+</option>
                      <option value="90">90+</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>{lang === 'uz' ? 'Imtihon sanasi va vaqti' : 'Дата и время экзамена'}</label>
                  <div className="input-box">
                    <Calendar size={18} color="rgba(15, 23, 42, 0.4)" />
                    <input 
                      type="datetime-local" 
                      name="examDate"
                      value={formData.examDate}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                {successMsg && (
                  <span className="success-msg text-green">{successMsg}</span>
                )}
                <button type="submit" className="btn-primary-workspace" disabled={loading}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>{lang === 'uz' ? 'Saqlash' : 'Сохранить'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
