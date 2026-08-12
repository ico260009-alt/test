import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Award, Trophy, CheckCircle2, XCircle, RotateCcw, Share2, BarChart3, Clock, Target, Home, FileCheck } from 'lucide-react';
import MathText from '../MathText';
import CertificateModal from './CertificateModal';

export default function ScoreReportModal({ result, onRestart, onExit, user }) {
  const [filter, setFilter] = useState('all');
  const [showCertificate, setShowCertificate] = useState(false);

  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#2563EB', '#2563EB', '#2563EB', '#2563EB']
    });
  }, []);

  const { subject, questions, answers, correctCount, earnedBall, maxBall, timeSpent, testScore, essayScore, essayFeedback } = result;
  const accuracyPercent = Math.round((correctCount / questions.length) * 100) || 0;

  const isMilliySertifikat = subject.system === 'milliy_sertifikat';

  const getLevelBadge = (ball) => {
    const ballPercent = Math.round((ball / maxBall) * 100) || 0;
    if (isMilliySertifikat) {
      if (ballPercent >= 93) return { title: 'A+ DARAJA — MILLIY SERTIFIKAT', color: '#2563EB', grade: 'A+' };
      if (ballPercent >= 86) return { title: 'A DARAJA — MILLIY SERTIFIKAT', color: '#2563EB', grade: 'A' };
      if (ballPercent >= 80) return { title: 'B+ DARAJA — MILLIY SERTIFIKAT', color: '#2563EB', grade: 'B+' };
      if (ballPercent >= 73) return { title: 'B DARAJA — MILLIY SERTIFIKAT', color: '#2563EB', grade: 'B' };
      if (ballPercent >= 66) return { title: 'C+ DARAJA — MILLIY SERTIFIKAT', color: '#2563EB', grade: 'C+' };
      if (ballPercent >= 61) return { title: 'C DARAJA — MILLIY SERTIFIKAT', color: '#2563EB', grade: 'C' };
      return { title: 'TAYYORGARLIK DARAJASI', color: 'rgba(15, 23, 42, 0.4)', grade: 'Fail' };
    } else {
      if (ball >= (maxBall * 0.85)) return { title: 'C1 DARAJA — OLTIN SERTIFIKAT', color: '#2563EB' };
      if (ball >= (maxBall * 0.70)) return { title: 'B2 DARAJA — YUQORI NATIJA', color: '#2563EB' };
      return { title: 'TAYYORGARLIK DARAJASI', color: 'rgba(15, 23, 42, 0.4)' };
    }
  };

  const level = getLevelBadge(earnedBall);

  const isDTM = subject?.system === 'dtm';

  const checkIsCorrect = (q, userAns) => {
    if (q.question_type === 'written') {
      const uAns = (userAns || '').toString().trim().toLowerCase();
      const cAnsStr = (q.correct || q.correct_answer_text || '').toString().trim().toLowerCase();
      const cAnswers = cAnsStr.split(',').map(a => a.trim()).filter(a => a !== '');
      return cAnswers.includes(uAns) && uAns !== '';
    }
    return userAns === q.correct;
  };

  const topicStats = {};
  if (isDTM) {
    const dtmSubjects = (subject?.name || '').split('|');
    const main1 = dtmSubjects[0] ? dtmSubjects[0].trim() : 'Asosiy Fan 1';
    const main2 = dtmSubjects[1] ? dtmSubjects[1].trim() : 'Asosiy Fan 2';

    questions.forEach((q, index) => {
      let topic = q.topic;
      let defaultPoints = 1;

      if (!topic || topic === 'Umumiy') {
        if (index < 10) { topic = 'Majburiy: Ona tili'; defaultPoints = 1.1; }
        else if (index < 20) { topic = 'Majburiy: Matematika'; defaultPoints = 1.1; }
        else if (index < 30) { topic = "Majburiy: O'zbekiston tarixi"; defaultPoints = 1.1; }
        else if (index < 60) { topic = `Asosiy: ${main1}`; defaultPoints = 3.1; }
        else if (index < 90) { topic = `Asosiy: ${main2}`; defaultPoints = 2.1; }
        else { topic = 'Umumiy'; }
      }
      
      q.displayTopic = topic;
      const points = Number(q.points || defaultPoints);

      if (!topicStats[topic]) {
        topicStats[topic] = { total: 0, correct: 0, earnedBall: 0, maxBall: 0 };
      }
      topicStats[topic].total += 1;
      topicStats[topic].maxBall += points;
      
      if (checkIsCorrect(q, answers[q.id])) {
        topicStats[topic].correct += 1;
        topicStats[topic].earnedBall += points;
      }
    });
  }

  const filteredQuestions = questions.filter(q => {
    const isCorrect = checkIsCorrect(q, answers[q.id]);
    
    if (filter === 'correct') return isCorrect;
    if (filter === 'wrong') return !isCorrect;
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'rgba(15, 23, 42, 0.03)', color: '#0F172A', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: '"Inter", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeIn 0.5s ease-out' }}>
        
        {/* Top Header / Result Banner */}
        <div style={{ background: 'white', borderRadius: '24px', padding: '48px 32px', textAlign: 'center', border: '1px solid rgba(15, 23, 42, 0.1)', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.05)', position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ position: 'absolute', top: '-150px', left: '50%', transform: 'translateX(-50%)', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }}></div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(37, 99, 235, 0.08)', color: '#2563EB', padding: '6px 16px', borderRadius: '99px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '24px', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
            <Award size={16} />
            {level.title}
          </div>

          <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#0F172A', marginBottom: '12px', letterSpacing: '-0.5px' }}>
            Imtihon natijasi
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'center' }}><Target size={16} /> {subject.name}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'center' }}><Clock size={16} /> {timeSpent} sarflandi</span>
          </p>

          <div style={{ margin: '48px 0', display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            <div style={{ position: 'relative', width: '180px', height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'white', borderRadius: '50%', border: '8px solid rgba(15, 23, 42, 0.03)', boxShadow: 'inset 0 0 40px rgba(15, 23, 42, 0.05)' }}>
              <div style={{ position: 'absolute', inset: '-2px', borderRadius: '50%', background: `conic-gradient(#2563EB ${accuracyPercent}%, transparent 0)`, WebkitMask: 'radial-gradient(closest-side, transparent 90%, black 0)' }}></div>
              <span style={{ fontSize: '48px', fontWeight: '900', color: '#0F172A', lineHeight: '1' }}>
                {earnedBall}
              </span>
              <span style={{ fontSize: '14px', color: 'rgba(15, 23, 42, 0.5)', fontWeight: '600', marginTop: '4px' }}>
                / {maxBall} BALL
              </span>
            </div>

            {essayScore !== undefined && essayScore !== null && (
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
                 <div style={{ background: '#F8FAFC', padding: '16px 24px', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                   <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '600', marginBottom: '4px' }}>Test Bali</div>
                   <div style={{ fontSize: '24px', color: '#0F172A', fontWeight: 'bold' }}>{testScore} / {maxBall}</div>
                 </div>
                 <div style={{ background: '#ECFDF5', padding: '16px 24px', borderRadius: '16px', border: '1px solid #A7F3D0', textAlign: 'center' }}>
                   <div style={{ fontSize: '13px', color: '#059669', fontWeight: '600', marginBottom: '4px' }}>AI Esse Bali</div>
                   <div style={{ fontSize: '24px', color: '#10B981', fontWeight: 'bold' }}>{essayScore}</div>
                 </div>
              </div>
            )}
          </div>

          <div className="stats-grid" style={{ display: 'grid', gap: '16px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(15, 23, 42, 0.05)', transition: 'transform 0.2s', cursor: 'default' }} className="hover-lift">
              <div style={{ color: 'rgba(15, 23, 42, 0.5)', fontSize: '13px', marginBottom: '8px' }}>To'g'ri javoblar</div>
              <div style={{ color: '#2563EB', fontSize: '28px', fontWeight: '800' }}>{correctCount}</div>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(15, 23, 42, 0.05)', transition: 'transform 0.2s', cursor: 'default' }} className="hover-lift">
              <div style={{ color: 'rgba(15, 23, 42, 0.5)', fontSize: '13px', marginBottom: '8px' }}>Aniqlik foizi</div>
              <div style={{ color: '#2563EB', fontSize: '28px', fontWeight: '800' }}>{accuracyPercent}%</div>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(15, 23, 42, 0.05)', transition: 'transform 0.2s', cursor: 'default' }} className="hover-lift">
              <div style={{ color: 'rgba(15, 23, 42, 0.5)', fontSize: '13px', marginBottom: '8px' }}>Mezon</div>
              <div style={{ color: '#2563EB', fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '34px' }}>{accuracyPercent >= 85 ? 'C1' : accuracyPercent >= 70 ? 'B2' : 'O\'rtacha'}</div>
            </div>
          </div>

          {isDTM && Object.keys(topicStats).length > 0 && (
            <div style={{ marginTop: '32px', textAlign: 'left', background: 'rgba(15, 23, 42, 0.02)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(15, 23, 42, 0.05)', maxWidth: '600px', margin: '32px auto 0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} color="#2563EB" />
                Fanlar bo'yicha natijalar
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(topicStats).map(([topic, stats]) => {
                  return (
                    <div key={topic} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'white', borderRadius: '12px', border: '1px solid rgba(15, 23, 42, 0.05)' }}>
                      <div style={{ fontWeight: '600', color: '#0F172A', fontSize: '15px' }}>{topic}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(15, 23, 42, 0.6)' }}>
                          {stats.correct} / {stats.total} to'g'ri
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#2563EB', background: 'rgba(37, 99, 235, 0.1)', padding: '4px 10px', borderRadius: '8px' }}>
                          {(Math.round(stats.earnedBall * 10) / 10).toFixed(1)} / {(Math.round(stats.maxBall * 10) / 10).toFixed(1)} ball
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="action-buttons" style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '40px', flexWrap: 'wrap' }}>
            <button onClick={() => onRestart(subject.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 28px', borderRadius: '12px', background: '#2563EB', color: 'white', fontWeight: 'bold', fontSize: '15px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', transition: 'all 0.2s' }} className="hover-scale">
              <RotateCcw size={18} />
              Qayta Topshirish
            </button>
            <button onClick={onExit} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 28px', borderRadius: '12px', background: 'white', color: '#0F172A', fontWeight: 'bold', fontSize: '15px', border: '1px solid rgba(15, 23, 42, 0.1)', cursor: 'pointer', transition: 'all 0.2s' }} className="hover-bg-light">
              <Home size={18} />
              Bosh sahifa
            </button>
            {isMilliySertifikat && (
              <button onClick={() => setShowCertificate(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 28px', borderRadius: '12px', background: '#C5A059', color: 'white', fontWeight: 'bold', fontSize: '15px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(197, 160, 89, 0.3)', transition: 'all 0.2s' }} className="hover-scale">
                <FileCheck size={18} />
                Sertifikatni ko'rish
              </button>
            )}
          </div>
        </div>

        <CertificateModal 
          isOpen={showCertificate} 
          onClose={() => setShowCertificate(false)} 
          result={result} 
          user={user}
          grade={level.grade}
        />

        {/* Question Review Section */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.3px' }}>Savollar Tahlili</h2>
              <p style={{ fontSize: '14px', color: 'rgba(15, 23, 42, 0.5)', marginTop: '6px' }}>Har bir savol bo'yicha yo'l qo'yilgan xatoliklarni ko'rib chiqing</p>
            </div>

            <div style={{ display: 'flex', background: 'white', padding: '6px', borderRadius: '12px', border: '1px solid rgba(15, 23, 42, 0.1)' }}>
              <button onClick={() => setFilter('all')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: filter === 'all' ? 'rgba(15, 23, 42, 0.05)' : 'transparent', color: filter === 'all' ? '#0F172A' : 'rgba(15, 23, 42, 0.5)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
                Barchasi ({questions.length})
              </button>
              <button onClick={() => setFilter('wrong')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: filter === 'wrong' ? 'rgba(15, 23, 42, 0.05)' : 'transparent', color: filter === 'wrong' ? '#0F172A' : 'rgba(15, 23, 42, 0.5)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
                Xatolar ({questions.length - correctCount})
              </button>
              <button onClick={() => setFilter('correct')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: filter === 'correct' ? 'rgba(37, 99, 235, 0.08)' : 'transparent', color: filter === 'correct' ? '#2563EB' : 'rgba(15, 23, 42, 0.5)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
                To'g'rilar ({correctCount})
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredQuestions.map((q) => {
              const originalIndex = questions.findIndex(orig => orig.id === q.id) + 1;
              const userAns = answers[q.id];
              const isCorrect = checkIsCorrect(q, userAns);

              return (
                <div key={q.id} style={{ background: 'white', borderRadius: '20px', padding: '24px', border: `1px solid ${isCorrect ? 'rgba(37, 99, 235, 0.3)' : 'rgba(15, 23, 42, 0.2)'}`, transition: 'all 0.2s' }} className="hover-border-glow">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: isCorrect ? '#2563EB' : '#0F172A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px', flexShrink: 0 }}>
                        {originalIndex}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0F172A', background: 'rgba(15, 23, 42, 0.05)', padding: '4px 8px', borderRadius: '6px' }}>
                            {q.displayTopic || q.topic || 'Umumiy'}
                          </span>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#0F172A', lineHeight: '1.5' }}><MathText>{q.question || q.text}</MathText></div>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      {isCorrect ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#2563EB', background: 'rgba(37, 99, 235, 0.1)', padding: '6px 12px', borderRadius: '8px' }}>
                          <CheckCircle2 size={16} /> To'g'ri
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#0F172A', background: 'rgba(15, 23, 42, 0.05)', padding: '6px 12px', borderRadius: '8px' }}>
                          <XCircle size={16} /> Xato
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.02)', border: `1px solid ${isCorrect ? 'rgba(37, 99, 235, 0.1)' : 'rgba(15, 23, 42, 0.1)'}` }}>
                      <span style={{ fontSize: '12px', color: 'rgba(15, 23, 42, 0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sizning javobingiz</span>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: isCorrect ? '#2563EB' : '#0F172A', marginTop: '8px' }}>
                        {userAns ? <MathText>{userAns}</MathText> : <span style={{ color: 'rgba(15, 23, 42, 0.4)', fontStyle: 'italic' }}>Belgilanmagan</span>}
                      </div>
                    </div>
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.02)', border: '1px solid rgba(37, 99, 235, 0.1)' }}>
                      <span style={{ fontSize: '12px', color: 'rgba(15, 23, 42, 0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To'g'ri javob</span>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#2563EB', marginTop: '8px' }}>
                        <MathText>{q.correct}</MathText>
                      </div>
                    </div>
                  </div>

                  {(q.explanation_uz || q.explanation_ru || q.explanation || q.solution) && (
                    <div style={{ marginTop: '16px', padding: '20px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#2563EB', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <BarChart3 size={16} />
                        Ekspert Izohi
                      </div>
                      <div style={{ fontSize: '14px', color: 'rgba(15, 23, 42, 0.8)', lineHeight: '1.6', margin: 0 }}>
                        <MathText>{q.explanation_uz || q.explanation_ru || q.explanation || q.solution}</MathText>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .hover-lift:hover { transform: translateY(-4px); border-color: rgba(15, 23, 42, 0.1) !important; background: rgba(15, 23, 42, 0.04) !important; }
        .hover-scale:hover { transform: scale(1.02); }
        .hover-bg-light:hover { background: rgba(15, 23, 42, 0.04) !important; }
        .hover-border-glow:hover { border-color: rgba(37, 99, 235, 0.3) !important; box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.05); }
        .stats-grid { grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 600px) {
          .stats-grid { grid-template-columns: 1fr !important; }
          .action-buttons button { width: 100%; justify-content: center; }
        }
      `}} />
    </div>
  );
}

