import React, { useState, useEffect } from 'react';
import { RefreshCcw, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function MistakesView({ lang, onStartMistakeRetry }) {
  const [mistakes, setMistakes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMistakes() {
      // Find all questions the user got wrong
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // We want to fetch all attempts where is_correct = false, but if there's a subsequent attempt where is_correct = true, it shouldn't be here.
      // Doing this purely in RPC is best, but we can do it in two queries or one big query.
      // For simplicity in JS:
      const { data: allAttempts } = await supabase
        .from('attempts')
        .select('question_id, is_correct, created_at, questions(text, topic, mock_tests(title))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (allAttempts) {
        const statusMap = new Map();
        for (const att of allAttempts) {
          if (!statusMap.has(att.question_id)) {
            // First time seeing this question_id (since we ordered by descending, this is the LATEST attempt)
            statusMap.set(att.question_id, att);
          }
        }
        
        const currentMistakes = [];
        statusMap.forEach((att, qid) => {
          if (!att.is_correct) {
            currentMistakes.push({
              question_id: qid,
              text: att.questions?.text,
              topic: att.questions?.topic,
              mock_title: att.questions?.mock_tests?.title
            });
          }
        });
        setMistakes(currentMistakes);
      }
      setLoading(false);
    }
    loadMistakes();
  }, []);

  if (loading) {
    return <div style={{ padding: '24px' }}>Yuklanmoqda...</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>{lang === 'uz' ? 'Xatolar ustida ishlash' : 'Работа над ошибками'} ({mistakes.length})</h2>
        {mistakes.length > 0 && (
          <button 
            onClick={() => onStartMistakeRetry(mistakes.map(m => m.question_id))}
            style={{ padding: '8px 16px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCcw size={16} /> Barchasini qayta ishlash
          </button>
        )}
      </div>

      {mistakes.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px solid rgba(15, 23, 42, 0.1)', color: 'rgba(15, 23, 42, 0.5)' }}>
          <AlertTriangle size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h3>Sizda hozircha xatolar yo'q</h3>
          <p>Amaliyot yoki imtihon davomida xato qilingan savollar shu yerda paydo bo'ladi.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {mistakes.map(m => (
            <div key={m.question_id} style={{ padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', background: 'rgba(15, 23, 42, 0.04)', padding: '4px 8px', borderRadius: '4px', color: 'rgba(15, 23, 42, 0.6)', marginBottom: '8px', display: 'inline-block' }}>
                  {m.mock_title ? m.mock_title : (m.topic || 'Umumiy')}
                </span>
                <p style={{ margin: 0, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {m.text}
                </p>
              </div>
              <button 
                onClick={() => onStartMistakeRetry([m.question_id])}
                style={{ padding: '6px 12px', background: 'rgba(37, 99, 235, 0.08)', color: '#2563EB', border: '1px solid rgba(37, 99, 235, 0.2)', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '16px' }}
              >
                Qayta urinish
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
