import React from 'react';
import { BarChart3, TrendingUp, Award, Target, ArrowUpRight } from 'lucide-react';
import { SUBJECTS } from '../../data/mockExamData';

export default function AnalyticsSection({ onStartExam }) {
  return (
    <div className="container" style={{ padding: '36px 0', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div>
        <div className="hero-pill" style={{ marginBottom: '12px' }}>
          <BarChart3 size={16} color="#60A5FA" />
          <span>Shaxsiy Tahlil & Diagnostika</span>
        </div>
        <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#fff' }}>
          Sizning 189 Ball Maqsad sari Progresingiz
        </h2>
        <p style={{ fontSize: '15px', color: 'rgba(15, 23, 42, 0.4)', marginTop: '6px' }}>
          Sun'iy intellekt va ekspert mezonlar yordamida zaif mavzularingizni aniqlang va mustahkamlang
        </p>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'rgba(15, 23, 42, 0.4)', textTransform: 'uppercase' }}>O'rtacha Ball</span>
            <TrendingUp size={20} color="#34D399" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '38px', fontWeight: '900', color: '#fff' }}>174.2</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(15, 23, 42, 0.4)' }}>/ 189 ball</span>
          </div>
          <p style={{ fontSize: '13px', color: '#34D399', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUpRight size={14} /> +12.4 ball o'tgan haftaga nisbatan
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'rgba(15, 23, 42, 0.4)', textTransform: 'uppercase' }}>Topshirilgan Testlar</span>
            <Award size={20} color="#FBBF24" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '38px', fontWeight: '900', color: '#fff' }}>18 ta</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(15, 23, 42, 0.4)' }}>to'liq simulyatsiya</span>
          </div>
          <p style={{ fontSize: '13px', color: '#FBBF24', fontWeight: '600' }}>
            Barchasi C1 daraja mezoniga mos
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'rgba(15, 23, 42, 0.4)', textTransform: 'uppercase' }}>Sertifikat Bashorati</span>
            <Target size={20} color="#60A5FA" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="gold-gradient-text" style={{ fontSize: '36px', fontWeight: '900' }}>C1 Daraja</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(15, 23, 42, 0.4)' }}>(94% ehtimollik)</span>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(15, 23, 42, 0.1)', fontWeight: '600' }}>
            Maksimal grant balli kafolati
          </p>
        </div>
      </div>

      {/* Competency Breakdown */}
      <div className="glass-panel" style={{ padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>
          Fanlar bo'yicha o'zlashtirish ko'rsatkichlari
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          {SUBJECTS.map((sub) => (
            <div key={sub.id} style={{ padding: '20px', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '800', color: '#fff' }}>{sub.name}</span>
                <span className="brand-tag">
                  92% aniqlik
                </span>
              </div>

              <div className="progress-bar-wrapper">
                <div className="progress-bar-fill" style={{ width: '92%' }}></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'rgba(15, 23, 42, 0.4)', paddingTop: '4px' }}>
                <span>Maqsad: {sub.maxBall} ball</span>
                <button
                  onClick={() => onStartExam(sub.id)}
                  style={{ color: '#FBBF24', fontWeight: '800', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  Mashq qilish в†’
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
