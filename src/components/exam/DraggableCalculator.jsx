import React, { useState, useRef, useEffect } from 'react';
import { X, GripHorizontal } from 'lucide-react';
import { evaluateExpression } from '../../utils/safeCalculator';

export default function DraggableCalculator({ onClose }) {
  const [calcInput, setCalcInput] = useState('');
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, currentX: window.innerWidth - 320, currentY: 100 });

  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    
    dragRef.current.currentX += dx;
    dragRef.current.currentY += dy;
    
    setPosition({
      x: dragRef.current.currentX,
      y: dragRef.current.currentY
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    } else {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

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

  return (
    <div 
      style={{ 
        position: 'fixed', 
        left: position.x, 
        top: position.y,
        background: 'white', 
        padding: '16px', 
        borderRadius: '16px', 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', 
        width: '280px',
        zIndex: 1000,
        userSelect: 'none',
        touchAction: 'none'
      }}
    >
      <div 
        onPointerDown={handlePointerDown}
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px',
          cursor: isDragging ? 'grabbing' : 'grab',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(15, 23, 42, 0.1)'
        }}
      >
        <GripHorizontal size={20} color="rgba(15, 23, 42, 0.4)" />
        <h3 style={{ margin: 0, fontSize: '15px', color: '#0F172A', fontWeight: 'bold' }}>Hisoblagich</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(15, 23, 42, 0.4)', display: 'flex' }}>
          <X size={18} />
        </button>
      </div>
      
      <div style={{ background: 'rgba(15, 23, 42, 0.04)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', textAlign: 'right', fontSize: '24px', minHeight: '56px', wordBreak: 'break-all', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontWeight: '500', color: '#0F172A' }}>
        {calcInput || '0'}
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {['7','8','9','/','4','5','6','*','1','2','3','-','C','0','=','+'].map(btn => (
          <button 
            key={btn} 
            onClick={() => handleCalcClick(btn)}
            style={{ 
              padding: '12px 0', 
              fontSize: '18px', 
              border: 'none', 
              borderRadius: '8px', 
              background: ['/','*','-','+','='].includes(btn) ? 'rgba(37, 99, 235, 0.08)' : btn === 'C' ? '#FEE2E2' : 'rgba(15, 23, 42, 0.03)',
              color: ['/','*','-','+','='].includes(btn) ? '#2563EB' : btn === 'C' ? '#0F172A' : '#0F172A',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.1s'
            }}
            onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
}
