import React, { useState } from 'react';
import { Trophy, Search } from 'lucide-react';
import { LEADERBOARD_DATA } from '../../data/mockExamData';

export default function LeaderboardSection() {
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');

  const regions = ['all', 'Toshkent shahri', 'Samarqand viloyati', "Farg'ona viloyati", 'Buxoro viloyati', 'Xorazm viloyati'];

  const filtered = LEADERBOARD_DATA.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.school.toLowerCase().includes(search.toLowerCase());
    const matchesRegion = selectedRegion === 'all' || item.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  return (
    <div className="container leaderboard-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div className="hero-pill" style={{ marginBottom: '12px' }}>
            <Trophy size={16} color="#FBBF24" />
            <span>Respublika bo'yicha kuchlilar reytingi</span>
          </div>
          <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#fff' }}>
            189 Ball Sohiblari va Top Abituriyentlar
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(15, 23, 42, 0.4)', marginTop: '6px' }}>
            Haqiqiy raqobat muhiti: o'zingizning Milliy Sertifikat va DTM bo'yicha darajangizni aniqlang
          </p>
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="rgba(15, 23, 42, 0.4)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Ism yoki maktab izlash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid var(--border-light)',
                borderRadius: '14px',
                padding: '12px 16px 12px 42px',
                fontSize: '14px',
                color: '#fff',
                outline: 'none',
                width: '260px'
              }}
            />
          </div>

          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid var(--border-light)',
              borderRadius: '14px',
              padding: '12px 18px',
              fontSize: '14px',
              color: '#fff',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">Barcha hududlar</option>
            {regions.filter(r => r !== 'all').map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Leaderboard Table Showcase */}
      <div className="glass-panel table-panel">
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>O'rin</th>
                <th>Talaba / Abituriyent</th>
                <th>Hudud & Maktab</th>
                <th>Sertifikat darajasi</th>
                <th>Sarflangan vaqt</th>
                <th style={{ textAlign: 'right' }}>To'plangan Ball</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((item) => {
                return (
                  <tr key={item.rank}>
                    <td style={{ fontWeight: '800' }}>
                      {item.rank === 1 ? (
                        <span style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#2563EB', color: '#070B14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>
                          1
                        </span>
                      ) : item.rank === 2 ? (
                        <span style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.1)', color: '#070B14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>
                          2
                        </span>
                      ) : item.rank === 3 ? (
                        <span style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#0F172A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>
                          3
                        </span>
                      ) : (
                        <span style={{ color: 'rgba(15, 23, 42, 0.4)', paddingLeft: '8px' }}>#{item.rank}</span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563EB, #2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#fff' }}>
                          {item.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p style={{ fontWeight: '800', color: '#fff' }}>{item.name}</p>
                          <p style={{ fontSize: '12px', color: 'rgba(15, 23, 42, 0.4)' }}>Aniqlik: {item.accuracy}%</p>
                        </div>
                      </div>
                    </td>

                    <td>
                      <p style={{ fontWeight: '600', color: 'rgba(15, 23, 42, 0.1)' }}>{item.region}</p>
                      <p style={{ fontSize: '12px', color: 'rgba(15, 23, 42, 0.4)' }}>{item.school}</p>
                    </td>

                    <td>
                      <span className="brand-tag">
                        {item.badge}
                      </span>
                    </td>

                    <td style={{ fontFamily: 'monospace', color: 'rgba(15, 23, 42, 0.1)', fontWeight: '600' }}>
                      {item.timeSpent}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <span className="gold-gradient-text" style={{ fontSize: '20px', fontWeight: '900' }}>
                        {item.score.toFixed(1)}
                      </span>
                      <span style={{ fontSize: '13px', color: 'rgba(15, 23, 42, 0.4)', fontWeight: '700' }}> / 189</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
