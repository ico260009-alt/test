import React, { useState, useEffect } from 'react';
import {
  FileText, HelpCircle, Calculator, Bookmark, LogOut,
  Moon, ChevronLeft, ChevronRight, CheckCircle, XCircle, ArrowLeft
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MathText from '../../components/MathText';
import { evaluateExpression } from '../../utils/safeCalculator';
import '../ExamArena/ExamLayout.css'; // Reuse existing styles

export default function PracticeLayout({ user, config, retryIds, onExit }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: selectedOptionIndex }
  const [checkedAnswers, setCheckedAnswers] = useState({}); // { questionId: boolean }
  const [bookmarks, setBookmarks] = useState(new Set()); // Set of questionIds

  // Modals state
  const [showCalculator, setShowCalculator] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [calcInput, setCalcInput] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        let qData = [];
        let payload = null;

        if (retryIds && retryIds.length > 0) {
          payload = { questionIds: retryIds };
        } else if (config && config.questionIds) {
          payload = { questionIds: config.questionIds };
        } else if (config && config.subject) {
          payload = { 
            subject: config.subject, 
            difficulty: config.difficulty, 
            count: config.count 
          };
        }

        if (payload) {
          const tokenResult = await supabase.auth.getSession();
          const jwt = tokenResult.data.session?.access_token;

          const startRes = await fetch('/api/start-practice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
            body: JSON.stringify(payload)
          });

          if (!startRes.ok) {
            const errData = await startRes.json();
            throw new Error(errData.error || 'Amaliyotni boshlashda xatolik yuz berdi');
          }
          const { sessionId: newSessionId } = await startRes.json();
          setSessionId(newSessionId);

          // Fetch questions securely via RPC
          const { data: qsData, error: qsError } = await supabase.rpc('get_practice_questions', {
            p_session_id: newSessionId
          });
            
          if (qsError) throw new Error(qsError.message);
          
          // Map q_id to id if backend was updated to avoid ambiguity
          const mappedData = (qsData || []).map(q => ({
            ...q,
            id: q.q_id || q.id
          }));
          
          // Shuffle them randomly since DB might return them in ID order
          qData = mappedData.sort(() => Math.random() - 0.5);
        }

        if (user && qData.length > 0) {
          const qIds = qData.map(q => q.id);

          // Fetch user's bookmarks
          const { data: bData } = await supabase
            .from('bookmarks')
            .select('question_id')
            .eq('user_id', user.id);
          if (bData) {
            setBookmarks(new Set(bData.map(b => b.question_id)));
          }

          // Fetch user's past attempts
          const { data: aData } = await supabase
            .from('attempts')
            .select('question_id, selected_option, is_correct, created_at')
            .eq('user_id', user.id)
            .eq('mode', 'practice')
            .in('question_id', qIds)
            .order('created_at', { ascending: false });

          if (aData && aData.length > 0) {
            const initialAnswers = {};
            const initialChecked = {};

            aData.forEach(attempt => {
              // Since it's ordered by created_at desc, the first one we see is the latest attempt
              if (initialAnswers[attempt.question_id] === undefined) {
                initialAnswers[attempt.question_id] = attempt.selected_option;
                initialChecked[attempt.question_id] = attempt.is_correct;
              }
            });

            setAnswers(initialAnswers);
            setCheckedAnswers(initialChecked);
          }
        }

        setQuestions(qData);
      } catch (error) {
        console.error("Error loading questions", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [config, retryIds, user?.id]);

  const handleSelectOption = (questionId, optionIndex) => {
    // Don't allow changing answer if already checked
    if (checkedAnswers[questionId] !== undefined) return;

    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const toggleBookmark = async (questionId) => {
    const isBookmarked = bookmarks.has(questionId);

    // Optimistic UI update
    setBookmarks(prev => {
      const newSet = new Set(prev);
      if (isBookmarked) newSet.delete(questionId);
      else newSet.add(questionId);
      return newSet;
    });

    try {
      if (isBookmarked) {
        await supabase.from('bookmarks').delete().match({ user_id: user.id, question_id: questionId });
      } else {
        await supabase.from('bookmarks').insert([{ user_id: user.id, question_id: questionId }]);
      }
    } catch (err) {
      console.error("Failed to toggle bookmark", err);
      // Revert on error
      setBookmarks(prev => {
        const newSet = new Set(prev);
        if (isBookmarked) newSet.add(questionId);
        else newSet.delete(questionId);
        return newSet;
      });
    }
  };

  const checkAnswer = async () => {
    const currentQ = questions[currentIndex];
    const selectedOpt = answers[currentQ.id];

    if (selectedOpt === undefined || checkedAnswers[currentQ.id] !== undefined || !sessionId) return;

    try {
      const tokenResult = await supabase.auth.getSession();
      const jwt = tokenResult.data.session?.access_token;

      const res = await fetch('/api/check-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
        body: JSON.stringify({
          sessionId,
          questionId: currentQ.id,
          userAnswer: selectedOpt
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to check answer');
      }

      const data = await res.json();

      setCheckedAnswers(prev => ({
        ...prev,
        [currentQ.id]: data.isCorrect
      }));

      // Update the question object directly with the correct answer fetched from the server
      setQuestions(prevQs => prevQs.map(q => {
        if (q.id === currentQ.id) {
          // We inject the revealed correct answer to display it
          const correctIdx = data.correctOptionIndex !== undefined && data.correctOptionIndex !== null 
            ? data.correctOptionIndex 
            : (q.options ? q.options.findIndex(opt => String(opt).trim() === String(data.correctAnswer).trim()) : -1);
            
          return { ...q, correct_option_index: correctIdx, correct_answer_text: data.correctAnswer, explanation_uz: data.explanation_uz, explanation_ru: data.explanation_ru };
        }
        return q;
      }));

    } catch (err) {
      console.error("Error checking answer", err);
      alert('Xatolik yuz berdi: ' + err.message);
    }
  };

  const handleCalcClick = (val) => {
    if (val === 'C') {
      setCalcInput('');
    } else if (val === '=') {
      try {
        const evaluated = evaluateExpression(calcInput);
        setCalcInput(evaluated.toString());
      } catch (e) {
        setCalcInput('Error');
      }
    } else {
      setCalcInput(prev => prev === 'Error' ? val : prev + val);
    }
  };

  const jumpToQuestion = (index) => {
    setCurrentIndex(index);
    setShowBookmarks(false);
  };

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.03)' }}>Yuklanmoqda...</div>;
  }

  const currentQ = questions[currentIndex];
  if (!currentQ) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.03)' }}>
      Savollar topilmadi. <button onClick={onExit} style={{ marginLeft: '12px', color: 'blue' }}>Ortga</button>
    </div>;
  }

  const isCurrentChecked = checkedAnswers[currentQ.id] !== undefined;
  const isCurrentCorrect = checkedAnswers[currentQ.id];
  const selectedCurrentOpt = answers[currentQ.id];

  const progressPercent = ((Object.keys(checkedAnswers).length / questions.length) * 100).toFixed(0);

  return (
    <div className="exam-container">
      {/* Left Sidebar */}
      <aside className="exam-sidebar">
        <div className="exam-logo-area">
          <div style={{ fontSize: '20px', fontWeight: '900', color: '#2563EB', letterSpacing: '-0.5px' }}>
            189<span style={{ color: '#0F172A' }}>PREP</span>
          </div>
        </div>
        <nav className="exam-nav">
          <button className="exam-nav-item active"><FileText size={18} /> Amaliyot</button>

          <button className="exam-nav-item mobile-only-nav" onClick={() => {
            const grid = document.querySelector('.exam-grid-section');
            if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}>
            <HelpCircle size={18} /> Savollar
          </button>



          <button className={`exam-nav-item ${showBookmarks ? 'active' : ''}`} onClick={() => setShowBookmarks(!showBookmarks)}>
            <Bookmark size={18} /> Eslatmalar
          </button>
        </nav>
        <div className="exam-sidebar-bottom">
          <button className="exam-nav-item text-red" onClick={onExit} style={{ color: '#0F172A', width: '100%' }}>
            <LogOut size={18} /> Chiqish
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="exam-main">
        {/* Header */}
        <header className="exam-header">
          <div className="exam-header-title" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={onExit} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.04)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#0F172A' }} title="Bosh sahifaga qaytish">
              <ArrowLeft size={20} />
            </button>
            <span>{config?.subject || "Amaliyot"} <span className="exam-header-subtitle">| O'zlashtirish</span></span>
          </div>
          <div className="exam-header-actions">

            <div className="exam-user-profile">
              <div className="exam-avatar">
                {((user?.full_name || user?.email || 'U').charAt(0)).toUpperCase()}
              </div>
              {user?.full_name || (user?.email ? user.email.split('@')[0] : 'Foydalanuvchi')}
            </div>
          </div>
        </header>

        {/* Question Area */}
        <div className="exam-content-area">
          <section className="exam-question-section">
            {/* Progress Row */}
            <div className="exam-progress-row">
              <span className="exam-q-count">{currentIndex + 1} <span className="exam-q-total">/ {questions.length} savol</span></span>
              <div className="exam-progress-dots">
                {questions.slice(Math.max(0, currentIndex - 3), currentIndex + 5).map((q, i) => {
                  const actualIndex = questions.indexOf(q);
                  const isCurrent = actualIndex === currentIndex;
                  const isAnswered = checkedAnswers[q.id] !== undefined;
                  return (
                    <div key={q.id} className={`progress-dot ${isCurrent ? 'current' : isAnswered ? 'answered' : ''}`}>
                      {actualIndex + 1}
                    </div>
                  );
                })}
                {currentIndex < questions.length - 5 && <span style={{ color: 'rgba(15, 23, 42, 0.4)', letterSpacing: '2px' }}>...</span>}
                <div className="progress-dot">{questions.length}</div>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(15, 23, 42, 0.5)' }}>{progressPercent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="exam-progress-bar-container">
              <div className="exam-progress-bar">
                <div className="exam-progress-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>

            {/* Question Card */}
            <div className="exam-question-card">
              <div className="exam-q-header">
                <div className="exam-q-tags">
                  <span className="exam-tag-q">Q{currentIndex + 1}</span>
                  <span className="exam-tag-type">{currentQ.question_type === 'written' ? 'Yozma javob' : currentQ.difficulty || 'Normal'}</span>
                </div>
                <button className="exam-bookmark-btn" onClick={() => toggleBookmark(currentQ.id)}>
                  <Bookmark size={16} fill={bookmarks.has(currentQ.id) ? "currentColor" : "none"} />
                  Eslatmaga qo'shish
                </button>
              </div>

              <div className="exam-q-text"><MathText>{currentQ.text}</MathText></div>

              {currentQ.image_url && (
                <img src={currentQ.image_url} alt="Savol rasmi" className="exam-q-image" />
              )}

              {currentQ.question_type === 'multipart_ab' ? (
                <div className="exam-written-answer" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {['a', 'b'].map(part => {
                    let cVal = { a: '', b: '' };
                    try { if(answers[currentQ.id]) cVal = JSON.parse(answers[currentQ.id]); } catch(e) {}
                    let correctObj = { a: '', b: '' };
                    try { if(currentQ.correct_answer_text) correctObj = JSON.parse(currentQ.correct_answer_text); } catch(e) {}
                    
                    return (
                      <div key={part} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '18px', textTransform: 'uppercase' }}>{part}:</span>
                          <input 
                            type="text"
                            placeholder={`${part.toUpperCase()} qism javobi`}
                            value={cVal[part] || ''}
                            disabled={isCurrentChecked}
                            onChange={e => {
                              const nVal = { ...cVal, [part]: e.target.value };
                              setAnswers(prev => ({ ...prev, [currentQ.id]: JSON.stringify(nVal) }));
                            }}
                            style={{ 
                              flex: 1, padding: '16px', borderRadius: '12px', fontSize: '16px', outline: 'none',
                              border: isCurrentChecked && isCurrentCorrect ? '2px solid #22C55E' : isCurrentChecked && !isCurrentCorrect ? '2px solid #EF4444' : '1px solid rgba(15, 23, 42, 0.2)',
                              background: isCurrentChecked && isCurrentCorrect ? '#F0FDF4' : isCurrentChecked && !isCurrentCorrect ? '#FEF2F2' : 'white'
                            }}
                          />
                        </div>
                        {isCurrentChecked && !isCurrentCorrect && (
                          <div style={{ color: '#22C55E', fontWeight: 'bold', marginLeft: '30px', fontSize: '14px' }}>
                            To'g'ri javob: {correctObj[part]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : currentQ.question_type === 'written' ? (
                <div className="exam-written-answer">
                  <textarea
                    placeholder="Javobingizni shu yerga kiriting..."
                    value={answers[currentQ.id] || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
                    disabled={isCurrentChecked}
                    style={{
                      width: '100%', minHeight: '100px', padding: '16px', borderRadius: '12px',
                      border: isCurrentChecked && isCurrentCorrect ? '2px solid #22C55E' : isCurrentChecked && !isCurrentCorrect ? '2px solid #EF4444' : '1px solid rgba(15, 23, 42, 0.2)',
                      fontSize: '16px', color: '#0F172A', resize: 'vertical',
                      background: isCurrentChecked && isCurrentCorrect ? '#F0FDF4' : isCurrentChecked && !isCurrentCorrect ? '#FEF2F2' : 'white'
                    }}
                  />
                  {isCurrentChecked && !isCurrentCorrect && (
                    <div style={{ marginTop: '8px', color: '#22C55E', fontWeight: 'bold' }}>To'g'ri javob: {currentQ.correct_answer_text}</div>
                  )}
                </div>
              ) : (
                <div className="exam-options">
                  {currentQ.options && Array.isArray(currentQ.options) && currentQ.options.map((opt, idx) => {
                    const isSelected = selectedCurrentOpt === idx;
                    const isCorrectAnswer = idx === currentQ.correct_option_index;

                    let optionClass = 'exam-option';
                    if (isSelected) optionClass += ' selected';

                    // Reveal colors if checked
                    if (isCurrentChecked) {
                      if (isCorrectAnswer) optionClass += ' correct-option';
                      else if (isSelected) optionClass += ' incorrect-option';
                    }

                    const labels = ['A', 'B', 'C', 'D', 'E'];
                    return (
                      <div key={idx}
                        className={optionClass}
                        onClick={() => handleSelectOption(currentQ.id, idx)}
                        style={{
                          pointerEvents: isCurrentChecked ? 'none' : 'auto',
                          borderColor: isCurrentChecked && isCorrectAnswer ? '#22C55E' : isCurrentChecked && isSelected && !isCorrectAnswer ? '#0F172A' : ''
                        }}
                      >
                        <div className="exam-radio" style={{ borderColor: isCurrentChecked && isCorrectAnswer ? '#22C55E' : isCurrentChecked && isSelected && !isCorrectAnswer ? '#0F172A' : '' }}>
                          <div className="exam-radio-inner" style={{ background: isCurrentChecked && isCorrectAnswer ? '#22C55E' : isCurrentChecked && isSelected && !isCorrectAnswer ? '#0F172A' : '' }}></div>
                        </div>
                        <span className="exam-option-label">{labels[idx]}.</span>
                        <span className="exam-option-text"><MathText>{opt}</MathText></span>

                        {isCurrentChecked && isCorrectAnswer && <CheckCircle size={18} color="#22C55E" style={{ marginLeft: 'auto' }} />}
                        {isCurrentChecked && isSelected && !isCorrectAnswer && <XCircle size={18} color="#0F172A" style={{ marginLeft: 'auto' }} />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Check Answer Button */}
              {!isCurrentChecked && (
                <div style={{ marginTop: '24px', textAlign: 'right' }}>
                  <button
                    onClick={checkAnswer}
                    disabled={answers[currentQ.id] === undefined || answers[currentQ.id] === '' || answers[currentQ.id] === '{}'}
                    style={{
                      padding: '12px 24px',
                      background: (answers[currentQ.id] === undefined || answers[currentQ.id] === '' || answers[currentQ.id] === '{}') ? 'rgba(15, 23, 42, 0.1)' : '#2563EB',
                      color: (answers[currentQ.id] === undefined || answers[currentQ.id] === '' || answers[currentQ.id] === '{}') ? 'rgba(15, 23, 42, 0.4)' : 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: (answers[currentQ.id] === undefined || answers[currentQ.id] === '' || answers[currentQ.id] === '{}') ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Javobni tekshirish
                  </button>
                </div>
              )}

              {/* Explanation Panel */}
              {isCurrentChecked && (
                <div style={{
                  marginTop: '24px',
                  padding: '20px',
                  background: isCurrentCorrect ? '#F0FDF4' : 'rgba(15, 23, 42, 0.04)',
                  border: `1px solid ${isCurrentCorrect ? '#BBF7D0' : 'rgba(15, 23, 42, 0.1)'}`,
                  borderRadius: '12px'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', color: isCurrentCorrect ? '#166534' : '#991B1B' }}>
                    {isCurrentCorrect ? <CheckCircle size={18} /> : <XCircle size={18} />}
                    {isCurrentCorrect ? "To'g'ri javob!" : "Noto'g'ri javob."}
                  </h4>
                  <div style={{ color: 'rgba(15, 23, 42, 0.7)', lineHeight: '1.6' }}>
                    <strong>Tushuntirish: </strong>
                    {currentQ.explanation_uz || currentQ.explanation_ru || currentQ.explanation || "Bu savol uchun tushuntirish kiritilmagan."}
                  </div>
                  {/* AI badge */}
                  {(!currentQ.explanation_uz || currentQ.explanation_uz.includes('AI')) && (
                    <span style={{ display: 'inline-block', marginTop: '12px', fontSize: '11px', background: 'rgba(15, 23, 42, 0.1)', padding: '2px 8px', borderRadius: '12px', color: 'rgba(15, 23, 42, 0.6)' }}>
                      вњЁ AI-drafted
                    </span>
                  )}
                </div>
              )}

              <div className="exam-controls" style={{ marginTop: '32px' }}>
                <button
                  className="exam-btn-outline"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => prev - 1)}
                >
                  <ChevronLeft size={16} /> Oldingi
                </button>

                <button
                  className="exam-btn-primary"
                  disabled={currentIndex === questions.length - 1}
                  onClick={() => setCurrentIndex(prev => prev + 1)}
                >
                  Keyingi <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>

          {/* Right Panel (Grid) */}
          <aside className="exam-right-panel">
            <div className="exam-legend">
              <div className="legend-item"><div className="legend-dot" style={{ background: '#22C55E' }}></div> To'g'ri</div>
              <div className="legend-item"><div className="legend-dot" style={{ background: '#0F172A' }}></div> Noto'g'ri</div>
              <div className="legend-item"><div className="legend-dot current"></div> Joriy savol</div>
              <div className="legend-item"><div className="legend-dot bookmarked"></div> Eslatma</div>
            </div>

            <div className="exam-grid-section">
              <div className="exam-grid-title">Savollar</div>
              <div className="exam-grid">
                {questions.map((q, i) => {
                  const isCurrent = i === currentIndex;
                  const isChecked = checkedAnswers[q.id] !== undefined;
                  const isCorrect = checkedAnswers[q.id];
                  const isBookmarked = bookmarks.has(q.id);

                  let classes = 'grid-btn';
                  if (isCurrent) classes += ' current';
                  else if (isChecked) {
                    if (isCorrect) classes += ' answered'; // green-ish in our css but we can inline override
                  }
                  if (isBookmarked) classes += ' bookmarked';

                  return (
                    <button
                      key={q.id}
                      className={classes}
                      onClick={() => setCurrentIndex(i)}
                      style={{
                        background: isChecked && !isCurrent ? (isCorrect ? '#DCFCE7' : '#FEE2E2') : '',
                        borderColor: isChecked && !isCurrent ? (isCorrect ? '#22C55E' : '#0F172A') : '',
                        color: isChecked && !isCurrent ? (isCorrect ? '#166534' : '#991B1B') : ''
                      }}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>

        {/* Modals Overlay */}
        {(showCalculator || showBookmarks) && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCalculator(false);
              setShowBookmarks(false);
            }
          }}>


            {/* Bookmarks Modal */}
            {showBookmarks && (
              <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', width: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}><Bookmark size={18} color="#2563EB" /> Eslatmalar ({bookmarks.size})</h3>
                  <button onClick={() => setShowBookmarks(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(15, 23, 42, 0.4)' }}>вњ•</button>
                </div>

                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
                  {bookmarks.size === 0 ? (
                    <p style={{ color: 'rgba(15, 23, 42, 0.5)', textAlign: 'center', padding: '32px 0' }}>Hali hech qanday savol eslatmaga qo'shilmagan.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {questions.map((q, idx) => {
                        if (!bookmarks.has(q.id)) return null;
                        return (
                          <button
                            key={q.id}
                            onClick={() => jumpToQuestion(idx)}
                            style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', border: '1px solid rgba(15, 23, 42, 0.1)', borderRadius: '8px', background: 'white', cursor: 'pointer', textAlign: 'left' }}
                          >
                            <span style={{ background: '#2563EB', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Q{idx + 1}</span>
                            <span style={{ fontSize: '14px', color: '#0F172A', lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {q.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
