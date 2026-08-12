import React, { useState, useEffect } from 'react';
import { PlayCircle, Clock, BookOpen, Lock, Star, FileCheck, Users, Award } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import ALevelConfigModal from './ALevelConfigModal';
import CertificateModal from '../../../components/exam/CertificateModal';

export default function MocksView({ lang, user, onStartExam, onNavigate }) {
  const isUz = lang === 'uz';
  const [mockExams, setMockExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isALevelModalOpen, setIsALevelModalOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pro, free, solved
  const [solvedTests, setSolvedTests] = useState(new Set());
  
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certData, setCertData] = useState(null);
  const [isCertLoading, setIsCertLoading] = useState(false);

  const calculateGrade = (earnedBall, maxBall) => {
    const ballPercent = Math.round((earnedBall / maxBall) * 100) || 0;
    if (ballPercent >= 93) return 'A+';
    if (ballPercent >= 86) return 'A';
    if (ballPercent >= 80) return 'B+';
    if (ballPercent >= 73) return 'B';
    if (ballPercent >= 66) return 'C+';
    if (ballPercent >= 61) return 'C';
    return 'Fail';
  };

  const handleViewCert = async (exam, score) => {
    setIsCertLoading(true);
    try {
      let maxBall = exam.question_count;
      if (exam.exam_system === 'dtm') {
        maxBall = 189;
      } else if (exam.exam_system === 'milliy_sertifikat') {
        maxBall = 75;
      }

      const grade = calculateGrade(score, maxBall);

      setCertData({
        result: {
          subject: { name: exam.subject, system: exam.exam_system },
          earnedBall: score,
          maxBall: maxBall
        },
        user,
        grade
      });
      setCertModalOpen(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCertLoading(false);
    }
  };

  useEffect(() => {
    async function fetchTests() {
      try {
        const { data, error } = await supabase.from('mock_tests').select('*').neq('is_hidden', true).order('created_at', { ascending: false });
        if (!error && data) {
          try {
            const { data: counts } = await supabase.from('mock_tests_with_unique_users').select('*');
            if (counts) {
              const countsMap = new Map(counts.map(c => [c.test_id, c.unique_users_count]));
              data.forEach(d => {
                d.unique_users_count = countsMap.get(d.id) || 0;
              });
            }
          } catch (e) { console.warn('View not created yet', e); }
          setMockExams(data);
        }

        if (user) {
          const { data: sessions } = await supabase.from('test_sessions').select('test_id, score, completed_at').eq('user_id', user.id).order('score', { ascending: false });
          if (sessions) {
            const solvedMap = new Map();
            sessions.forEach(s => {
              if (!solvedMap.has(s.test_id)) {
                solvedMap.set(s.test_id, s.score);
              }
            });
            setSolvedTests(solvedMap);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchTests();
  }, [user]);

  const displayExams = React.useMemo(() => {
    let list = mockExams.filter(e => e.exam_system !== 'alevel');
    
    // Add A-Level virtual card if any alevel exams exist
    const hasALevel = mockExams.some(e => e.exam_system === 'alevel');
    if (hasALevel) {
      list.unshift({
        id: 'alevel-virtual',
        title: 'A-Level Mathematics (9709)',
        subject: 'CAMBRIDGE',
        is_premium: false,
        duration_minutes: 195,
        question_count: 'Multi',
      });
    }

    return list.filter(e => {
      if (filter === 'pro') return e.is_premium;
      if (filter === 'free') return !e.is_premium;
      if (filter === 'solved') return solvedTests.has(e.id);
      return true;
    });
  }, [mockExams, filter, solvedTests]);

  return (
    <div className="mocks-wrapper fade-in" style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
      <header className="dashboard-header" style={{ marginBottom: '32px' }}>
        <div>
          <h1 className="dashboard-title">
            {isUz ? 'Mock Testlar' : 'Мок-тесты'}
          </h1>
          <p className="dashboard-subtitle">
            {isUz ? 'Haqiqiy imtihon muhitini his qiling va o\'z darajangizni sinab ko\'ring' : 'Почувствуйте атмосферу реального экзамена и проверьте свой уровень'}
          </p>
        </div>
      </header>

      <ALevelConfigModal
        isOpen={isALevelModalOpen}
        onClose={() => setIsALevelModalOpen(false)}
        onStart={(config) => onStartExam(config)}
        availablePapers={mockExams.filter(e => e.exam_system === 'alevel')}
        isUz={isUz}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
        <button 
          onClick={() => setFilter('all')}
          style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #E2E8F0', background: filter === 'all' ? '#2563EB' : 'white', color: filter === 'all' ? 'white' : '#475569', fontWeight: '600', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
        >
          {isUz ? 'Hammasi' : 'Все'}
        </button>
        <button 
          onClick={() => setFilter('pro')}
          style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #E2E8F0', background: filter === 'pro' ? '#2563EB' : 'white', color: filter === 'pro' ? 'white' : '#475569', fontWeight: '600', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
        >
          PRO {isUz ? 'Testlar' : 'Тесты'}
        </button>
        <button 
          onClick={() => setFilter('free')}
          style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #E2E8F0', background: filter === 'free' ? '#2563EB' : 'white', color: filter === 'free' ? 'white' : '#475569', fontWeight: '600', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
        >
          {isUz ? 'Tekin' : 'Бесплатно'}
        </button>
        <button 
          onClick={() => setFilter('solved')}
          style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #E2E8F0', background: filter === 'solved' ? '#2563EB' : 'white', color: filter === 'solved' ? 'white' : '#475569', fontWeight: '600', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
        >
          {isUz ? 'Yechilgan' : 'Решено'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {loading && <p style={{ color: 'rgba(15, 23, 42, 0.4)' }}>{isUz ? 'Testlar yuklanmoqda...' : 'Загрузка тестов...'}</p>}
        {displayExams.map(exam => {
          const now = new Date();
          const from = exam.available_from ? new Date(exam.available_from) : null;
          const until = exam.available_until ? new Date(exam.available_until) : null;
          const isTimeLocked = (from && now < from) || (until && now > until);

          // Check premium status
          const hasPremium = user?.subscription_until && new Date(user.subscription_until) > now;
          const isPremiumLocked = exam.is_premium && !hasPremium;
          const isLocked = isTimeLocked || isPremiumLocked;

          return (
            <div key={exam.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden', opacity: isLocked ? 0.7 : 1 }}>
              {exam.is_premium && (
                <div style={{ position: 'absolute', top: '16px', right: '-35px', background: '#2563EB', color: 'white', fontSize: '11px', fontWeight: 'bold', padding: '4px 0', width: '120px', textAlign: 'center', transform: 'rotate(45deg)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  PRO
                </div>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563EB', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
                    {exam.subject}
                  </span>
                  {solvedTests.has(exam.id) ? (
                    <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
                      {isUz ? 'Yechilgan' : 'Решено'} • {solvedTests.get(exam.id)} ball
                    </span>
                  ) : (!isLocked && (
                    <span style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563EB', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
                      {isUz ? 'Yangi' : 'Новый'}
                    </span>
                  ))}
                  {isTimeLocked && from && now < from && (
                    <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#0F172A', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={12} /> {from.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} da ochiladi
                    </span>
                  )}
                  {isTimeLocked && until && now > until && (
                    <span style={{ background: 'rgba(100, 116, 139, 0.1)', color: 'rgba(15, 23, 42, 0.5)', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={12} /> Yopilgan
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', lineHeight: '1.3' }}>{exam.title}</h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderTop: '1px solid rgba(15, 23, 42, 0.1)', borderBottom: '1px solid rgba(15, 23, 42, 0.1)', padding: '12px 0', margin: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(15, 23, 42, 0.5)', fontSize: '13px', fontWeight: '500' }}>
                  <Clock size={16} />
                  <span>{exam.duration_minutes} min</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(15, 23, 42, 0.5)', fontSize: '13px', fontWeight: '500' }}>
                  <BookOpen size={16} />
                  <span>{exam.question_count} savol</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(15, 23, 42, 0.5)', fontSize: '13px', fontWeight: '500' }}>
                  <Users size={16} />
                  <span>{exam.unique_users_count || 0} ta odam yechgan</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {solvedTests.has(exam.id) && exam.exam_system === 'milliy_sertifikat' && (
                  <button
                    onClick={() => handleViewCert(exam, solvedTests.get(exam.id))}
                    disabled={isCertLoading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      background: '#FEF3C7',
                      color: '#D97706',
                      border: '1px solid #FDE68A',
                      fontWeight: 'bold',
                      cursor: isCertLoading ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <FileCheck size={18} /> {isUz ? "Sertifikatni ko'rish" : 'Посмотреть сертификат'}
                  </button>
                )}

                {solvedTests.has(exam.id) && exam.exam_system === 'dtm' && (
                  <div
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      background: 'rgba(37, 99, 235, 0.05)',
                      color: '#2563EB',
                      border: '1px solid rgba(37, 99, 235, 0.1)',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Award size={18} />
                    {isUz ? "Natijangiz:" : "Ваш результат:"} {solvedTests.get(exam.id)} / 189 ball
                  </div>
                )}

                <button
                onClick={() => {
                  if (isPremiumLocked) onNavigate('pricing');
                  else if (exam.id === 'alevel-virtual') setIsALevelModalOpen(true);
                  else onStartExam(exam.id);
                }}
                disabled={isTimeLocked}
                className="btn-primary-workspace"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: isTimeLocked ? 'rgba(15, 23, 42, 0.4)' : (isPremiumLocked ? 'linear-gradient(135deg, #2563EB 0%, #2563EB 100%)' : undefined),
                  cursor: isTimeLocked ? 'not-allowed' : 'pointer',
                  border: isPremiumLocked ? 'none' : undefined,
                  boxShadow: isPremiumLocked ? '0 4px 12px rgba(245, 158, 11, 0.3)' : undefined
                }}
              >
                {isTimeLocked ? <Lock size={18} /> : (isPremiumLocked ? <Star size={18} /> : <PlayCircle size={18} />)}
                <span>
                  {isTimeLocked
                    ? (isUz ? 'Qulflangan' : 'Закрыто')
                    : (isPremiumLocked
                      ? (isUz ? "PRO Sotib Olish" : "Купить PRO")
                      : (isUz ? 'Testni Boshlash' : 'Начать Тест')
                    )
                  }
                </span>
              </button>
              </div>
            </div>
          );
        })}
      </div>

      {certModalOpen && certData && (
        <CertificateModal
          isOpen={certModalOpen}
          onClose={() => setCertModalOpen(false)}
          result={certData.result}
          user={certData.user}
          grade={certData.grade}
        />
      )}
    </div>
  );
}
