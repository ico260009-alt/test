import React, { useState, useEffect } from 'react';
import { Download, FileText, TrendingUp, Users, Target } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function AdminReports() {
  const [reportType, setReportType] = useState('daily');
  const [topStudents, setTopStudents] = useState([]);
  const [weakTopics, setWeakTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch Top Students based on average score or total score
        const { data: sessions } = await supabase
          .from('test_sessions')
          .select('score, user_id, profiles(full_name)')
          .not('score', 'is', null);

        let userScores = {};
        if (sessions) {
          sessions.forEach(s => {
            const uid = s.user_id;
            if (!userScores[uid]) {
              userScores[uid] = { name: s.profiles?.full_name || 'Noma\'lum', total: 0, count: 0 };
            }
            userScores[uid].total += (s.score || 0);
            userScores[uid].count += 1;
          });
        }
        
        const top = Object.values(userScores)
          .map(u => ({ name: u.name, avgScore: Math.round(u.total / u.count) }))
          .sort((a, b) => b.avgScore - a.avgScore)
          .slice(0, 5);
        
        setTopStudents(top);

        // Fetch Weak Topics based on attempts
        const { data: attempts } = await supabase
          .from('attempts')
          .select('is_correct, questions(topic)');
        
        let topicStats = {};
        if (attempts) {
          attempts.forEach(a => {
            const topic = a.questions?.topic || 'Noma\'lum';
            if (!topicStats[topic]) topicStats[topic] = { total: 0, wrong: 0 };
            topicStats[topic].total += 1;
            if (!a.is_correct) topicStats[topic].wrong += 1;
          });
        }

        const weak = Object.entries(topicStats)
          .map(([topic, stats]) => ({
            topic,
            wrongPct: Math.round((stats.wrong / stats.total) * 100)
          }))
          .sort((a, b) => b.wrongPct - a.wrongPct)
          .slice(0, 5);

        setWeakTopics(weak);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleExportUsers = async () => {
    try {
      const { data } = await supabase.from('profiles').select('id, full_name, email, phone, created_at, role, subscription_tier, is_suspended');
      if (!data || data.length === 0) return alert("Ma'lumot yo'q");
      
      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'foydalanuvchilar.csv';
      a.click();
    } catch(e) { alert(e.message); }
  };

  const handleExportTests = async () => {
    try {
      const { data } = await supabase.from('test_sessions').select('id, user_id, score, completed_at, mock_tests(title)');
      if (!data || data.length === 0) return alert("Ma'lumot yo'q");
      
      const csv = [
        'Session ID,User ID,Test Nomi,Ball,Tugatilgan Vaqt',
        ...data.map(row => `"${row.id}","${row.user_id}","${row.mock_tests?.title || ''}","${row.score}","${row.completed_at}"`)
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'testlar.csv';
      a.click();
    } catch(e) { alert(e.message); }
  };

  return (
    <div className="admin-section">
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Hisobotlar (Reports)</h2>
          <p>Tizimning umumiy hisobotlari va eksport imkoniyatlari.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleExportUsers} style={{ padding: '8px 16px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} /> Foydalanuvchilar (CSV)
          </button>
          <button onClick={handleExportTests} style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> Testlar (CSV)
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}><TrendingUp /></div>
          <div>
            <h3>Daromad (Revenue)</h3>
            <div className="stat-value">0 UZS</div>
            <p className="stat-trend positive">+0% o'tgan oydan</p>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><Users /></div>
          <div>
            <h3>Konversiya (Conversion)</h3>
            <div className="stat-value">12.5%</div>
            <p className="stat-trend positive">Premium sotib olganlar (Tahminiy)</p>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}><Target /></div>
          <div>
            <h3>Ushlab qolish (Retention)</h3>
            <div className="stat-value">68%</div>
            <p className="stat-trend positive">7 kunlik aktivlik</p>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h3>Top O'quvchilar va Zaif Mavzular</h3>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>Bu bo'limda o'quvchilarning umumiy reytingi va eng ko'p xato qilinadigan mavzular ro'yxati shakllantiriladi.</p>
        
        {loading ? <p>Yuklanmoqda...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <h4>🏆 Top O'quvchilar</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {topStudents.length === 0 ? <li style={{ padding: '12px' }}>Hali ma'lumot yo'q</li> : topStudents.map((s, idx) => (
                <li key={idx} style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{idx + 1}. {s.name}</span> <strong>{s.avgScore} o'rtacha ball</strong>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>⚠️ Eng zaif mavzular</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {weakTopics.length === 0 ? <li style={{ padding: '12px' }}>Hali ma'lumot yo'q</li> : weakTopics.map((t, idx) => (
                <li key={idx} style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t.topic}</span> <span style={{ color: '#ef4444' }}>{t.wrongPct}% xato</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
