import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, PlayCircle } from 'lucide-react';

export default function ALevelConfigModal({ isOpen, onClose, onStart, availablePapers, isUz }) {
  const [level, setLevel] = useState('AS'); // 'AS' or 'A2'
  const [combo, setCombo] = useState('P1_P4');


  if (!isOpen) return null;

  const handleStart = () => {
    let requiredPapers = [];
    if (level === 'AS') {
      if (combo === 'P1_P4') requiredPapers = [1, 4];
      if (combo === 'P1_P5') requiredPapers = [1, 5];
      if (combo === 'P1_P2') requiredPapers = [1, 2];
    } else {
      if (combo === 'P1_P3_P4_P5') requiredPapers = [1, 3, 4, 5];
      if (combo === 'P1_P3_P5_P6') requiredPapers = [1, 3, 5, 6];
    }

    // Group papers by variant
    const groups = {};
    availablePapers.forEach(p => {
      const variant = p.title.split(' - Paper')[0];
      if (!groups[variant]) groups[variant] = [];
      groups[variant].push(p);
    });

    // Find the first variant group that has all the required papers
    let selectedTests = [];
    let foundGroup = null;

    for (const variant in groups) {
      const papersInGroup = groups[variant];
      const hasAll = requiredPapers.every(num => papersInGroup.some(p => p.paper_number === num));
      if (hasAll) {
        selectedTests = requiredPapers.map(num => papersInGroup.find(p => p.paper_number === num));
        foundGroup = variant;
        break; // Use the first complete mock we find
      }
    }

    if (selectedTests.length !== requiredPapers.length) {
      alert("Hozircha bazada ushbu kombinatsiya uchun barcha Paperlar mavjud emas!");
      return;
    }

    onStart({
      isALevel: true,
      level,
      combo,
      papers: selectedTests
    });
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="fade-in" style={{ background: '#FFFFFF', width: '100%', maxWidth: '500px', borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', margin: 0, color: '#0F172A' }}>A-Level Mock Konfiguratsiyasi</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0F172A' }}><X size={20} /></button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#0F172A' }}>Bosqichni tanlang:</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => { setLevel('AS'); setCombo('P1_P4'); }} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: level === 'AS' ? '2px solid #2563EB' : '1px solid #E2E8F0', background: level === 'AS' ? 'rgba(37, 99, 235, 0.1)' : '#F8FAFC', fontWeight: 'bold', cursor: 'pointer', color: '#0F172A' }}>
              AS Level (1-yil)
            </button>
            <button onClick={() => { setLevel('A2'); setCombo('P1_P3_P4_P5'); }} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: level === 'A2' ? '2px solid #2563EB' : '1px solid #E2E8F0', background: level === 'A2' ? 'rgba(37, 99, 235, 0.1)' : '#F8FAFC', fontWeight: 'bold', cursor: 'pointer', color: '#0F172A' }}>
              To'liq A-Level
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#0F172A' }}>Kombinatsiyani tanlang:</label>
          <select value={combo} onChange={e => setCombo(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '16px', color: '#0F172A', background: '#FFFFFF' }}>
            {level === 'AS' ? (
              <>
                <option value="P1_P4">Paper 1 + Paper 4 (Mechanics)</option>
                <option value="P1_P5">Paper 1 + Paper 5 (Statistics)</option>
                <option value="P1_P2">Paper 1 + Paper 2 (Pure Math 2)</option>
              </>
            ) : (
              <>
                <option value="P1_P3_P4_P5">P1 + P3 + P4 + P5</option>
                <option value="P1_P3_P5_P6">P1 + P3 + P5 + P6</option>
              </>
            )}
          </select>
        </div>

        <button onClick={handleStart} className="btn-primary-workspace" style={{ width: '100%', justifyContent: 'center' }}>
          <PlayCircle size={18} /> Imtihonni boshlash
        </button>
      </div>
    </div>,
    document.body
  );
}
