import React, { useState, useEffect } from 'react';
import {
  FileText, HelpCircle, Bookmark, LogOut,
  ChevronLeft, ChevronRight, Pause, Flag, ShieldAlert, HeadphonesIcon, ArrowLeft,
  PanelLeftClose, PanelLeftOpen, Clock, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import HighlightableText from '../../components/exam/HighlightableText';
import MathText from '../../components/MathText';
import './ExamLayout.css';

// A stable, per-exam key so progress/result caching never collides between different
// tests/practice sets, and survives exactly as long as it should (see clearExamCache).
function getExamKey(testId, customConfig) {
  if (customConfig?.isALevel) {
    return `alevel:${(customConfig.papers || []).map(p => p.id).join(',')}`;
  }
  if (customConfig) {
    return `custom:${(customConfig.questionIds || []).join(',') || 'random'}`;
  }
  return `test:${testId}`;
}

const PROGRESS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const progressKey = (examKey) => `exam_progress:${examKey}`;
const resultKey = (examKey) => `exam_result:${examKey}`;

function readCached(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.savedAt || Date.now() - parsed.savedAt > PROGRESS_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch (e) {
    localStorage.removeItem(key);
    return null;
  }
}

function writeCached(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...value, savedAt: Date.now() }));
  } catch (e) {
    // localStorage can throw (quota, private-browsing) - progress caching is a nice-to-have,
    // never let it break the actual exam flow.
  }
}

function clearExamCache(examKey) {
  localStorage.removeItem(progressKey(examKey));
  localStorage.removeItem(resultKey(examKey));
}

