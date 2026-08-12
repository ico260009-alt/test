import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Globe, ChevronDown } from 'lucide-react';

const UzFlag = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '2px', border: '1px solid rgba(0,0,0,0.1)' }}>
    <rect width="16" height="4" fill="#0099B5"/>
    <rect y="4" width="16" height="4" fill="#FFFFFF"/>
    <rect y="8" width="16" height="4" fill="#1EB53A"/>
    <rect y="3.5" width="16" height="0.5" fill="#CE1126"/>
    <rect y="8" width="16" height="0.5" fill="#CE1126"/>
  </svg>
);

const RuFlag = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '2px', border: '1px solid rgba(0,0,0,0.1)' }}>
    <rect width="16" height="4" fill="#FFFFFF"/>
    <rect y="4" width="16" height="4" fill="#1C3578"/>
    <rect y="8" width="16" height="4" fill="#E4181C"/>
  </svg>
);


export default function Navbar({ lang, setLang, onStartTest }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header className={`minimal-navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container navbar-container">
        {/* Patterned 189 Ikat Logo + PREP */}
        <div 
          onClick={() => scrollToSection('hero')}
          className="minimal-brand"
        >
          <img 
            src="/logo-189.png" 
            alt="189 Logo" 
            className="brand-logo-img"
          />
          <span className="brand-logo-text">
            PREP
          </span>
        </div>

        {/* Minimal Nav Links: Bosh sahifa, Imkoniyatlar, Narxlar, FAQ */}
        <nav className="minimal-nav-links">
          <button
            onClick={() => scrollToSection('hero')}
            className="minimal-nav-item"
          >
            {lang === 'ru' ? 'Главная' : 'Bosh sahifa'}
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="minimal-nav-item"
          >
            {lang === 'ru' ? 'Возможности' : 'Imkoniyatlar'}
          </button>
          <button
            onClick={() => scrollToSection('pricing')}
            className="minimal-nav-item"
          >
            {lang === 'ru' ? 'Тарифы' : 'Narxlar'}
          </button>
          <button
            onClick={() => scrollToSection('faq')}
            className="minimal-nav-item"
          >
            FAQ
          </button>
        </nav>

        {/* Language Switcher & Testni Boshlash CTA Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* UZ / RU Dropdown */}
          <div className="lang-switcher" style={{ position: 'relative', cursor: 'pointer' }} ref={langRef} onClick={() => setIsLangOpen(!isLangOpen)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0F172A', userSelect: 'none' }}>
              {lang === 'uz' ? <><UzFlag /> UZ</> : <><RuFlag /> RU</>}
              <ChevronDown size={14} color="rgba(15, 23, 42, 0.5)" />
            </span>
            {isLangOpen && (
              <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '8px', background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.1)', borderRadius: '8px', padding: '4px', display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '80px', zIndex: 50, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setLang('uz'); setIsLangOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: lang === 'uz' ? 'rgba(15, 23, 42, 0.04)' : 'transparent', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#0F172A', width: '100%', textAlign: 'left' }}
                >
                  <UzFlag /> UZ
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setLang('ru'); setIsLangOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: lang === 'ru' ? 'rgba(15, 23, 42, 0.04)' : 'transparent', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#0F172A', width: '100%', textAlign: 'left' }}
                >
                  <RuFlag /> RU
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onStartTest}
            className="btn-minimal-dark navbar-cta-btn"
          >
            <span>{lang === 'ru' ? 'Начать тест' : 'Testni Boshlash'}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
