import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trophy, Star, BarChart, FileCheck, Calendar, ShieldCheck, Download } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function CertificateModal({ isOpen, onClose, result, user, grade }) {
  const certificateRef = useRef(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    const updateScale = () => {
      if (containerRef.current) {
        // Leave some padding (e.g. 40px)
        const availableWidth = containerRef.current.clientWidth - 40; 
        const newScale = Math.min(1, availableWidth / 1000);
        setScale(newScale);
      }
    };

    updateScale();
    // Add small delay to ensure DOM is ready
    setTimeout(updateScale, 100);

    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!certificateRef.current) return;
    setIsDownloading(true);
    try {
      // Temporarily remove scale for clean capture
      const originalTransform = certificateRef.current.style.transform;
      certificateRef.current.style.transform = 'scale(1)';
      
      const canvas = await html2canvas(certificateRef.current, { 
        scale: 2,
        useCORS: true,
        backgroundColor: '#FAF9F6' 
      });
      
      certificateRef.current.style.transform = originalTransform;
      
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Certificate_${user?.full_name || 'Student'}.png`;
      link.href = imgData;
      link.click();
    } catch (err) {
      console.error('Error downloading certificate:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const userName = user?.full_name?.toUpperCase() || 'O\'QUVCHI';
  const subjectName = result?.subject?.name || 'Subject';
  
  let percentile = 'TOP 50%';
  if (grade === 'A+') percentile = 'TOP 1%';
  else if (grade === 'A') percentile = 'TOP 5%';
  else if (grade === 'B+') percentile = 'TOP 15%';
  else if (grade === 'B') percentile = 'TOP 25%';
  else if (grade === 'C+') percentile = 'TOP 40%';
  else if (grade === 'C') percentile = 'TOP 50%';
  else percentile = '-';

  const displayGrade = grade === 'Fail' ? 'Tavsiya etilmadi' : grade;

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const certId = `189-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#F1F5F9', borderRadius: '16px', maxWidth: '1100px', width: '100%', maxHeight: '95vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        
        {/* Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', padding: '16px', borderBottom: '1px solid #E2E8F0', background: 'white', zIndex: 10 }}>
          <button onClick={handleDownload} disabled={isDownloading} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: isDownloading ? '#94A3B8' : '#D97706', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isDownloading ? 'not-allowed' : 'pointer' }}>
            <Download size={18} /> Yuklab olish
          </button>
          <button onClick={onClose} style={{ padding: '10px', background: '#F1F5F9', color: '#0F172A', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Certificate Container with Scaling */}
        <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px 0' }}>
          
          <div style={{ 
            height: `${707 * scale}px`, // Reserve scaled height so it doesn't leave huge gap
            width: `${1000 * scale}px` 
          }}>
            <div ref={certificateRef} style={{ 
              width: '1000px', 
              height: '707px', // A4 landscape ratio roughly
              background: '#FAF9F6',
              position: 'relative',
              padding: '40px',
              boxSizing: 'border-box',
              fontFamily: '"Times New Roman", Times, serif',
              color: '#0B2341',
              transform: `scale(${scale})`,
              transformOrigin: 'top left'
            }}>
              
              {/* Borders */}
              <div style={{ position: 'absolute', inset: '20px', border: '4px solid #C5A059', pointerEvents: 'none' }}></div>
              <div style={{ position: 'absolute', inset: '28px', border: '1px solid #C5A059', pointerEvents: 'none' }}></div>

              {/* Corner Ornaments */}
              {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
                <div key={pos} style={{
                  position: 'absolute',
                  width: '60px', height: '60px',
                  border: '4px solid #C5A059',
                  [pos.includes('top') ? 'top' : 'bottom']: '10px',
                  [pos.includes('left') ? 'left' : 'right']: '10px',
                  borderRightColor: pos === 'top-left' || pos === 'bottom-left' ? 'transparent' : '#C5A059',
                  borderBottomColor: pos === 'top-left' || pos === 'top-right' ? 'transparent' : '#C5A059',
                  borderLeftColor: pos === 'top-right' || pos === 'bottom-right' ? 'transparent' : '#C5A059',
                  borderTopColor: pos === 'bottom-left' || pos === 'bottom-right' ? 'transparent' : '#C5A059',
                  borderRadius: pos === 'top-left' ? '0 0 100% 0' : pos === 'top-right' ? '0 0 0 100%' : pos === 'bottom-left' ? '0 100% 0 0' : '100% 0 0 0'
                }}></div>
              ))}

              <div style={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                
                {/* Logo & Title */}
                <div style={{ marginTop: '0px' }}>
                  <img src="/cert_logo.png" alt="189 PREP" style={{ height: '70px', objectFit: 'contain', mixBlendMode: 'multiply' }} />
                </div>
                
                <h1 style={{ fontSize: '46px', fontWeight: 'bold', margin: '15px 0 10px', letterSpacing: '2px', color: '#0B2341' }}>
                  MOCK NATIONAL CERTIFICATE
                </h1>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '15px' }}>
                  <div style={{ height: '1px', width: '100px', background: '#C5A059' }}></div>
                  <div style={{ width: '12px', height: '12px', background: '#C5A059', transform: 'rotate(45deg)' }}></div>
                  <div style={{ height: '1px', width: '100px', background: '#C5A059' }}></div>
                </div>

                <p style={{ fontSize: '20px', fontStyle: 'italic', color: '#475569', marginBottom: '10px' }}>
                  This certifies that
                </p>

                <h2 style={{ fontSize: '42px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#0B2341', letterSpacing: '1px' }}>
                  {userName}
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '15px' }}>
                  <div style={{ height: '2px', width: '150px', background: '#C5A059' }}></div>
                  <div style={{ width: '8px', height: '8px', background: '#C5A059', borderRadius: '50%' }}></div>
                  <div style={{ height: '2px', width: '150px', background: '#C5A059' }}></div>
                </div>

                <p style={{ fontSize: '20px', color: '#334155', maxWidth: '700px', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                  has successfully completed the <strong style={{ color: '#C5A059' }}>{subjectName}</strong><br/>
                  Mock Examination organized by <strong>189 PREP</strong>.
                </p>

                {/* Stats Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '85%', marginBottom: '20px' }}>
                  {[
                    { icon: Trophy, label: 'OVERALL SCORE', value: `${result.earnedBall} / ${result.maxBall}` },
                    { icon: Star, label: 'GRADE', value: displayGrade },
                    { icon: BarChart, label: 'PERCENTILE', value: percentile },
                    { icon: FileCheck, label: 'CERTIFICATE ID', value: certId },
                    { icon: Calendar, label: 'ISSUE DATE', value: today },
                  ].map((stat, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '20%' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#0B2341', color: '#C5A059', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                        <stat.icon size={24} />
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', color: '#475569', marginBottom: '4px' }}>{stat.label}</div>
                      <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#C5A059' }}>{stat.value}</div>
                      
                      {/* Vertical Divider */}
                      {idx < 4 && <div style={{ position: 'absolute', right: '-10%', top: '20%', height: '60%', width: '1px', background: 'rgba(197, 160, 89, 0.3)' }}></div>}
                    </div>
                  ))}
                </div>

                {/* Footer Section */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', width: '85%', padding: '16px', background: 'white', border: '1px solid rgba(197, 160, 89, 0.3)', borderRadius: '12px', marginTop: 'auto' }}>
                  <ShieldCheck size={40} color="#C5A059" style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: '13px', color: '#475569', textAlign: 'left', margin: 0, lineHeight: '1.4' }}>
                    This certificate represents the results of the <strong>189 PREP</strong> mock examination and is intended for practice purposes only. It is not an official National Certification issued by government authorities.
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
