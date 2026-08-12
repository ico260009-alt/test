import React, { useState, useEffect } from 'react';
import { Lock, Sparkles, ArrowRight, ArrowLeft, Send, Bot, User, Plus, MessageSquare, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../../../lib/supabase';

export default function AiTutorView({ lang, user, stats, onNavigate }) {
  const isUz = lang === 'uz';
  const hasPremium = user?.subscription_until && new Date(user.subscription_until) > new Date() && user.subscription_tier !== 'free';

  const STORAGE_KEY = `189prep_ai_chats_${user?.id}`;
  const initialGreeting = isUz ? "Salom! Men sizning shaxsiy AI ustozingizman. Qanday savolingiz bor?" : "Привет! Я ваш личный ИИ-наставник. Какой у вас вопрос?";

  const [sessions, setSessions] = useState(() => {
    if (!user) return [];
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Failed to parse chat sessions", e);
      }
    }
    return [{ id: Date.now().toString(), title: isUz ? "Yangi suhbat" : "Новая беседа", messages: [{ role: 'model', content: initialGreeting }] }];
  });

  const [activeSessionId, setActiveSessionId] = useState(sessions[0]?.id);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiContext, setAiContext] = useState(stats);

  useEffect(() => {
    async function loadMistakesForAI() {
      if (!user) return;
      const { data: allAttempts } = await supabase
        .from('attempts')
        .select('question_id, is_correct, created_at, questions(text, topic, mock_tests(title))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50); // Get last 50 attempts

      if (allAttempts) {
        const statusMap = new Map();
        for (const att of allAttempts) {
          if (!statusMap.has(att.question_id)) {
            statusMap.set(att.question_id, att);
          }
        }
        
        const currentMistakes = [];
        statusMap.forEach((att) => {
          if (!att.is_correct) {
            currentMistakes.push({
              text: att.questions?.text,
              topic: att.questions?.topic,
              mock: att.questions?.mock_tests?.title
            });
          }
        });
        
        setAiContext(prev => ({
           ...prev,
           recent_mistakes_from_mocks: currentMistakes.slice(0, 5)
        }));
      }
    }
    loadMistakesForAI();
  }, [user, stats]);

  useEffect(() => {
    if (user && sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions, user, STORAGE_KEY]);

  const createNewSession = () => {
    const newId = Date.now().toString();
    const newSession = { id: newId, title: isUz ? "Yangi suhbat" : "Новая беседа", messages: [{ role: 'model', content: initialGreeting }] };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newId);
  };

  const deleteSession = (e, id) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    if (updated.length === 0) {
      const newId = Date.now().toString();
      const newSession = { id: newId, title: isUz ? "Yangi suhbat" : "Новая беседа", messages: [{ role: 'model', content: initialGreeting }] };
      setSessions([newSession]);
      setActiveSessionId(newId);
    } else {
      setSessions(updated);
      if (activeSessionId === id) setActiveSessionId(updated[0].id);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const activeSessionIndex = sessions.findIndex(s => s.id === activeSessionId);
    if (activeSessionIndex === -1) return;
    
    const currentSession = sessions[activeSessionIndex];
    const newMessages = [...currentSession.messages, { role: 'user', content: input }];
    
    let title = currentSession.title;
    if (currentSession.messages.length <= 2 && title === (isUz ? "Yangi suhbat" : "Новая беседа")) {
       title = input.length > 25 ? input.substring(0, 25) + '...' : input;
    }
    
    const updatedSession = { ...currentSession, title, messages: newMessages };
    setSessions(prev => {
      const newArr = [...prev];
      newArr[activeSessionIndex] = updatedSession;
      return newArr;
    });
    
    setInput('');
    setIsLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : '');
      const response = await fetch(`${apiUrl}/api/ai-tutor`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ((await supabase.auth.getSession()).data.session?.access_token || '')
        },
        body: JSON.stringify({
          history: currentSession.messages,
          message: input,
          lang,
          userContext: aiContext
        })
      });

      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      setSessions(prev => {
        const newArr = [...prev];
        const idx = newArr.findIndex(s => s.id === activeSessionId);
        if (idx !== -1) {
          const finalMessages = [...newArr[idx].messages, { role: 'model', content: data.reply }];
          newArr[idx] = { ...newArr[idx], messages: finalMessages };
        }
        return newArr;
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setSessions(prev => {
        const newArr = [...prev];
        const idx = newArr.findIndex(s => s.id === activeSessionId);
        if (idx !== -1) {
          const finalMessages = [...newArr[idx].messages, { role: 'model', content: isUz ? "Kechirasiz, xatolik yuz berdi. Iltimos qaytadan urinib ko'ring." : "Извините, произошла ошибка. Пожалуйста, попробуйте еще раз." }];
          newArr[idx] = { ...newArr[idx], messages: finalMessages };
        }
        return newArr;
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasPremium) {
    return (
      <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)' }}>
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '48px', background: '#FFFFFF', borderRadius: '32px', border: '1px solid rgba(15, 23, 42, 0.1)', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.1)' }}>
          <div style={{ width: '88px', height: '88px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px auto' }}>
            <Lock size={40} color="#2563EB" />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#0F172A', marginBottom: '16px', letterSpacing: '-0.5px' }}>
            {isUz ? 'Pro tarifiga o\'ting' : 'Перейдите на тариф Pro'}
          </h2>
          <p style={{ fontSize: '16px', color: 'rgba(15, 23, 42, 0.6)', marginBottom: '36px', lineHeight: '1.6' }}>
            {isUz 
              ? 'AI Ustoz xizmatidan foydalanish uchun Pro yoki Plus tarifiga obuna bo\'lishingiz kerak. Eng yaxshi natijalarga erishish uchun hoziroq obuna bo\'ling!'
              : 'Для доступа к ИИ-наставнику вам необходим тариф Pro или Plus. Оформите подписку прямо сейчас для достижения лучших результатов!'}
          </p>
          <button onClick={() => onNavigate('pricing')} style={{ width: '100%', padding: '16px', background: '#0F172A', color: '#FFFFFF', borderRadius: '16px', border: 'none', fontSize: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 8px 16px -4px rgba(15, 23, 42, 0.2)' }}>
            <Sparkles size={20} />
            <span>{isUz ? "Ta'riflarni ko'rish" : "Посмотреть тарифы"}</span>
            <ArrowRight size={20} />
          </button>
          <button onClick={() => onNavigate('dashboard')} style={{ width: '100%', padding: '16px', background: 'transparent', color: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px', border: 'none', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', marginTop: '12px' }}>
            <ArrowLeft size={18} />
            <span>{isUz ? 'Bosh sahifaga qaytish' : 'Вернуться на главную'}</span>
          </button>
        </div>
      </div>
    );
  }

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  return (
    <div className="fade-in" style={{ display: 'flex', height: 'calc(100vh - 60px)', maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '24px', gap: '24px' }}>
      
      {/* Sidebar for Chat History */}
      <div style={{ width: '280px', background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '20px' }}>
          <button 
            onClick={createNewSession}
            style={{ width: '100%', padding: '12px', background: '#2563EB', color: 'white', borderRadius: '12px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
          >
            <Plus size={18} />
            {isUz ? 'Yangi chat' : 'Новый чат'}
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 20px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ padding: '0 8px', marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {isUz ? 'Tarix' : 'История'}
          </div>
          {sessions.map(session => (
            <div 
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              style={{ padding: '12px', borderRadius: '12px', background: activeSessionId === session.id ? '#EFF6FF' : 'transparent', color: activeSessionId === session.id ? '#1E3A8A' : '#475569', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid', borderColor: activeSessionId === session.id ? '#BFDBFE' : 'transparent' }}
            >
              <MessageSquare size={16} style={{ flexShrink: 0, color: activeSessionId === session.id ? '#3B82F6' : '#94A3B8' }} />
              <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '14px', fontWeight: activeSessionId === session.id ? '600' : '500' }}>
                {session.title}
              </div>
              <div 
                onClick={(e) => deleteSession(e, session.id)}
                style={{ cursor: 'pointer', color: '#94A3B8', padding: '4px', borderRadius: '4px' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
              >
                <Trash2 size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <header style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '12px', background: '#F8FAFC' }}>
          <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #2563EB, #3B82F6)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Bot size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0F172A' }}>{isUz ? 'AI Ustoz' : 'ИИ Наставник'}</h1>
            <p style={{ margin: 0, color: '#64748B', fontSize: '13px' }}>{activeSession?.title}</p>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activeSession?.messages.map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '12px', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              {msg.role === 'model' && (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', flexShrink: 0 }}>
                  <Bot size={20} />
                </div>
              )}
              <div style={{ 
                background: msg.role === 'user' ? '#2563EB' : '#F1F5F9', 
                color: msg.role === 'user' ? 'white' : '#0F172A',
                padding: '16px 20px',
                borderRadius: '20px',
                borderTopRightRadius: msg.role === 'user' ? '4px' : '20px',
                borderTopLeftRadius: msg.role === 'model' ? '4px' : '20px',
                fontSize: '15px',
                lineHeight: '1.6',
                boxShadow: msg.role === 'model' ? 'none' : '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
              }}>
                <div className="markdown-body" style={{ margin: 0, padding: 0 }}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
              {msg.role === 'user' && (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', flexShrink: 0 }}>
                  <User size={20} />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                <Bot size={20} />
              </div>
              <div style={{ background: '#F1F5F9', padding: '16px 20px', borderRadius: '20px', borderTopLeftRadius: '4px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <div className="typing-dot" style={{ width: '8px', height: '8px', background: '#94A3B8', borderRadius: '50%', animation: 'typing 1.4s infinite ease-in-out' }}></div>
                <div className="typing-dot" style={{ width: '8px', height: '8px', background: '#94A3B8', borderRadius: '50%', animation: 'typing 1.4s infinite ease-in-out 0.2s' }}></div>
                <div className="typing-dot" style={{ width: '8px', height: '8px', background: '#94A3B8', borderRadius: '50%', animation: 'typing 1.4s infinite ease-in-out 0.4s' }}></div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid #E2E8F0', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', gap: '12px', background: '#F8FAFC', padding: '8px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={isUz ? "AI Ustozga savol bering..." : "Задайте вопрос ИИ-наставнику..."}
              style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: 'none', outline: 'none', background: 'transparent', fontSize: '15px' }}
            />
            <button 
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#2563EB', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed', opacity: input.trim() && !isLoading ? 1 : 0.5, transition: 'all 0.2s' }}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes typing {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
