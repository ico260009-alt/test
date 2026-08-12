import React, { useRef, useState, useEffect } from 'react';
import { Highlighter } from 'lucide-react';
import MathText from '../MathText';

export default function HighlightableText({ text, id, className }) {
  const containerRef = useRef(null);
  const [popoverStyle, setPopoverStyle] = useState(null);
  const [selectionRange, setSelectionRange] = useState(null);

  useEffect(() => {
    setPopoverStyle(null);
    setSelectionRange(null);
  }, [text, id]);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection.isCollapsed && containerRef.current && containerRef.current.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelectionRange(range);
      setPopoverStyle({
        top: rect.top - 40 + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX,
      });
    } else {
      setTimeout(() => {
        setPopoverStyle(null);
        setSelectionRange(null);
      }, 150);
    }
  };

  const applyHighlight = (e) => {
    e.stopPropagation();
    if (!selectionRange) return;
    
    const mark = document.createElement('mark');
    mark.style.backgroundColor = '#FEF08A'; 
    mark.style.color = 'inherit';
    mark.style.borderRadius = '2px';
    mark.style.padding = '0 2px';
    
    try {
      selectionRange.surroundContents(mark);
    } catch (err) {
      console.warn("Could not highlight across elements", err);
    }
    
    window.getSelection().removeAllRanges();
    setPopoverStyle(null);
    setSelectionRange(null);
  };

  return (
    <>
      <div 
        ref={containerRef} 
        onMouseUp={handleMouseUp}
        style={{ whiteSpace: 'pre-line' }}
        className={className}
      >
        <MathText>{text}</MathText>
      </div>
      
      {popoverStyle && (
        <div 
          style={{
            position: 'absolute',
            top: popoverStyle.top,
            left: popoverStyle.left,
            transform: 'translateX(-50%)',
            background: '#0F172A',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: '600'
          }}
          onMouseDown={(e) => { e.preventDefault(); /* Prevent selection loss */ }}
          onClick={applyHighlight}
        >
          <Highlighter size={14} color="#FBBF24" />
          Ajratish
        </div>
      )}
    </>
  );
}
