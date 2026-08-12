import React, { useState, useEffect } from 'react';
import { Bookmark, Play, Edit3, Save, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import MathText from '../../../components/MathText';
import '../../ExamArena/ExamLayout.css';

export default function BookmarksView({ lang, onStartMistakeRetry }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState(null);
  const [noteValue, setNoteValue] = useState('');

  useEffect(() => {
    loadBookmarks();
  }, []);

  async function loadBookmarks() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('bookmarks')
      .select('question_id, created_at, note_text, questions(text, topic, mock_tests(title))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setBookmarks(data);
    }
    setLoading(false);
  }

  const removeBookmark = async (questionId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('bookmarks').delete().match({ user_id: user.id, question_id: questionId });
    setBookmarks(prev => prev.filter(b => b.question_id !== questionId));
  };

  const saveNote = async (questionId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('bookmarks')
      .update({ note_text: noteValue })
      .match({ user_id: user.id, question_id: questionId });

    if (!error) {
      setBookmarks(prev => prev.map(b => 
        b.question_id === questionId ? { ...b, note_text: noteValue } : b
      ));
      setEditingNote(null);
    } else {
      alert(lang === 'uz' ? 'Eslatmani saqlashda xatolik yuz berdi.' : 'Ошибка при сохранении заметки.');
    }
  };

  if (loading) {
    return <div style={{ padding: '24px' }}>Yuklanmoqda...</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>{lang === 'uz' ? 'Eslatmalar' : 'Закладки'} ({bookmarks.length})</h2>
        {bookmarks.length > 0 && (
          <button 
            onClick={() => onStartMistakeRetry(bookmarks.map(b => b.question_id))}
            className="exam-btn-primary"
            style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Play size={16} fill="currentColor" /> Barchasini ishlash
          </button>
        )}
      </div>

      {bookmarks.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px solid rgba(15, 23, 42, 0.1)', color: 'rgba(15, 23, 42, 0.5)' }}>
          <Bookmark size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h3>Sizda saqlangan savollar yo'q</h3>
          <p>Amaliyot yoki imtihon davomida muhim savollarni saqlab qo'yishingiz mumkin.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {bookmarks.map(b => (
            <div key={b.question_id} style={{ background: 'white', borderRadius: '12px', border: '1px solid rgba(15, 23, 42, 0.08)', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Header: Badge & Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, background: '#EFF6FF', color: '#1D4ED8', padding: '6px 12px', borderRadius: '6px' }}>
                  {b.questions?.mock_tests?.title ? b.questions.mock_tests.title : (b.questions?.topic || 'Umumiy')}
                </span>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => removeBookmark(b.question_id)}
                    className="exam-btn-outline"
                    style={{ padding: '8px 16px' }}
                  >
                    O'chirish
                  </button>
                  <button 
                    onClick={() => onStartMistakeRetry([b.question_id])}
                    className="exam-btn-primary"
                    style={{ padding: '8px 16px' }}
                  >
                    <Play size={14} fill="currentColor" /> Ishlash
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div style={{ margin: 0, color: '#0F172A', fontSize: '15px', lineHeight: '1.6', overflowX: 'auto' }}>
                <MathText>{b.questions?.text}</MathText>
              </div>

              {/* Notes Section */}
              <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(15, 23, 42, 0.06)' }}>
                {editingNote === b.question_id ? (
                  <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <textarea
                      autoFocus
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                      placeholder={lang === 'uz' ? 'Eslatma matnini kiriting...' : 'Введите текст заметки...'}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical', minHeight: '80px', marginBottom: '12px', fontSize: '14px', fontFamily: 'inherit' }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => saveNote(b.question_id)} className="exam-btn-primary" style={{ padding: '8px 16px' }}>
                        <Save size={16} /> {lang === 'uz' ? 'Saqlash' : 'Сохранить'}
                      </button>
                      <button onClick={() => setEditingNote(null)} className="exam-btn-outline" style={{ padding: '8px 16px' }}>
                        <X size={16} /> {lang === 'uz' ? 'Bekor qilish' : 'Отмена'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {b.note_text ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <p style={{ margin: 0, fontSize: '14px', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{b.note_text}</p>
                        <button onClick={() => { setEditingNote(b.question_id); setNoteValue(b.note_text); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#2563EB'} onMouseOut={(e) => e.currentTarget.style.color = '#64748B'}>
                          <Edit3 size={18} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => { setEditingNote(b.question_id); setNoteValue(''); }}
                        className="exam-btn-outline"
                        style={{ padding: '8px 16px', background: '#F8FAFC', borderStyle: 'dashed' }}
                      >
                        <Edit3 size={14} /> {lang === 'uz' ? 'Eslatma qo\'shish' : 'Добавить заметку'}
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
