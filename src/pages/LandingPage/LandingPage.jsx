import React, { useState } from 'react';
import {
  ArrowRight, Clock, CheckCircle2,
  Award, BookOpen, Calculator, Globe, HelpCircle, ChevronDown,
  ShieldCheck, Info, Sparkles, Check
} from 'lucide-react';
import { TRANSLATIONS } from '../../data/translations';
import { SUBJECTS } from '../../data/mockExamData';

export default function LandingPage({ lang, onStartTest }) {
  const [openFaq, setOpenFaq] = useState(null);
  const t = TRANSLATIONS[lang];

  return (
    <div>
      {/* ==========================================
          SECTION 1: HERO (#hero) — BOSH SAHIFA
      ========================================== */}
      <section id="hero" className="minimal-hero-section">
        <div className="container hero-content-minimal">
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.04)', border: '1px solid rgba(15, 23, 42, 0.1)', padding: '6px 16px', borderRadius: '9999px', fontSize: '13px', fontWeight: '700', color: '#2563EB' }}>
            <ShieldCheck size={16} />
            <span>{t.hero.badge}</span>
          </div>

          <h1 className="minimal-hero-title">
            {t.hero.title}
          </h1>

          <p className="minimal-hero-subtitle">
            {t.hero.subtitle}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onStartTest('uzbek')}
              className="btn-hero-dark-pill"
            >
              <span>{lang === 'ru' ? 'Начать тест' : 'Testni Boshlash'}</span>
              <ArrowRight size={18} />
            </button>

            <a
              href="#pricing"
              style={{ padding: '14px 28px', borderRadius: '9999px', fontWeight: '700', fontSize: '15px', color: '#0F172A', textDecoration: 'none', border: '1.5px solid rgba(15, 23, 42, 0.1)', background: '#FFFFFF' }}
            >
              {t.hero.ctaSecondary}
            </a>
          </div>
        </div>

        {/* ==========================================
            EXAM ATMOSPHERE SCREENSHOT SHOWCASE
        ========================================== */}
        <div className="hero-screenshot-showcase">
          <div className="hero-screenshot-glow" />
          <div className="hero-screenshot-frame" style={{ background: '#F8F9FA' }}>
            <div className="hero-screenshot-container">
              <div className="hero-screenshot-inner">
              {/* Left Sidebar */}
              <div style={{ width: '180px', background: '#FFFFFF', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <img src="/logo-189.png" alt="189 Logo" style={{ height: '28px', width: 'auto', objectFit: 'contain' }} draggable={false} />
                  <span style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '-0.5px', color: '#111827' }}>PREP</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px' }}>
                  <div style={{ padding: '12px 14px', background: '#EFF6FF', color: '#2563EB', borderRadius: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BookOpen size={18} /> Imtihon
                  </div>
                  <div style={{ padding: '12px 14px', color: '#6B7280', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <HelpCircle size={18} /> Savollar
                  </div>
                  <div style={{ padding: '12px 14px', color: '#6B7280', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle2 size={18} /> Eslatma
                  </div>
                </div>
                <div style={{ marginTop: 'auto', padding: '20px', color: '#111827', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid #E5E7EB' }}>
                  <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} /> Chiqish
                </div>
              </div>

              {/* Main Content */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ height: '60px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '32px', height: '32px', border: '1px solid #E5E7EB', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', cursor: 'pointer' }}>{'<'}</div>
                    <span style={{ fontWeight: '700', color: '#111827', fontSize: '15px' }}>Matematika</span>
                    <span style={{ color: '#D1D5DB' }}>|</span>
                    <span style={{ color: '#9CA3AF', fontSize: '14px' }}>10-sinf</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', background: '#EFF6FF', color: '#2563EB', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>M</div>
                    <span style={{ fontWeight: '500', color: '#374151', fontSize: '14px' }}>mirafzalr2</span>
                  </div>
                </div>

                {/* Content Body */}
                <div style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
                  
                  {/* Pagination Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #E5E7EB', paddingBottom: '16px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <span style={{ fontSize: '20px', fontWeight: '800', color: '#2563EB' }}>16 <span style={{ fontSize: '14px', color: '#9CA3AF', fontWeight: '500' }}>/ 30 savol</span></span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#9CA3AF', fontWeight: '600', fontSize: '14px' }}>
                        <span>13</span><span>14</span><span>15</span>
                        <span style={{ background: '#2563EB', color: '#FFFFFF', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)' }}>16</span>
                        <span>17</span><span>18</span><span>19</span><span>20</span><span>...</span><span>30</span>
                      </div>
                    </div>
                    <span style={{ color: '#6B7280', fontWeight: '600', fontSize: '14px' }}>0%</span>
                  </div>

                  {/* Question Card */}
                  <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '32px', border: '1px solid #E5E7EB' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <span style={{ color: '#2563EB', fontWeight: '700', padding: '6px 16px', borderRadius: '9999px', border: '1px solid #BFDBFE', fontSize: '12px' }}>Q16</span>
                        <span style={{ color: '#3B82F6', fontWeight: '600', background: '#EFF6FF', padding: '6px 16px', borderRadius: '9999px', fontSize: '12px' }}>Bir javobli</span>
                      </div>
                      <span style={{ color: '#2563EB', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                        <Award size={16} /> Eslatmaga qo'shish
                      </span>
                    </div>

                    <div style={{ fontSize: '18px', color: '#111827', marginBottom: '32px', lineHeight: '1.6', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: '"Inter", sans-serif', fontWeight: '600', marginRight: '5px' }}>Agar</span>
                      <span style={{ fontFamily: '"Cambria Math", "Times New Roman", serif', fontSize: '20px' }}>sin <i style={{fontFamily: '"Cambria Math", "Times New Roman", serif', fontStyle: 'italic'}}>a</i> = 0, 6</span>
                      <span style={{ fontFamily: '"Inter", sans-serif', fontWeight: '600', marginLeft: '5px', marginRight: '5px' }}>bo'lsa,</span>
                      <span style={{ fontFamily: '"Cambria Math", "Times New Roman", serif', fontSize: '20px', display: 'flex', alignItems: 'center' }}>
                        <i style={{fontFamily: '"Cambria Math", "Times New Roman", serif', fontStyle: 'italic', marginRight: '4px'}}>a</i> ∈ (0; 
                        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 4px', fontSize: '15px', verticalAlign: 'middle', lineHeight: '1' }}>
                          <span style={{ borderBottom: '1px solid #111827', padding: '0 2px', marginBottom: '2px' }}>π</span>
                          <span style={{ padding: '0 2px' }}>2</span>
                        </span>)
                      </span>
                      <span style={{ fontFamily: '"Inter", sans-serif', fontWeight: '600', marginLeft: '5px', marginRight: '5px' }}>oraliqda bo'lsa</span>
                      <span style={{ fontFamily: '"Cambria Math", "Times New Roman", serif', fontSize: '20px', display: 'flex', alignItems: 'center' }}>
                        cot(
                        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 4px', fontSize: '15px', verticalAlign: 'middle', lineHeight: '1' }}>
                          <span style={{ borderBottom: '1px solid #111827', padding: '0 2px', marginBottom: '2px' }}>π</span>
                          <span style={{ padding: '0 2px' }}>2</span>
                        </span>
                        − 2<i style={{fontFamily: '"Cambria Math", "Times New Roman", serif', fontStyle: 'italic'}}>a</i>)
                      </span>
                      <span style={{ fontFamily: '"Inter", sans-serif', fontWeight: '600', marginLeft: '5px' }}>ni toping.</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
                      {[{l: 'A.', v: '25/7'}, {l: 'B.', v: '24/7'}, {l: 'C.', v: '12/7'}, {l: 'D.', v: '20/7'}].map((opt, i) => (
                        <div key={i} style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s', ...(i === 0 ? {background: '#F9FAFB'} : {}) }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '1.5px solid #D1D5DB', background: '#FFF' }}></div>
                          <span style={{ color: '#2563EB', fontWeight: '700', fontSize: '14px', fontFamily: '"Inter", sans-serif' }}>{opt.l}</span>
                          <span style={{ fontWeight: '400', color: '#111827', fontFamily: '"Cambria Math", "Times New Roman", serif' }}>
                            <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle', lineHeight: '1.1' }}>
                              <span style={{ borderBottom: '1px solid #111827', padding: '0 4px', marginBottom: '2px', fontSize: '13px' }}>{opt.v.split('/')[0]}</span>
                              <span style={{ padding: '0 4px', fontSize: '13px' }}>{opt.v.split('/')[1]}</span>
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#2563EB', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Oldingi savol</span>
                      <div style={{ padding: '12px 24px', background: '#EFF6FF', color: '#2563EB', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><Award size={18}/> Eslatmaga qo'shish</div>
                      <div style={{ padding: '12px 28px', background: '#2563EB', color: '#FFFFFF', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)' }}>Keyingi savol <ArrowRight size={16} /></div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Info size={14}/> Imtihon davomida oynani yopish yoki sahifani tark etish natijalaringizga ta'sir qilishi mumkin.
                  </div>

                </div>
              </div>

              {/* Right Sidebar */}
              <div style={{ width: '280px', background: '#FFFFFF', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', padding: '24px' }}>
                
                {/* Timer */}
                <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px 16px', textAlign: 'center', marginBottom: '32px', position: 'relative' }}>
                  <div style={{ color: '#6B7280', fontSize: '13px', marginBottom: '12px', fontWeight: '500' }}>Qolgan vaqt</div>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '32px', fontWeight: '800', color: '#2563EB', letterSpacing: '-1px' }}>02:59:01</span>
                    <div style={{ width: '36px', height: '36px', border: '1px solid #BFDBFE', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', cursor: 'pointer', background: '#EFF6FF' }}>
                      <span style={{ fontWeight: '900', letterSpacing: '1px', fontSize: '12px' }}>||</span>
                    </div>
                  </div>
                  <div style={{ height: '4px', background: '#EFF6FF', borderRadius: '2px', width: '100%', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '99%', background: '#2563EB' }}></div>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 12px', fontSize: '12px', color: '#6B7280', marginBottom: '32px', fontWeight: '500' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#2563EB' }}></div> Javob berilgan</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #2563EB' }}></div> Joriy savol</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #D1D5DB' }}></div> Javob berilmagan</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#2563EB' }}></div> Eslatma</div>
                </div>

                {/* Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: 'auto' }}>
                  {[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30].map(num => (
                    <div key={num} style={{ 
                      aspectRatio: '1', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                      background: num === 16 ? '#2563EB' : '#FFFFFF',
                      color: num === 16 ? '#FFFFFF' : '#374151',
                      border: num === 16 ? 'none' : '1px solid #E5E7EB',
                      boxShadow: num === 16 ? '0 4px 10px rgba(37, 99, 235, 0.3)' : 'none'
                    }}>
                      {num}
                    </div>
                  ))}
                </div>

                {/* Action */}
                <div style={{ border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px', textAlign: 'center', fontWeight: '700', color: '#111827', marginTop: '32px', cursor: 'pointer', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Award size={18} /> Imtihonni yakunlash
                </div>
              </div>
              </div>
            </div>
            {/* Subtle overlay gradient at edges */}
            <div className="hero-screenshot-edge-fade" style={{ pointerEvents: 'none' }} />
          </div>


        </div>
      </section>

      {/* ==========================================
          SECTION 2: FEATURES (#features) — IMKONIYATLAR
      ========================================== */}
      <section id="features" className="minimal-section">
        <div className="container">
          <div className="minimal-section-header">
            <span className="minimal-tag">{t.features.tag}</span>
            <h2 className="minimal-h2">{t.features.title}</h2>
            <p className="minimal-p">{t.features.subtitle}</p>
          </div>

          <div className="minimal-features-grid">
            {t.features.cards.map((card, idx) => (
              <div key={idx} className="minimal-feature-card">
                <div className="minimal-icon-box">
                  {idx === 0 && <BookOpen size={22} color="#2563EB" />}
                  {idx === 1 && <Award size={22} color="#2563EB" />}
                  {idx === 2 && <Calculator size={22} color="#2563EB" />}
                  {idx === 3 && <CheckCircle2 size={22} color="#2563EB" />}
                  {idx === 4 && <ShieldCheck size={22} color="#2563EB" />}
                  {idx === 5 && <Sparkles size={22} color="#2563EB" />}
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A' }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: '15px', color: 'rgba(15, 23, 42, 0.6)', lineHeight: '1.6' }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SUBJECT LAUNCHERS INSIDE FEATURES AREA */}
      <section className="minimal-section" style={{ background: '#FFFFFF', borderTop: '1px solid rgba(15, 23, 42, 0.1)', borderBottom: '1px solid rgba(15, 23, 42, 0.1)' }}>
        <div className="container">
          <div className="minimal-section-header">
            <span className="minimal-tag">{lang === 'ru' ? 'ПРЕДМЕТЫ' : 'FANLAR'}</span>
            <h2 className="minimal-h2">{lang === 'ru' ? 'Выберите предмет для тренировки' : "Tayyorgarlik Fanini Tanlang"}</h2>
          </div>

          <div className="minimal-subjects-grid">
            {SUBJECTS.map((sub) => (
              <div key={sub.id} className="minimal-subject-card">
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginTop: '8px' }}>
                    {sub.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'rgba(15, 23, 42, 0.6)', marginTop: '8px', lineHeight: '1.5' }}>
                    {sub.description}
                  </p>
                </div>

                <button
                  onClick={() => onStartTest(sub.id)}
                  className="btn-minimal-subject"
                >
                  <span>{lang === 'ru' ? 'Начать тест' : 'Testni Boshlash'}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          SECTION 3: PRICING (#pricing) — NARXLAR
      ========================================== */}
      <section id="pricing" className="minimal-section">
        <div className="container">
          <div className="minimal-section-header">
            <span className="minimal-tag">{t.pricing.tag}</span>
            <h2 className="minimal-h2">{t.pricing.title}</h2>
            <p className="minimal-p">{t.pricing.subtitle}</p>
          </div>

          <div className="pricing-grid">
            {t.pricing.plans.map((plan, idx) => (
              <div key={idx} className="pricing-card-wrapper" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {plan.popular && (
                  <span className="pricing-popular-badge">
                    {lang === 'ru' ? 'ХИТ ПРОДАЖ' : "TAVSIYA ETILADI"}
                  </span>
                )}
                <div className={`pricing-card ${plan.popular ? 'popular' : ''}`} style={{ flex: 1 }}>

                <div>
                  <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A' }}>
                    {plan.name}
                  </h3>
                  <p style={{ fontSize: '14px', color: 'rgba(15, 23, 42, 0.5)', marginTop: '6px' }}>
                    {plan.desc}
                  </p>

                  <div style={{ marginTop: '24px', marginBottom: '24px' }}>
                    <span style={{ fontSize: '36px', fontWeight: '900', color: '#0F172A' }}>
                      {plan.price}
                    </span>
                    <span style={{ fontSize: '14px', color: 'rgba(15, 23, 42, 0.5)', marginLeft: '6px' }}>
                      / {plan.period}
                    </span>
                  </div>

                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: 'rgba(15, 23, 42, 0.7)' }}>
                        <Check size={18} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => onStartTest('uzbek')}
                  className={`btn-pricing ${plan.popular ? 'btn-pricing-dark' : 'btn-pricing-outline'}`}
                >
                  <span>{plan.btnText}</span>
                  <ArrowRight size={16} />
                </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          SECTION 4: FAQ (#faq) — KO'P BERILADIGAN SAVOLLAR
      ========================================== */}
      <section id="faq" className="minimal-section">
        <div className="container" style={{ maxWidth: '840px' }}>
          <div className="minimal-section-header">
            <span className="minimal-tag">{t.faq.tag}</span>
            <h2 className="minimal-h2">{t.faq.title}</h2>
          </div>

          <div>
            {t.faq.items.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className={`minimal-faq-item ${isOpen ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>{item.q}</h4>
                    <ChevronDown size={20} className="faq-chevron" />
                  </div>
                  <div className="faq-answer-container">
                    <p className="faq-answer-inner">
                      {item.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