export default function ExamLayout({ user, testId, customConfig, onExamComplete, onExit }) {
  const [questions, setQuestions] = useState([]);
  const [testInfo, setTestInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: selectedOptionIndex }
  const [bookmarks, setBookmarks] = useState(new Set()); // Set of questionIds

  const [timeLeft, setTimeLeft] = useState(180 * 60); // Default 180 mins
  const [isPaused, setIsPaused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // examResult is no longer internal state — the result is handed off to App via
  // onExamComplete(), which navigates to /exam/results and persists it to sessionStorage.

  // Modals state
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  const [showErrorReport, setShowErrorReport] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Pause limits state
  const [pauseCount, setPauseCount] = useState(0);
  const [pauseTimeLeft, setPauseTimeLeft] = useState(5 * 60); // 5 minutes max

  // A-Level Specific State
  const [currentPaperIndex, setCurrentPaperIndex] = useState(0);
  const [isALevelBreak, setIsALevelBreak] = useState(false);
  const [allALevelAnswers, setAllALevelAnswers] = useState({});
  const [allALevelQuestions, setAllALevelQuestions] = useState([]);
  const [isAiGrading, setIsAiGrading] = useState(false);

  // Essay Specific State
  // Essay logic handled dynamically via question_type === 'essay'

  // Fetch test and questions
  useEffect(() => {
    let ignore = false;
    const examKey = getExamKey(testId, customConfig);

    async function loadData() {
      try {
        if (ignore) return;
        setLoading(true);

        // 1. If this exam was already completed (and the user is on /exam after a refresh),
        // hand the cached result off to App so it navigates to /exam/results.
        const cachedResult = readCached(resultKey(examKey));
        if (cachedResult) {
          if (ignore) return;
          setLoading(false);
          onExamComplete(cachedResult.examResult);
          return;
        }

        const cachedProgress = readCached(progressKey(examKey));

        if (customConfig && customConfig.isALevel) {
          const currentPaper = customConfig.papers[currentPaperIndex];
          if (ignore) return;
          setTestInfo(currentPaper);
          setTimeLeft(currentPaper.duration_minutes * 60);

          const tokenResult = await supabase.auth.getSession();
          const jwt = tokenResult.data.session?.access_token;

          const startRes = await fetch('/api/start-exam', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
             body: JSON.stringify({ testId: currentPaper.id })
          });

          if (!startRes.ok) throw new Error('Failed to start A-Level session');
          const { sessionId: newSessionId } = await startRes.json();
          if (ignore) return;
          setSessionId(newSessionId);

          const qRes = await fetch('/api/get-exam-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
            body: JSON.stringify({ sessionId: newSessionId })
          });
          if (qRes.ok) {
            const { questions: qData } = await qRes.json();
            if (ignore) return;
            if (qData) setQuestions(qData);
          }

          if (cachedProgress && cachedProgress.sessionId === newSessionId) {
            setAnswers(cachedProgress.answers || {});
            setCurrentIndex(cachedProgress.currentIndex || 0);
            if (cachedProgress.allALevelAnswers) setAllALevelAnswers(cachedProgress.allALevelAnswers);
            if (cachedProgress.allALevelQuestions) setAllALevelQuestions(cachedProgress.allALevelQuestions);
          }

        } else if (customConfig) {
          setTestInfo({ subject: customConfig.subject, duration_minutes: customConfig.duration_minutes });
          setTimeLeft(customConfig.duration_minutes * 60);

          const tokenResult = await supabase.auth.getSession();
          const jwt = tokenResult.data.session?.access_token;

          const startRes = await fetch('/api/start-practice', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
             body: JSON.stringify({ questionIds: customConfig.questionIds })
          });

          if (!startRes.ok) throw new Error('Failed to start custom session');
          const { sessionId: newSessionId } = await startRes.json();
          if (ignore) return;
          setSessionId(newSessionId);

          const { data: qData } = await supabase.rpc('get_practice_questions', { p_session_id: newSessionId });
          if (ignore) return;
          if (qData) setQuestions(qData);

          if (cachedProgress && cachedProgress.sessionId === newSessionId) {
            setAnswers(cachedProgress.answers || {});
            setCurrentIndex(cachedProgress.currentIndex || 0);
          }
        } else if (testId) {
          // Kick off the client-side test-metadata fetch, auth/session lookup, and
          // bookmarks fetch concurrently - none of them depend on each other, and the
          // old sequential version added a full extra round-trip's worth of latency to
          // every exam load for no reason.
          const [{ data: testData }, tokenResult, bookmarksResult] = await Promise.all([
            supabase.from('mock_tests').select('*').eq('id', testId).single(),
            supabase.auth.getSession(),
            user
              ? supabase.from('bookmarks').select('question_id').eq('user_id', user.id)
              : Promise.resolve({ data: null }),
          ]);

          if (ignore) return;

          if (testData) {
            setTestInfo(testData);
            setTimeLeft(testData.duration_minutes * 60);
          }
          if (bookmarksResult?.data) {
            setBookmarks(new Set(bookmarksResult.data.map(b => b.question_id)));
          }

          const jwt = tokenResult.data.session?.access_token;

          // Start exam securely, then fetch questions - these two are necessarily
          // sequential (the second needs the session id from the first).
          const startRes = await fetch('/api/start-exam', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
             body: JSON.stringify({ testId })
          });

          if (!startRes.ok) {
            const err = await startRes.json();
            throw new Error(err.error || 'Failed to start exam session');
          }

          const { sessionId: newSessionId } = await startRes.json();
          if (ignore) return;
          setSessionId(newSessionId);

          const qRes = await fetch('/api/get-exam-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
            body: JSON.stringify({ sessionId: newSessionId })
          });

          if (!qRes.ok) {
             const qErr = await qRes.json();
             const errMsg = qErr.error || 'Failed to fetch questions';
             // If the session was expired/invalid, wipe the stale cache so a fresh
             // session will be created on the very next attempt instead of re-using
             // the same dead session id.
             if (errMsg.toLowerCase().includes('expired') || errMsg.toLowerCase().includes('invalid')) {
               clearExamCache(examKey);
             }
             throw new Error(errMsg);
          }

          const { questions: qData } = await qRes.json();
          if (ignore) return;
          if (qData) {
            setQuestions(qData);
          }

          // create_exam_session (called by /api/start-exam) resumes the same in-progress
          // session on a refresh rather than creating a new one - so if our cached progress
          // was saved against that SAME session, it's still valid and we restore it. If the
          // session id differs (e.g. the old one expired and a new attempt was created),
          // the stale progress is simply left uncached rather than applied.
          if (cachedProgress && cachedProgress.sessionId === newSessionId) {
            setAnswers(cachedProgress.answers || {});
            setCurrentIndex(cachedProgress.currentIndex || 0);
          }
        }
      } catch (error) {
        console.error("Error loading test", error);
        if (ignore) return;
        setTestInfo({ error: error.message });
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    if (testId || customConfig) loadData();
    return () => { ignore = true; };
  }, [testId, customConfig, user?.id, currentPaperIndex, retryCount]);

  // Live-save progress (answers + current position) as the user works, scoped to this
  // exam and session, so a refresh can restore exactly where they left off. Replaces the
  // old beforeunload-based snapshot, which built a fake "result" on every unload
  // (including a plain refresh mid-exam) and sent the user straight to a results screen
  // they hadn't earned yet.
  useEffect(() => {
    if (!sessionId || loading) return;
    const examKey = getExamKey(testId, customConfig);
    writeCached(progressKey(examKey), {
      sessionId,
      answers,
      currentIndex,
      allALevelAnswers: customConfig?.isALevel ? allALevelAnswers : undefined,
      allALevelQuestions: customConfig?.isALevel ? allALevelQuestions : undefined,
    });
  }, [sessionId, answers, currentIndex, loading, testId, customConfig, allALevelAnswers, allALevelQuestions]);

  // Timer logic for Exam
  useEffect(() => {
    if (loading || isPaused || submitting || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, isPaused, submitting, timeLeft]);

  // Timer logic for Pause limit
  useEffect(() => {
    if (!isPaused || submitting || pauseTimeLeft <= 0) return;

    const pauseTimer = setInterval(() => {
      setPauseTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(pauseTimer);
          setIsPaused(false);
          alert("Pauza vaqti tugadi (5 daqiqa). Imtihon avtomatik davom etadi.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(pauseTimer);
  }, [isPaused, submitting, pauseTimeLeft]);

  // Progress persistence is now handled by the live-save effect above (runs on every
  // answer/position change) rather than a beforeunload handler - see the comment there
  // for why the old approach caused a refresh mid-exam to jump to a fake results screen.

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (questionId, optionIndex) => {
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

  const handleSubmit = async () => {
    if (submitting || isAiGrading) return;

    if (customConfig && customConfig.isALevel) {
      // Save current paper's data
      const newAllAnswers = { ...allALevelAnswers, ...answers };
      const newAllQuestions = [...allALevelQuestions, ...questions];

      setAllALevelAnswers(newAllAnswers);
      setAllALevelQuestions(newAllQuestions);

      if (currentPaperIndex < customConfig.papers.length - 1) {
        setIsALevelBreak(true);
        return; // wait for user to continue
      } else {
        // Last paper! Grade everything
        setIsAiGrading(true);
        let finalScore = 0;
        let finalAnswers = { ...newAllAnswers };

        for (const q of newAllQuestions) {
          if (q.question_type === 'written') {
            const userAns = (finalAnswers[q.id] || '').toString().trim();
            const correctAns = (q.correct_answer_text || '').toString().trim();
            if (userAns !== '' && correctAns !== '') {
              try {
                const res = await fetch('/api/grade-answer', {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + ((await supabase.auth.getSession()).data.session?.access_token || '')
                  },
                  body: JSON.stringify({ userAnswer: userAns, correctAnswer: correctAns, questionText: q.text })
                });
                const data = await res.json();
                if (data.isCorrect) finalScore += q.points || 1;
              } catch (e) {
                console.error("AI grading failed", e);
                // Fallback to strict match
                if (userAns.toLowerCase() === correctAns.toLowerCase()) finalScore += q.points || 1;
              }
            }
          } else {
            if (finalAnswers[q.id] === q.correct_option_index) {
              finalScore += q.points || 1;
            }
          }
        }

        try {
          // You could optionally insert multiple sessions, but we'll insert one for the overall config
          const resultObj = {
            subject: { name: `A-Level Mathematics (${customConfig.level}) - ${customConfig.combo}`, id: customConfig.papers[0].id },
            questions: newAllQuestions.map(q => ({
              ...q,
              correct: q.question_type === 'written' ? q.correct_answer_text : (q.options ? q.options[q.correct_option_index] : '')
            })),
            answers: Object.fromEntries(
              Object.entries(finalAnswers).map(([qid, ansVal]) => {
                const q = newAllQuestions.find(item => item.id === qid);
                if (!q) return [qid, null];
                if (q.question_type === 'written') return [qid, ansVal];
                return [qid, q.options ? q.options[ansVal] : null];
              })
            ),
            correctCount: finalScore,
            earnedBall: finalScore,
            maxBall: newAllQuestions.reduce((sum, q) => sum + (q.points || 1), 0),
            timeSpent: "A-Level Time"
          };
          setShowReviewModal(false);
          const examKey = getExamKey(testId, customConfig);
          writeCached(resultKey(examKey), { examResult: resultObj });
          localStorage.removeItem(progressKey(examKey));
          // Hand the result off to App, which will persist it and navigate to /exam/results
          onExamComplete(resultObj);
        } catch (error) {
          alert('Xatolik yuz berdi');
        } finally {
          setIsAiGrading(false);
        }
        return;
      }
    }

    // Normal non-ALevel submit
    setSubmitting(true);
    let score = 0;
    let maxScore = 0;
    let correctAnswersCount = 0;
    questions.forEach((q, idx) => {
      let questionPoints = q.points || 1;
      if (testInfo?.exam_system === 'dtm') {
        if (idx < 30) questionPoints = 1.1;
        else if (idx < 60) questionPoints = 3.1;
        else questionPoints = 2.1;
      }
      if (q.question_type !== 'essay') {
        maxScore += questionPoints;
      }

      if (q.question_type === 'written') {
        const userAns = (answers[q.id] || '').toString().trim().toLowerCase();
        const correctAnsStr = (q.correct_answer_text || '').toString().trim().toLowerCase();
        const correctAnswers = correctAnsStr.split(',').map(a => a.trim()).filter(a => a !== '');
        if (correctAnswers.includes(userAns) && userAns !== '') {
          score += questionPoints;
          correctAnswersCount++;
        }
      } else if (q.question_type !== 'essay') {
        if (String(answers[q.id]) === String(q.correct_option_index)) {
          score += questionPoints;
          correctAnswersCount++;
        }
      }
    });

    let finalTestScore = score;
    let finalMaxScore = maxScore;
    
    if (testInfo?.exam_system === 'milliy_sertifikat' && maxScore > 0) {
      finalTestScore = Number(((score / maxScore) * 75).toFixed(1));
      finalMaxScore = 75;
    }

    let essayScore = null;
    let essayFeedbackData = null;

    const essayQuestion = questions.find(q => q.question_type === 'essay');
    const essayAnswerText = essayQuestion ? (answers[essayQuestion.id] || '') : '';
    const shouldGradeEssay = essayQuestion && essayAnswerText.trim().length > 30;

    if (shouldGradeEssay) setIsAiGrading(true);

    try {
      const timeSpentSecs = (testInfo ? testInfo.duration_minutes * 60 : 180 * 60) - timeLeft;

      // Essay grading (AI call, can take several seconds) and submitting answers for
      // authoritative server-side scoring are independent of each other - they used to be
      // awaited one after another, which is a large part of why results felt slow to load
      // whenever an exam included an essay question. Running them concurrently cuts that
      // wait roughly in half.
      const essayGradingPromise = shouldGradeEssay
        ? (async () => {
            try {
              const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : '');
              const response = await fetch(`${apiUrl}/api/grade-essay`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + ((await supabase.auth.getSession()).data.session?.access_token || '')
                },
                body: JSON.stringify({
                  topic: essayQuestion.text || 'Mavzu kiritilmagan',
                  essay: essayAnswerText,
                  lang: 'uz',
                  essayType: testInfo?.exam_system === 'ielts' ? 'ielts_task2' : 'onatili'
                })
              });
              const data = await response.json();
              essayFeedbackData = data;
              if (data.score) {
                const match = String(data.score).match(/([0-9]+[\.,]?[0-9]*)/);
                if (match) essayScore = parseFloat(match[0].replace(',', '.'));
              }
            } catch (err) {
              console.error("Essay grading error:", err);
            } finally {
              setIsAiGrading(false);
            }
          })()
        : Promise.resolve();

      let serverQuestions = null;
      let serverCorrectCount = correctAnswersCount;
      let serverScore = finalTestScore;

      const submitPromise = sessionId
        ? (async () => {
            const tokenResult = await supabase.auth.getSession();
            const jwt = tokenResult.data.session?.access_token;

            const response = await fetch('/api/submit-exam', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwt}`
              },
              body: JSON.stringify({
                sessionId: sessionId,
                answers: answers,
                timeSpentSecs: timeSpentSecs
              })
            });

            if (!response.ok) {
              const errData = await response.json();
              throw new Error(errData.error || 'Failed to submit exam');
            }

            const data = await response.json();
            serverScore = data.score; // Authoritative score for non-essay questions
            if (data.gradedQuestions) {
              serverQuestions = data.gradedQuestions;
              serverCorrectCount = data.gradedQuestions.filter(q => q.is_correct).length;
            }
          })()
        : Promise.resolve();

      await Promise.all([essayGradingPromise, submitPromise]);

      // Blend the essay score (if any) into the authoritative server score, instead of
      // silently discarding it - the server intentionally doesn't grade essay questions
      // itself (that's this AI call's job), so it has to be combined client-side.
      let finalCalculatedScore = Number(serverScore.toFixed ? serverScore.toFixed(1) : serverScore);
      
      if (testInfo?.exam_system === 'milliy_sertifikat' && maxScore > 0 && sessionId) {
        finalCalculatedScore = Number(((serverScore / maxScore) * 75).toFixed(1));
        finalTestScore = finalCalculatedScore;
      }

      let essayScoreVal = null;
      if (essayScore !== null) {
        finalCalculatedScore = Number(((finalCalculatedScore + essayScore) / 2).toFixed(1));
        essayScoreVal = essayScore;
      }

      setShowReviewModal(false);

      const resultQuestions = serverQuestions || questions.map((q, i) => {
        let pts = q.points || 1;
        if (testInfo?.exam_system === 'dtm') {
          if (i < 30) pts = 1.1;
          else if (i < 60) pts = 3.1;
          else pts = 2.1;
        }
        return {
          ...q,
          points: pts,
          correct: q.question_type === 'written' ? q.correct_answer_text : (q.options ? q.options[q.correct_option_index] : '')
        };
      });

      const resultObj = {
        subject: { name: testInfo?.subject || 'Test', id: testId, system: testInfo?.exam_system || 'dtm' },
        questions: resultQuestions,
        answers: Object.fromEntries(
          Object.entries(answers).map(([qid, ansVal]) => {
            const q = resultQuestions.find(item => item.id === qid);
            if (!q) return [qid, null];
            if (q.question_type === 'written') return [qid, ansVal];

            let opts = q.options;
            if (typeof opts === 'string') {
              try { opts = JSON.parse(opts); } catch(e) {}
            }
            return [qid, opts ? opts[ansVal] : null];
          })
        ),
        correctCount: serverQuestions ? serverCorrectCount : correctAnswersCount,
        earnedBall: finalCalculatedScore,
        maxBall: Number(finalMaxScore.toFixed(1)),
        timeSpent: formatTime(timeSpentSecs),
        testScore: Number(finalTestScore.toFixed(1)),
        essayScore: essayScoreVal,
        essayFeedback: essayFeedbackData
      };

      // Persist result cache (for 6h) in case of immediate refresh before /exam/results renders,
      // then hand off to App which navigates to /exam/results with sessionStorage persistence.
      const examKey = getExamKey(testId, customConfig);
      writeCached(resultKey(examKey), { examResult: resultObj });
      localStorage.removeItem(progressKey(examKey));
      onExamComplete(resultObj);
    } catch (error) {
      console.error(error);
      alert('Xatolik yuz berdi: ' + error.message);
      setSubmitting(false);
    }
  };

  const submitErrorReport = async () => {
    if (!reportMessage.trim()) return;
    setIsSubmittingReport(true);
    try {
      const q = questions[currentIndex];
      const { error } = await supabase.from('error_reports').insert([{
        test_id: testId || testInfo?.id || null,
        question_id: q ? q.id : null,
        user_id: user?.id,
        message: reportMessage.trim()
      }]);
      if (error) throw error;
      alert("Xabaringiz yuborildi. Rahmat!");
      setShowErrorReport(false);
      setReportMessage('');
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi: " + err.message);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const jumpToQuestion = (index) => {
    setCurrentIndex(index);
    setShowBookmarks(false);
  };

  const handleExit = () => {
    clearExamCache(getExamKey(testId, customConfig));
    onExit();
  };

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.03)' }}>Yuklanmoqda...</div>;
  }

  if (isAiGrading) {
    return <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.03)' }}>
      <h2 style={{ color: '#0F172A', marginBottom: '8px' }}>AI tekshirmoqda...</h2>
      <p style={{ color: 'rgba(15, 23, 42, 0.6)' }}>Yozma javoblaringiz sun'iy intellekt tomonidan baholanmoqda.</p>
    </div>;
  }

  if (isALevelBreak) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <h2 style={{ fontSize: '32px', color: '#0F172A', marginBottom: '16px' }}>Tanaffus vaqti</h2>
        <p style={{ fontSize: '18px', color: '#334155', maxWidth: '500px', textAlign: 'center', marginBottom: '32px' }}>
          Siz {customConfig?.papers[currentPaperIndex]?.title} qismini yakunladingiz. Keyingi qismga o'tishga tayyor bo'lganingizda pastdagi tugmani bosing.
        </p>
        <button
          onClick={() => {
            setAnswers({}); // clear local answers for next paper
            setCurrentIndex(0);
            setIsALevelBreak(false);
            setCurrentPaperIndex(prev => prev + 1);
          }}
          style={{ padding: '16px 32px', background: '#2563EB', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}
        >
          Keyingi qismga o'tish
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  if (questions.length === 0 && !loading) {
    const isSessionError = testInfo?.error &&
      (testInfo.error.toLowerCase().includes('expired') || testInfo.error.toLowerCase().includes('invalid'));
    return (
      <div className="exam-layout">
        <div className="exam-error">
            <h2>{isSessionError ? 'Sessiya muddati tugagan' : 'Savollar topilmadi'}</h2>
            <p>
              {isSessionError
                ? 'Imtihon sessiyasi muddati tugagan. Yangi sessiya boshlash uchun qayta urinib ko\'ring.'
                : testInfo?.error
                  ? `Xato: ${testInfo.error}`
                  : 'Ushbu test uchun hali savollar kiritilmagan yoki yuklashda xatolik yuz berdi.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '12px' }}>
              {isSessionError && (
                <button
                  onClick={() => {
                    const examKey = getExamKey(testId, customConfig);
                    clearExamCache(examKey);
                    setTestInfo(null);
                    setQuestions([]);
                    setLoading(true);
                    setRetryCount(c => c + 1);
                  }}
                  className="btn-primary"
                >
                  Qayta urinish
                </button>
              )}
              <button onClick={handleExit} className="btn-secondary" style={{ marginTop: 0 }}>Orqaga qaytish</button>
            </div>
        </div>
      </div>
    );
  }



  const progressPercent = ((Object.keys(answers).length / questions.length) * 100).toFixed(0);
  const timerPercent = testInfo ? ((timeLeft / (testInfo.duration_minutes * 60)) * 100) : 100;

  return (
    <div className="exam-container">


      {/* Left Sidebar */}
      <aside className={`exam-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="exam-logo-area">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              justifyContent: isSidebarCollapsed ? 'center' : 'flex-start'
            }}
          >
            <img
              src="/logo-189.png"
              alt="189 Logo"
              style={{ height: '38px', width: 'auto', objectFit: 'contain' }}
            />
            {!isSidebarCollapsed && (
              <span style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.8px', color: '#0F172A' }}>
                PREP
              </span>
            )}
          </div>
        </div>
        <nav className="exam-nav">
          <button className="exam-nav-item active" title={isSidebarCollapsed ? 'Imtihon' : ''}>
            <FileText size={18} /> {!isSidebarCollapsed && 'Imtihon'}
          </button>
          
          <button className={`exam-nav-item ${showErrorReport ? 'active' : ''}`} title={isSidebarCollapsed ? 'Xatolik haqida' : ''} onClick={() => setShowErrorReport(true)}>
            <HelpCircle size={18} /> {!isSidebarCollapsed && 'Xatolik haqida'}
          </button>

          <button className={`exam-nav-item ${showBookmarks ? 'active' : ''}`} title={isSidebarCollapsed ? 'Eslatma' : ''} onClick={() => setShowBookmarks(!showBookmarks)}>
            <Bookmark size={18} /> {!isSidebarCollapsed && 'Eslatma'}
          </button>
        </nav>
        <div className="exam-sidebar-bottom">
          <button className="exam-nav-item text-red" onClick={handleExit} style={{ color: '#0F172A', width: '100%' }} title={isSidebarCollapsed ? 'Chiqish' : ''}>
            <LogOut size={18} /> {!isSidebarCollapsed && 'Chiqish'}
          </button>
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="exam-sidebar-collapse-btn"
          title={isSidebarCollapsed ? 'Panelni ochish' : 'Panelni yopish'}
        >
          {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="exam-main">
        {/* Header */}
        <header className="exam-header">
          <div className="exam-header-title">
            {testInfo?.subject || "Fan nomi"} <span className="exam-header-subtitle">| 10-sinf</span>
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
        <div className="exam-content-area" style={testInfo?.pdf_url ? { display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row', gap: '24px', height: 'calc(100vh - 80px)' } : {}}>

          {testInfo?.pdf_url && (
            <div style={{ flex: '1.5', height: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(15,23,42,0.1)' }}>
              <iframe src={testInfo.pdf_url} style={{ width: '100%', height: '100%', border: 'none' }} title="Exam Paper" />
            </div>
          )}

          <section className="exam-question-section" style={testInfo?.pdf_url ? { flex: '1', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' } : {}}>

            {testInfo?.pdf_url ? (
              // PDF Mode: Show all inputs in a scrolling list
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ position: 'sticky', top: 0, background: 'white', padding: '12px 0', zIndex: 10, borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '18px', color: '#0F172A', margin: 0 }}>
                    Javoblar varaqasi
                  </h3>
                  <div style={{ background: '#EFF6FF', padding: '6px 12px', borderRadius: '8px', color: '#2563EB', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} />
                    {formatTime(timeLeft)}
                  </div>
                </div>
                {questions.map((q, idx) => (
                  <div key={q.id} style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontWeight: 'bold', color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                      {q.text && q.text.replace(/<[^>]+>/g, '').trim() !== '' ? (
                        <MathText>{q.text}</MathText>
                      ) : (
                        `Savol ${idx + 1}`
                      )}
                    </div>
                    {q.question_type === 'multipart_ab' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {['a', 'b'].map(part => {
                          let cVal = { a: '', b: '' };
                          try { if(answers[q.id]) cVal = JSON.parse(answers[q.id]); } catch(e) {}
                          return (
                            <div key={part} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{part}:</span>
                              <input 
                                type="text"
                                placeholder={`${part.toUpperCase()} qism javobi`}
                                value={cVal[part] || ''}
                                onChange={e => {
                                  const nVal = { ...cVal, [part]: e.target.value };
                                  setAnswers(prev => ({ ...prev, [q.id]: JSON.stringify(nVal) }));
                                }}
                                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.2)', outline: 'none' }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : q.question_type === 'written' ? (
                      <textarea
                        placeholder="Javobingizni shu yerga kiriting..."
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        style={{ width: '100%', minHeight: '80px', padding: '12px', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.2)', fontSize: '15px', resize: 'vertical' }}
                      />
                    ) : (
                      <div className="exam-options" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {q.options && Array.isArray(q.options) && q.options.map((opt, oIdx) => {
                          const isSelected = answers[q.id] === oIdx;
                          return (
                            <button
                              key={oIdx}
                              onClick={() => handleSelectOption(q.id, oIdx)}
                              style={{
                                padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', border: isSelected ? '2px solid #2563EB' : '1px solid #CBD5E1', background: isSelected ? '#EFF6FF' : 'white', color: isSelected ? '#2563EB' : '#334155'
                              }}
                            >
                              {String.fromCharCode(65 + oIdx)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setShowReviewModal(true)}
                  style={{ marginTop: '24px', padding: '16px', background: '#16A34A', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Imtihonni yakunlash
                </button>
              </div>
            ) : (
              // Standard Mode: One question at a time
              <>
                {/* Progress Row */}
                <div className="exam-progress-row">
                  <span className="exam-q-count">{currentIndex + 1} <span className="exam-q-total">/ {questions.length} savol</span></span>
                  <div className="exam-progress-dots">
                    {questions.slice(Math.max(0, currentIndex - 3), currentIndex + 5).map((q, i) => {
                      const actualIndex = questions.indexOf(q);
                      const isCurrent = actualIndex === currentIndex;
                      const isAnswered = answers[q.id] !== undefined;
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

                {/* DTM Subject Label */}
                {testInfo?.exam_system === 'dtm' && (
                  <div style={{ marginBottom: '16px', background: 'rgba(37, 99, 235, 0.1)', color: '#1E40AF', padding: '12px 20px', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                    {(() => {
                      const mains = (testInfo.subject || '').split('|');
                      const main1 = mains[0] || '1-Asosiy fan';
                      const main2 = mains[1] || '2-Asosiy fan';
                      if (currentIndex >= 0 && currentIndex < 10) return 'Majburiy Ona tili';
                      if (currentIndex >= 10 && currentIndex < 20) return 'Majburiy Matematika';
                      if (currentIndex >= 20 && currentIndex < 30) return "Majburiy O'zbekiston tarixi";
                      if (currentIndex >= 30 && currentIndex < 60) return `Asosiy fan: ${main1}`;
                      if (currentIndex >= 60 && currentIndex < 90) return `Asosiy fan: ${main2}`;
                      return 'DTM Testi';
                    })()}
                  </div>
                )}

                {/* Question Card */}
                {currentQ && (
                  <div className={`exam-question-card ${currentQ.question_type === 'essay' ? 'essay-card' : ''}`} style={currentQ.question_type === 'essay' ? { border: '2px solid #8B5CF6' } : {}}>
                  <div className="exam-q-header" style={currentQ.question_type === 'essay' ? { marginBottom: '16px' } : {}}>
                    <div className="exam-q-tags">
                      <span className="exam-tag-q" style={currentQ.question_type === 'essay' ? { background: '#8B5CF6', color: 'white' } : {}}>
                        {currentQ.question_type === 'essay' ? 'Esse Yozish' : `Q${currentIndex + 1}`}
                      </span>
                      {currentQ.question_type !== 'essay' && (
                        <span className="exam-tag-type">{currentQ.question_type === 'written' ? 'Yozma javob' : 'Bir javobli'}</span>
                      )}
                    </div>
                    {currentQ.question_type === 'essay' && (
                      <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>Yakuniy Bosqich</span>
                    )}
                    {currentQ.question_type !== 'essay' && (
                      <button className="exam-bookmark-btn" onClick={() => toggleBookmark(currentQ.id)}>
                        <Bookmark size={16} fill={bookmarks.has(currentQ.id) ? "currentColor" : "none"} />
                        Eslatmaga qo'shish
                      </button>
                    )}
                  </div>

                  {currentQ.question_type === 'essay' ? (
                    <>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F172A', marginBottom: '8px' }}>
                        Mavzu: {currentQ.text}
                      </h3>
                      <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '16px' }}>
                        Fikringizni erkin bayon qiling. Imtihonni yakunlaganingizda ushbu esse AI tomonidan baholanadi va umumiy ballingizga qo'shiladi.
                      </p>
                    </>
                  ) : (
                    <HighlightableText text={currentQ.text} id={currentQ.id} className="exam-q-text" />
                  )}

                  {currentQ.image_url && (
                    <img src={currentQ.image_url} alt="Savol rasmi" className="exam-q-image" />
                  )}

                  {currentQ.question_type === 'essay' ? (
                    <div className="exam-written-answer">
                      <textarea
                        placeholder="Esse matnini shu yerga yozing..."
                        value={answers[currentQ.id] || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
                        style={{ width: '100%', minHeight: '300px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.3)', fontSize: '15px', color: '#0F172A', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                  ) : currentQ.question_type === 'multipart_ab' ? (
                    <div className="exam-written-answer" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {['a', 'b'].map(part => {
                        let cVal = { a: '', b: '' };
                        try { if(answers[currentQ.id]) cVal = JSON.parse(answers[currentQ.id]); } catch(e) {}
                        return (
                          <div key={part} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '18px', textTransform: 'uppercase' }}>{part}:</span>
                            <input 
                              type="text"
                              placeholder={`${part.toUpperCase()} qism javobi`}
                              value={cVal[part] || ''}
                              onChange={e => {
                                const nVal = { ...cVal, [part]: e.target.value };
                                setAnswers(prev => ({ ...prev, [currentQ.id]: JSON.stringify(nVal) }));
                              }}
                              style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid rgba(15, 23, 42, 0.2)', fontSize: '16px', outline: 'none' }}
                            />
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
                        style={{ width: '100%', minHeight: '100px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(15, 23, 42, 0.2)', fontSize: '16px', color: '#0F172A', resize: 'vertical' }}
                      />
                    </div>
                  ) : (
                    <div className="exam-options">
                      {currentQ.options && Array.isArray(currentQ.options) && currentQ.options.map((opt, idx) => {
                        const letter = String.fromCharCode(65 + idx);
                        const isSelected = answers[currentQ.id] === idx;
                        return (
                          <div
                            key={idx}
                            className={`exam-option ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelectOption(currentQ.id, idx)}
                          >
                            <div className="exam-radio">
                              <div className="exam-radio-inner"></div>
                            </div>
                            <span className="exam-option-label">{letter}.</span>
                            <div className="exam-option-text">
                              <MathText>{opt}</MathText>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

                <div className="exam-controls">
                  <button
                    className="exam-btn-outline"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(prev => prev - 1)}
                  >
                    <ChevronLeft size={16} /> Oldingi savol
                  </button>

                  <button
                    className="exam-btn-primary"
                    disabled={currentIndex === questions.length - 1}
                    onClick={() => setCurrentIndex(prev => prev + 1)}
                  >
                    Keyingi <ChevronRight size={16} />
                  </button>
                  
                  <button 
                    className="btn-submit-exam mobile-only-submit"
                    onClick={() => setShowReviewModal(true)} 
                    disabled={submitting}
                    style={{ background: '#10B981', color: 'white', borderColor: '#10B981', width: '100%', marginTop: '8px' }}
                  >
                    <Flag size={16} /> Imtihonni yakunlash
                  </button>
                </div>
              </>
            )}
          </section>

          {/* Grid Section for standard mode */}
          {!testInfo?.pdf_url && (
            <aside className="exam-right-panel">
              <div className="exam-grid-header" style={{ padding: '24px 24px 0 24px' }}>
                <h3 className="exam-grid-title" style={{ margin: '0' }}>Savollar jadvali</h3>
              </div>
              <div className="exam-timer-box">
                <div className="timer-label">Qolgan vaqt</div>
                <div className="timer-display">
                  <div className="timer-time">{formatTime(timeLeft)}</div>
                  <button
                    className="timer-pause"
                    onClick={() => {
                      if (!isPaused && pauseCount >= 2) {
                        alert("Siz pauza qilish limitini tugatdingiz (Max: 2 marta).");
                        return;
                      }
                      if (!isPaused && pauseTimeLeft <= 0) {
                        alert("Sizning pauza vaqtingiz tugagan (Max: 5 daqiqa).");
                        return;
                      }
                      if (!isPaused) setPauseCount(prev => prev + 1);
                      setIsPaused(!isPaused);
                    }}
                    disabled={!isPaused && (pauseCount >= 2 || pauseTimeLeft <= 0)}
                    style={{ opacity: (!isPaused && (pauseCount >= 2 || pauseTimeLeft <= 0)) ? 0.5 : 1 }}
                    title={`Pauza qolgan: ${2 - pauseCount} marta, ${Math.floor(pauseTimeLeft / 60)} daqiqa`}
                  >
                    <Pause size={18} fill={isPaused ? "currentColor" : "none"} />
                  </button>
                </div>
                <div className="timer-progress">
                  <div className="timer-progress-fill" style={{ width: `${timerPercent}%` }}></div>
                </div>
              </div>

              <div className="exam-legend">
                <div className="legend-item"><div className="legend-dot answered"></div> Javob berilgan</div>
                <div className="legend-item"><div className="legend-dot current"></div> Joriy savol</div>
                <div className="legend-item"><div className="legend-dot unanswered"></div> Javob berilmagan</div>
                <div className="legend-item"><div className="legend-dot bookmarked"></div> Eslatma</div>
              </div>

              <div className="exam-grid-section">
                <div className="exam-grid">
                  {questions.map((q, i) => {
                    const isCurrent = i === currentIndex;
                    const isAnswered = answers[q.id] !== undefined;
                    const isBookmarked = bookmarks.has(q.id);

                    let classes = 'grid-btn';
                    if (isCurrent) classes += ' current';
                    else if (isAnswered) classes += ' answered';
                    if (isBookmarked) classes += ' bookmarked';

                    return (
                      <button key={q.id} className={classes} onClick={() => setCurrentIndex(i)}>
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="exam-submit-section">
                <button className="btn-submit-exam" onClick={() => setShowReviewModal(true)} disabled={submitting}>
                  <Flag size={16} /> Imtihonni yakunlash
                </button>
              </div>
            </aside>
          )}
        </div>

        <footer className="exam-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={14} /> Imtihon davomida oynani yopish yoki sahifani tark etish natijalaringizga ta'sir qilishi mumkin.
          </div>
          <div className="exam-footer-right">
            <HeadphonesIcon size={14} /> Texnik yordam
          </div>
        </footer>

        {/* Modals Overlay */}
        {showBookmarks && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowBookmarks(false);
            }
          }}>
            {/* Bookmarks Modal */}
            <div className="fade-in-up" style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bookmark size={20} className="text-blue" />
                Eslatmalar ({bookmarks.size})
              </h3>
              
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {bookmarks.size === 0 ? (
                  <p style={{ color: 'rgba(15, 23, 42, 0.5)', textAlign: 'center', padding: '24px 0' }}>Sizda eslatmalar yo'q.</p>
                ) : (
                  Array.from(bookmarks).map(qid => {
                    const qIndex = questions.findIndex(q => q.id === qid);
                    if (qIndex === -1) return null;
                    return (
                      <button 
                        key={qid}
                        onClick={() => jumpToQuestion(qIndex)}
                        style={{ padding: '12px', background: '#F8FAFC', border: '1px solid rgba(15, 23, 42, 0.1)', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#0F172A', fontWeight: '500' }}
                      >
                        <span>{qIndex + 1}-savol</span>
                        <ChevronRight size={16} className="text-muted" />
                      </button>
                    );
                  })
                )}
              </div>
              
              <button 
                onClick={() => setShowBookmarks(false)}
                style={{ marginTop: '16px', padding: '12px', background: 'transparent', border: '1px solid rgba(15, 23, 42, 0.2)', borderRadius: '8px', color: '#0F172A', cursor: 'pointer', fontWeight: '600' }}
              >
                Yopish
              </button>
            </div>
          </div>
        )}

        {showErrorReport && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={(e) => {
            if(e.target === e.currentTarget) setShowErrorReport(false);
          }}>
            <div className="fade-in-up" style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} className="text-red" />
                Xatolik haqida xabar berish
              </h3>
              <p style={{ fontSize: '14px', color: 'rgba(15, 23, 42, 0.6)', marginBottom: '16px', lineHeight: '1.5' }}>
                Savolda yoki testda qandaydir xatolik topdingizmi? Bizga xabar bering!
                {questions[currentIndex] && <strong style={{ display: 'block', marginTop: '4px', color: '#0F172A' }}>Joriy savol: {currentIndex + 1}-savol</strong>}
              </p>
              <textarea 
                value={reportMessage}
                onChange={e => setReportMessage(e.target.value)}
                placeholder="Xatolik nima ekanligini batafsil yozing..."
                style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.2)', fontSize: '14px', color: '#0F172A', marginBottom: '16px', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setShowErrorReport(false)}
                  style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(15, 23, 42, 0.2)', borderRadius: '8px', color: '#0F172A', cursor: 'pointer', fontWeight: '600' }}
                >
                  Bekor qilish
                </button>
                <button 
                  onClick={submitErrorReport}
                  disabled={isSubmittingReport || !reportMessage.trim()}
                  style={{ padding: '8px 16px', background: '#2563EB', border: 'none', borderRadius: '8px', color: 'white', cursor: (isSubmittingReport || !reportMessage.trim()) ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: (isSubmittingReport || !reportMessage.trim()) ? 0.5 : 1 }}
                >
                  {isSubmittingReport ? 'Yuborilmoqda...' : 'Yuborish'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', width: '90%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#0F172A', fontWeight: 'bold' }}>Imtihonni Yuborishdan Oldin Ko'zdan Kechirish</h2>
                <button onClick={() => setShowReviewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(15, 23, 42, 0.4)' }}>вњ•</button>
              </div>

              <div className="exam-legend" style={{ marginBottom: '24px', justifyContent: 'center' }}>
                <div className="legend-item"><div className="legend-dot answered"></div> Javob berilgan</div>
                <div className="legend-item"><div className="legend-dot unanswered"></div> Javob berilmagan</div>
                <div className="legend-item"><div className="legend-dot bookmarked"></div> Eslatma</div>
              </div>

              <div style={{ overflowY: 'auto', padding: '4px', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))', gap: '12px' }}>
                  {questions.map((q, i) => {
                    const isAnswered = answers[q.id] !== undefined;
                    const isBookmarked = bookmarks.has(q.id);

                    let classes = 'grid-btn';
                    if (isAnswered) classes += ' answered';
                    if (isBookmarked) classes += ' bookmarked';

                    return (
                      <button
                        key={q.id}
                        className={classes}
                        onClick={() => {
                          setCurrentIndex(i);
                          setShowReviewModal(false);
                        }}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'flex-end', borderTop: '1px solid rgba(15, 23, 42, 0.1)', paddingTop: '24px' }}>
                <button onClick={() => setShowReviewModal(false)} style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.1)', background: 'white', color: 'rgba(15, 23, 42, 0.5)', fontWeight: 'bold', cursor: 'pointer' }}>
                  Davom etish
                </button>
                <button onClick={handleSubmit} disabled={submitting} className="btn-submit-exam" style={{ margin: 0, width: 'auto', padding: '12px 24px' }}>
                  {submitting ? 'Yuborilmoqda...' : 'Tasdiqlash va Yuborish'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
