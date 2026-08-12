import React, { useState } from 'react';
import { Save, Globe, Mail, Bell, Shield, Database } from 'lucide-react';

export default function AdminSettings() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setLoading(true);
    // Mock save
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 800);
  };

  return (
    <div className="admin-view fade-in">
      <header className="admin-header">
        <h1>Sozlamalar</h1>
        <p>Platformaning umumiy sozlamalarini boshqarish</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        <div className="admin-panel">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={20} className="text-blue" />
            Umumiy Sozlamalar
          </h2>
          
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'rgba(15, 23, 42, 0.4)' }}>Platforma Nomi</label>
              <input type="text" defaultValue="189PREP" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#0F172A', color: 'white' }} />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'rgba(15, 23, 42, 0.4)' }}>Asosiy E'lon (Barcha uchun)</label>
              <textarea defaultValue="Diqqat! Yangi DTM blok testlari bazaga qo'shildi." rows={3} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#0F172A', color: 'white', resize: 'vertical' }} />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'rgba(15, 23, 42, 0.4)' }}>Aloqa Email Manzili</label>
              <input type="email" defaultValue="support@189prep.uz" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#0F172A', color: 'white' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '8px', border: 'none', background: '#2563EB', color: 'white', fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                <Save size={18} />
                {loading ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
            
            {success && <p style={{ color: '#2563EB', textAlign: 'right', marginTop: '-12px', fontSize: '14px' }}>Muvaffaqiyatli saqlandi!</p>}
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="admin-panel" style={{ padding: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '16px' }}>
              <Shield size={18} className="text-orange" />
              Xavfsizlik
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(15, 23, 42, 0.4)', lineHeight: '1.5', marginBottom: '16px' }}>
              Platforma xavfsizligi Supabase RLS orqali ta'minlanadi. Parol va sessiyalarni boshqarish Supabase panelida amalga oshiriladi.
            </p>
            <button style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(15, 23, 42, 0.03)', cursor: 'pointer' }}>
              Sessiyalarni tozalash
            </button>
          </div>

          <div className="admin-panel" style={{ padding: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '16px' }}>
              <Database size={18} className="text-green" />
              Tizim Ma'lumotlari
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'rgba(15, 23, 42, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Versiya:</span> <span style={{ color: 'rgba(15, 23, 42, 0.03)' }}>v1.2.4</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>MB hajmi:</span> <span style={{ color: 'rgba(15, 23, 42, 0.03)' }}>42 MB / 500 MB</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Holati:</span> <span style={{ color: '#2563EB' }}>Onlayn</span></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
