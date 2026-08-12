import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Users, BookOpen, Activity, BarChart2, Target, Calendar, HelpCircle, Bot, DollarSign } from 'lucide-react';

export default function AdminAnalytics() {
  const [activeTab, setActiveTab] = useState('overview'); // overview, questions
  const [loading, setLoading] = useState(true);

  // Overview Stats
  const [stats, setStats] = useState({
    activeToday: 0,
    mocksToday: 0,
    last7Days: 0,
    last30Days: 0,
    popularSubjects: [],
    hardestMocks: [],
    aiUsageCount: 0,
    totalRevenue: 0,
    totalUsers: 0
  });

  // Per Question Stats
  const [questionStats, setQuestionStats] = useState([]);
  const [qSearch, setQSearch] = useState('');

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 1. Bugungi aktiv foydalanuvchilar (from test_sessions or logins)
        // Since we don't have login_logs fully populated yet, we'll use test_sessions today
        const { data: activeUsersData } = await supabase
          .from('test_sessions')
          .select('user_id')
          .gte('created_at', todayISO);
        const activeUsersCount = new Set(activeUsersData?.map(s => s.user_id)).size;

        // 2. Bugungi yechilgan mocklar
        const { count: mocksTodayCount } = await supabase
          .from('test_sessions')
          .select('*', { count: 'exact', head: true })
          .gte('completed_at', todayISO);

        // 3. 7/30 kun statistikasi (mocklar)
        const { count: mocks7Days } = await supabase.from('test_sessions').select('*', { count: 'exact', head: true }).gte('completed_at', sevenDaysAgo.toISOString());
        const { count: mocks30Days } = await supabase.from('test_sessions').select('*', { count: 'exact', head: true }).gte('completed_at', thirtyDaysAgo.toISOString());

        // 4. AI ishlatilganlar soni (mock if we don't have ai_logs yet)
        const aiUsageCount = 0; // MVP: Requires backend logging for AI usage

        // 5. Total Revenue & Users
        const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { data: txs } = await supabase.from('transactions').select('amount').eq('status', 'paid');
        const revenue = txs?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

        // 6. Hardest Mocks & Popular Subjects
        const { data: testSessions } = await supabase.from('test_sessions').select('score, mock_tests(id, title, subject)').not('score', 'is', null);
        let mockScores = {};
        let subjectCounts = {};
        
        if (testSessions) {
          testSessions.forEach(ts => {
             if (ts.mock_tests) {
               const mId = ts.mock_tests.id;
               if (!mockScores[mId]) mockScores[mId] = { title: ts.mock_tests.title, totalScore: 0, count: 0 };
               mockScores[mId].totalScore += ts.score || 0;
               mockScores[mId].count += 1;

               const subj = ts.mock_tests.subject || 'Noma\'lum';
               subjectCounts[subj] = (subjectCounts[subj] || 0) + 1;
             }
          });
        }
        
        const hardestMocks = Object.values(mockScores)
           .map(m => ({ title: m.title, avg: m.totalScore / m.count }))
           .sort((a, b) => a.avg - b.avg) // Lowest score first
           .slice(0, 5);
           
        const popularSubjects = Object.entries(subjectCounts)
           .map(([subject, count]) => ({ subject, count }))
           .sort((a, b) => b.count - a.count)
           .slice(0, 5);

        setStats({
          activeToday: activeUsersCount,
          mocksToday: mocksTodayCount || 0,
          last7Days: mocks7Days || 0,
          last30Days: mocks30Days || 0,
          aiUsageCount: 0, // AI loglari hali bazada yig'ilmagan
          totalRevenue: revenue,
          totalUsers: usersCount || 0,
          hardestMocks,
          popularSubjects
        });

        // ============================================
        // PER QUESTION ANALYTICS
        // ============================================
        const { data: attempts } = await supabase.from('attempts').select('question_id, is_correct, user_answer, questions(text, topic)');
        if (attempts) {
           const qStats = {};
           attempts.forEach(a => {
             if (!qStats[a.question_id]) {
               qStats[a.question_id] = {
                 id: a.question_id,
                 text: a.questions?.text || 'Noma\'lum',
                 topic: a.questions?.topic || 'Noma\'lum',
                 total: 0,
                 correct: 0,
                 wrong: 0,
                 skipped: 0,
                 answers: {}
               };
             }
             const q = qStats[a.question_id];
             q.total += 1;
             
             if (a.user_answer === null || a.user_answer === '') {
               q.skipped += 1;
             } else {
               if (a.is_correct) q.correct += 1;
               else q.wrong += 1;
               
               q.answers[a.user_answer] = (q.answers[a.user_answer] || 0) + 1;
             }
           });
           
           const finalQStats = Object.values(qStats).map(q => {
             let mostSelected = '-';
             let maxVotes = 0;
             for (const [ans, votes] of Object.entries(q.answers)) {
               if (votes > maxVotes) {
                 maxVotes = votes;
                 mostSelected = ans;
               }
             }
             
             const correctPct = q.total > 0 ? Math.round((q.correct / q.total) * 100) : 0;
             const wrongPct = q.total > 0 ? Math.round((q.wrong / q.total) * 100) : 0;
             const skippedPct = q.total > 0 ? Math.round((q.skipped / q.total) * 100) : 0;
             
             let difficulty = 'Oson';
             if (correctPct < 30) difficulty = 'Qiyin';
             else if (correctPct < 70) difficulty = 'O\'rtacha';

             return {
               ...q,
               correctPct, wrongPct, skippedPct, mostSelected, difficulty, avgTime: '45s' // Mock average time
             };
           });
           
           setQuestionStats(finalQStats.sort((a, b) => a.correctPct - b.correctPct)); // Hardest first
        }

      } catch (err) {
        console.error("Analytics load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();

    const channel = supabase
      .channel('admin-analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'test_sessions' }, () => {
         loadAnalytics();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attempts' }, () => {
         loadAnalytics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(amount);
  };

  const filteredQuestions = questionStats.filter(q => q.text.toLowerCase().includes(qSearch.toLowerCase()) || q.topic.toLowerCase().includes(qSearch.toLowerCase()));

  return (
    <div className="admin-section">
      <div className="admin-header" style={{ marginBottom: '24px' }}>
        <h2>Tahlil va Statistika (Analytics)</h2>
        <p>Tizimning asosiy ko'rsatkichlari va savollar tahlili.</p>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(15,23,42,0.1)', paddingBottom: '12px' }}>
        <button 
          onClick={() => setActiveTab('overview')}
          style={{ background: activeTab === 'overview' ? '#2563EB' : 'transparent', color: activeTab === 'overview' ? 'white' : '#64748B', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <BarChart2 size={18} /> Umumiy Ko'rsatkichlar
        </button>
        <button 
          onClick={() => setActiveTab('questions')}
          style={{ background: activeTab === 'questions' ? '#2563EB' : 'transparent', color: activeTab === 'questions' ? 'white' : '#64748B', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <HelpCircle size={18} /> Savollar Tahlili
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Yuklanmoqda...</div>
      ) : activeTab === 'overview' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div className="admin-stat-card">
              <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}><Activity /></div>
              <div>
                <h3>Bugungi aktivlar</h3>
                <div className="stat-value">{stats.activeToday}</div>
                <p className="stat-trend positive">Foydalanuvchilar</p>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><BookOpen /></div>
              <div>
                <h3>Bugun yechilgan</h3>
                <div className="stat-value">{stats.mocksToday}</div>
                <p className="stat-trend positive">Mock testlar</p>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}><Calendar /></div>
              <div>
                <h3>Oxirgi 7 kun</h3>
                <div className="stat-value">{stats.last7Days}</div>
                <p className="stat-trend positive">Mock topshirishlar</p>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}><Bot /></div>
              <div>
                <h3>AI Ishlatilgan</h3>
                <div className="stat-value">{stats.aiUsageCount} marta</div>
                <p className="stat-trend positive">Jami (Tahminiy)</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Hardest Mocks */}
            <div className="admin-card">
              <h3 style={{ marginBottom: '16px' }}>Eng qiyin mocklar (O'rtacha ball bo'yicha)</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Mock Nomi</th>
                    <th>O'rtacha Ball</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.hardestMocks.map((m, i) => (
                    <tr key={i}>
                      <td>{m.title}</td>
                      <td><span style={{ color: '#ef4444', fontWeight: 600 }}>{m.avg.toFixed(1)}</span></td>
                    </tr>
                  ))}
                  {stats.hardestMocks.length === 0 && <tr><td colSpan="2">Ma'lumot yo'q</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Popular Subjects */}
            <div className="admin-card">
              <h3 style={{ marginBottom: '16px' }}>Eng mashhur fanlar</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fan</th>
                    <th>Yechilgan testlar</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.popularSubjects.map((s, i) => (
                    <tr key={i}>
                      <td>{s.subject}</td>
                      <td>{s.count} ta</td>
                    </tr>
                  ))}
                  {stats.popularSubjects.length === 0 && <tr><td colSpan="2">Ma'lumot yo'q</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-card">
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Har bir savol uchun statistika</h3>
            <input 
              type="text" 
              placeholder="Savol qidirish..." 
              value={qSearch}
              onChange={e => setQSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', minWidth: '250px' }}
            />
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Savol / Mavzu</th>
                  <th>Urinishlar</th>
                  <th>To'g'ri (%)</th>
                  <th>Xato (%)</th>
                  <th>Tashlab ketilgan (%)</th>
                  <th>O'rtacha vaqt</th>
                  <th>Eng ko'p tanlangan xato</th>
                  <th>Qiyinlik</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map((q, i) => (
                  <tr key={i}>
                    <td style={{ maxWidth: '300px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>{q.topic}</div>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.text}</div>
                    </td>
                    <td>{q.total}</td>
                    <td><span style={{ color: '#10b981', fontWeight: 600 }}>{q.correctPct}%</span></td>
                    <td><span style={{ color: '#ef4444', fontWeight: 600 }}>{q.wrongPct}%</span></td>
                    <td><span style={{ color: '#f59e0b', fontWeight: 600 }}>{q.skippedPct}%</span></td>
                    <td>{q.avgTime}</td>
                    <td>{q.mostSelected !== '-' ? `Variant: ${q.mostSelected.substring(0,20)}...` : '-'}</td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                        background: q.difficulty === 'Qiyin' ? '#fee2e2' : q.difficulty === 'Oson' ? '#d1fae5' : '#fef3c7',
                        color: q.difficulty === 'Qiyin' ? '#ef4444' : q.difficulty === 'Oson' ? '#10b981' : '#f59e0b'
                      }}>
                        {q.difficulty}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredQuestions.length === 0 && (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>Savollar topilmadi</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
