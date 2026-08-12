import React from 'react';
import { ShieldCheck, Send } from 'lucide-react';
import { TRANSLATIONS } from '../../data/translations';

export default function Footer({ lang = 'uz', onOpenLegal }) {
  const t = TRANSLATIONS[lang].footer;

  return (
    <footer style={{ background: '#FFFFFF', borderTop: '1px solid rgba(15, 23, 42, 0.1)', padding: '64px 0 32px' }}>
      <div className="container" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '48px' }}>
        
        {/* Brand Section */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img 
              src="/logo-189.png" 
              alt="189 Logo" 
              style={{ height: '32px', width: 'auto', objectFit: 'contain' }} 
            />
            <span style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.5px', color: '#0F172A' }}>
              prep
            </span>
          </div>
          <p style={{ fontSize: '15px', color: 'rgba(15, 23, 42, 0.5)', lineHeight: '1.6', maxWidth: '360px' }}>
            {t.desc}
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.03)', padding: '8px 16px', borderRadius: '9999px', fontWeight: '600', fontSize: '13px', color: '#0F172A', width: 'fit-content', border: '1px solid rgba(15, 23, 42, 0.1)' }}>
            <ShieldCheck size={16} color="#2563EB" />
            {lang === 'ru' ? 'Стандарты Агентства оценки знаний' : 'Bilimni baholash agentligi (DTM)'}
          </div>
        </div>

        {/* Links Section */}
        <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap' }}>
          
          {/* Legal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontWeight: '800', color: '#0F172A', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {lang === 'ru' ? 'Документы' : "Hujjatlar"}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '15px', color: 'rgba(15, 23, 42, 0.5)', fontWeight: '500' }}>
              <span style={{ cursor: 'pointer' }} className="footer-link" onClick={() => onOpenLegal && onOpenLegal('privacy')}>
                {lang === 'ru' ? 'Политика конфиденциальности' : 'Maxfiylik siyosati'}
              </span>
              <span style={{ cursor: 'pointer' }} className="footer-link" onClick={() => onOpenLegal && onOpenLegal('terms')}>
                {lang === 'ru' ? 'Условия использования' : 'Foydalanish shartlari'}
              </span>
              <span style={{ cursor: 'pointer' }} className="footer-link" onClick={() => onOpenLegal && onOpenLegal('offer')}>
                {lang === 'ru' ? 'Договор публичной оферты' : 'Ommaviy oferta shartnomasi'}
              </span>
            </div>
          </div>

          {/* Social Media */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontWeight: '800', color: '#0F172A', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {lang === 'ru' ? 'Мы в соцсетях' : "Ijtimoiy tarmoqlar"}
            </h4>
            <div style={{ display: 'flex', gap: '12px' }}>
              <a 
                href="https://t.me/prep189" 
                target="_blank" 
                rel="noopener noreferrer"
                className="footer-social-icon"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(15, 23, 42, 0.04)', color: 'rgba(15, 23, 42, 0.6)', transition: 'all 0.2s' }}
              >
                <Send size={18} />
              </a>
              <a 
                href="https://www.instagram.com/189prep/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="footer-social-icon"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(15, 23, 42, 0.04)', color: 'rgba(15, 23, 42, 0.6)', transition: 'all 0.2s' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* Copyright */}
      <div className="container" style={{ marginTop: '64px', paddingTop: '32px', borderTop: '1px solid rgba(15, 23, 42, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <p style={{ fontSize: '14px', color: 'rgba(15, 23, 42, 0.4)', fontWeight: '500' }}>{t.rights}</p>
      </div>
    </footer>
  );
}
