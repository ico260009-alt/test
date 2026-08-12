import React, { useState } from 'react';
import { Play, Settings2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function CustomTestSetupView({ lang, onStartCustomTest }) {
  const [subject, setSubject] = useState("O'zbek tili");
  const [difficulty, setDifficulty] = useState([]);
  const [count, setCount] = useState(30);
  const [duration, setDuration] = useState(60);

  const toggleDifficulty = (level) => {
    setDifficulty(prev =>
      prev.includes(level) ? prev.filter(d => d !== level) : [...prev, level]
    );
  };

  const handleStart = async () => {
    try {
      // 1. Get tests matching the subject
      let queryTests = supabase.from('mock_tests').select('id');
      if (subject) {
        queryTests = queryTests.ilike('subject', `%${subject}%`);
      }
      const { data: testData, error: testError } = await queryTests;
      if (testError) throw testError;
      if (!testData || testData.length === 0) {
        alert("Tanlangan fanga oid testlar topilmadi.");
        return;
      }

      const testIds = testData.map(t => t.id);

      // 2. Call RPC to get question metadata for those tests
      const { data: questionsData, error: rpcError } = await supabase.rpc('get_question_metadata', { p_test_ids: testIds });
      if (rpcError) throw rpcError;
      if (!questionsData || questionsData.length === 0) {
        alert("Belgilangan parametrlarga mos savollar topilmadi.");
        return;
      }

      // 3. Filter by difficulty
      let filteredQuestions = questionsData;
      if (difficulty.length > 0) {
        filteredQuestions = filteredQuestions.filter(q => difficulty.includes(q.difficulty));
      }

      if (filteredQuestions.length === 0) {
        alert("Tanlangan qiyinlik darajasiga mos savollar topilmadi.");
        return;
      }

      // 4. Shuffle and limit
      const shuffled = [...filteredQuestions].sort(() => 0.5 - Math.random());
      const selectedIds = shuffled.slice(0, count).map(q => q.id);

      onStartCustomTest({
        subject: subject,
        duration_minutes: duration,
        questionIds: selectedIds
      });
    } catch (error) {
      console.error("Error generating custom exam:", error);
      alert("Imtihonni boshlashda xatolik yuz berdi.");
    }
  };

  return (
    <div className="practice-setup-container" style={{ padding: '24px' }}>
      <h2>{lang === 'uz' ? 'Moslashtirilgan Imtihon' : 'Пользовательский экзамен'}</h2>
      <p style={{ color: 'rgba(15, 23, 42, 0.5)', marginBottom: '24px' }}>O'zingiz xohlagan parametrlarda imtihon tuzing va vaqtga qarab ishlashni mashq qiling.</p>

      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid rgba(15, 23, 42, 0.1)', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings2 size={18} /> Imtihon sozlamalari
        </h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Fan</label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.15)' }}>
            <option value="O'zbek tili">O'zbek tili</option>
            <option value="Matematika">Matematika</option>
            <option value="Ingliz tili">Ingliz tili</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Qiyinlik darajasi (aralash qoldirish mumkin)</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            {['easy', 'medium', 'hard'].map(level => (
              <button
                key={level}
                onClick={() => toggleDifficulty(level)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: `1px solid ${difficulty.includes(level) ? '#2563EB' : 'rgba(15, 23, 42, 0.1)'}`,
                  background: difficulty.includes(level) ? 'rgba(37, 99, 235, 0.08)' : 'white',
                  color: difficulty.includes(level) ? '#2563EB' : 'rgba(15, 23, 42, 0.6)',
                  cursor: 'pointer'
                }}
              >
                {level === 'easy' ? 'Oson' : level === 'medium' ? 'O\'rtacha' : 'Qiyin'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Savollar soni: {count}</label>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Vaqt: {duration} daqiqa</label>
            <input
              type="range"
              min="10"
              max="180"
              step="10"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.03)', borderRadius: '8px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            onClick={handleStart}
            style={{
              padding: '12px 24px',
              background: '#2563EB',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <Play size={18} fill="currentColor" /> Imtihonni boshlash
          </button>
        </div>
      </div>
    </div>
  );
}
