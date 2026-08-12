import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-page, #f8fafc)',
      fontFamily: 'Inter, sans-serif',
      textAlign: 'center',
      padding: '24px',
    }}>
      <div style={{
        fontSize: '7rem',
        fontWeight: '900',
        letterSpacing: '-4px',
        color: '#0F172A',
        lineHeight: 1,
      }}>
        404
      </div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0F172A', margin: '16px 0 8px' }}>
        Sahifa topilmadi
      </h1>
      <p style={{ color: '#64748b', maxWidth: '360px', lineHeight: 1.6, marginBottom: '32px' }}>
        Siz qidirayotgan sahifa mavjud emas yoki sizda unga kirish huquqi yo'q.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          background: '#0F172A',
          color: '#fff',
          border: 'none',
          padding: '12px 28px',
          borderRadius: '10px',
          fontWeight: '600',
          fontSize: '15px',
          cursor: 'pointer',
        }}
      >
        Bosh sahifaga qaytish
      </button>
    </div>
  );
}
