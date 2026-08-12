import React, { useState, useEffect } from 'react';
import { Bell, Send, Users, AlertCircle, Clock, CreditCard, UserPlus } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function AdminNotifications() {
  const [activeTab, setActiveTab] = useState('system'); // 'system' or 'send'
  
  // Send tab state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [targetEmail, setTargetEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  // System tab state
  const [systemEvents, setSystemEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    if (activeTab === 'system') {
      fetchSystemEvents();
    }
  }, [activeTab]);

  const fetchSystemEvents = async () => {
    setLoadingEvents(true);
    try {
      // 1. Fetch recent user registrations
      const { data: recentUsers, error: usersErr } = await supabase
        .from('profiles')
        .select('id, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      // 2. Fetch recent paid transactions
      // Handle case where transactions table might not exist yet gracefully
      let recentTransactions = [];
      try {
        const { data: txs, error: txErr } = await supabase
          .from('transactions')
          .select('id, amount, plan_months, created_at, status, user_id, profiles(full_name)')
          .eq('status', 'paid')
          .order('created_at', { ascending: false })
          .limit(20);
        if (!txErr && txs) recentTransactions = txs;
      } catch (e) {
        console.warn("Transactions table might not exist or error fetching.", e);
      }

      // 3. Fetch error reports
      let recentReports = [];
      try {
        const { data: reports, error: reportsErr } = await supabase
          .from('error_reports')
          .select('id, message, created_at, user_id, profiles(full_name), mock_tests(title), questions(text, order_num)')
          .order('created_at', { ascending: false })
          .limit(20);
        if (!reportsErr && reports) recentReports = reports;
      } catch (e) {
        console.warn("Error reports table might not exist.", e);
      }

      const events = [];

      if (recentUsers) {
        recentUsers.forEach(u => {
          events.push({
            id: `user-${u.id}`,
            type: 'new_user',
            title: "Yangi foydalanuvchi",
            description: `${u.full_name || 'Noma\'lum'} ro'yxatdan o'tdi.`,
            date: u.created_at ? new Date(u.created_at) : new Date(),
            icon: <UserPlus size={18} className="text-blue" />,
            bgColor: '#DBEAFE'
          });
        });
      }

      recentTransactions.forEach(tx => {
        events.push({
          id: `tx-${tx.id}`,
          type: 'new_payment',
          title: "Yangi xarid",
          description: `${tx.profiles?.full_name || 'Foydalanuvchi'} ${tx.amount} UZS to'ladi (${tx.plan_months} oylik).`,
          date: new Date(tx.created_at),
          icon: <CreditCard size={18} className="text-green" />,
          bgColor: '#D1FAE5'
        });
      });

      recentReports.forEach(r => {
        let qInfo = '';
        if (r.questions) {
          const qText = (r.questions.text || '').replace(/<[^>]+>/g, '').substring(0, 30);
          qInfo = ` (Savol ${r.questions.order_num || '?'}: ${qText}...)`;
        }
        
        events.push({
          id: `report-${r.id}`,
          type: 'error_report',
          title: `Xatolik: ${r.mock_tests?.title || 'Test'}${qInfo}`,
          description: `Foydalanuvchi (${r.profiles?.full_name || 'Noma\'lum'}): "${r.message}"`,
          date: new Date(r.created_at),
          icon: <AlertCircle size={18} className="text-red" />,
          bgColor: '#FEE2E2'
        });
      });

      // Sort combined events by date desc
      events.sort((a, b) => b.date - a.date);

      setSystemEvents(events);
    } catch (err) {
      console.error("Error fetching system events", err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setStatusMsg({ text: 'Sarlavha va xabar kiritilishi shart!', type: 'error' });
      return;
    }
    
    setIsSending(true);
    setStatusMsg({ text: '', type: '' });

    try {
      let targetUserIds = [];

      if (targetType === 'all') {
        const { data: users, error } = await supabase.from('profiles').select('id');
        if (error) throw error;
        targetUserIds = users.map(u => u.id);
      } else {
        if (!targetEmail.trim()) {
          setStatusMsg({ text: 'Foydalanuvchi IDsi kiritilishi shart!', type: 'error' });
          setIsSending(false);
          return;
        }
        const { data: user, error } = await supabase.from('profiles').select('id').eq('id', targetEmail).single();
        if (error || !user) {
          setStatusMsg({ text: 'Bunday IDga ega foydalanuvchi topilmadi.', type: 'error' });
          setIsSending(false);
          return;
        }
        targetUserIds = [user.id];
      }

      if (targetUserIds.length === 0) {
        setStatusMsg({ text: 'Yuborish uchun foydalanuvchilar topilmadi.', type: 'error' });
        setIsSending(false);
        return;
      }

      const notificationsToInsert = targetUserIds.map(id => ({
        user_id: id,
        title: title.trim(),
        message: message.trim(),
        is_read: false
      }));

      const { error: insertError } = await supabase.from('notifications').insert(notificationsToInsert);

      if (insertError) throw insertError;

      setStatusMsg({ text: `Xabarnoma muvaffaqiyatli yuborildi! (${targetUserIds.length} ta foydalanuvchiga)`, type: 'success' });
      setTitle('');
      setMessage('');
      if (targetType !== 'all') setTargetEmail('');
      
    } catch (err) {
      console.error('Error sending notifications:', err);
      setStatusMsg({ text: `Xatolik yuz berdi: ${err.message || "Noma'lum xato"} (Supabase jadvali mavjudligini tekshiring)`, type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " yil oldin";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " oy oldin";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " kun oldin";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " soat oldin";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " daqiqa oldin";
    return Math.floor(seconds) + " soniya oldin";
  };

  return (
    <div className="admin-view fade-in">
      <div className="admin-view-header">
        <div>
          <h2>Xabarnomalar va Faollik</h2>
          <p>Tizimdagi so'nggi hodisalar va foydalanuvchilarga xabar yuborish</p>
        </div>
        <Bell size={24} className="text-muted" />
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(15,23,42,0.1)', paddingBottom: '12px' }}>
        <button 
          onClick={() => setActiveTab('system')}
          style={{ 
            background: activeTab === 'system' ? '#2563EB' : 'transparent', 
            color: activeTab === 'system' ? 'white' : '#64748B', 
            border: 'none', 
            padding: '8px 16px', 
            borderRadius: '8px', 
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
        >
          Tizim Hodisalari
        </button>
        <button 
          onClick={() => setActiveTab('send')}
          style={{ 
            background: activeTab === 'send' ? '#2563EB' : 'transparent', 
            color: activeTab === 'send' ? 'white' : '#64748B', 
            border: 'none', 
            padding: '8px 16px', 
            borderRadius: '8px', 
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
        >
          Xabar Yuborish
        </button>
      </div>

      {activeTab === 'system' && (
        <div className="admin-panel fade-in-up" style={{ padding: '24px', maxWidth: '800px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} className="text-muted" />
            So'nggi 24 soatdagi faollik
          </h3>
          
          {loadingEvents ? (
            <p className="text-muted">Yuklanmoqda...</p>
          ) : systemEvents.length === 0 ? (
            <p className="text-muted">Hozircha hech qanday hodisa yo'q.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
              {/* Timeline line */}
              <div style={{ position: 'absolute', left: '20px', top: '10px', bottom: '10px', width: '2px', background: '#E2E8F0' }}></div>
              
              {systemEvents.map((event, idx) => (
                <div key={event.id} style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: event.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '4px solid white' }}>
                    {event.icon}
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', flex: 1, border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', color: '#0F172A' }}>{event.title}</h4>
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>{timeAgo(event.date)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'send' && (
        <div className="fade-in-up" style={{ background: 'var(--bg-surface, white)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-subtle, rgba(15, 23, 42, 0.1))', maxWidth: '600px' }}>
          {statusMsg.text && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', background: statusMsg.type === 'error' ? 'rgba(15, 23, 42, 0.04)' : '#F0FDF4', color: statusMsg.type === 'error' ? '#991B1B' : '#166534', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}>
              <AlertCircle size={18} />
              {statusMsg.text}
            </div>
          )}

          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary, rgba(15, 23, 42, 0.6))' }}>Kimga yuboriladi?</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '15px', color: 'var(--text-primary, #0F172A)' }}>
                  <input 
                    type="radio" 
                    checked={targetType === 'all'} 
                    onChange={() => setTargetType('all')} 
                  />
                  Barcha foydalanuvchilarga
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '15px', color: 'var(--text-primary, #0F172A)' }}>
                  <input 
                    type="radio" 
                    checked={targetType === 'specific'} 
                    onChange={() => setTargetType('specific')} 
                  />
                  Bitta foydalanuvchiga
                </label>
              </div>
            </div>

            {targetType === 'specific' && (
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary, rgba(15, 23, 42, 0.6))' }}>Foydalanuvchi IDsi (UUID)</label>
                <input 
                  type="text" 
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="550e8400-e29b-41d4-a716-446655440000"
                  style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle, rgba(15, 23, 42, 0.1))', background: 'transparent', color: 'var(--text-primary, #0F172A)', outline: 'none', fontSize: '15px' }}
                  required={targetType === 'specific'}
                />
              </div>
            )}

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary, rgba(15, 23, 42, 0.6))' }}>Sarlavha</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Yangi Mock Test qo'shildi!"
                style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle, rgba(15, 23, 42, 0.1))', background: 'transparent', color: 'var(--text-primary, #0F172A)', outline: 'none', fontSize: '15px' }}
                required
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary, rgba(15, 23, 42, 0.6))' }}>Xabar matni</label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Assalomu alaykum! Siz uchun maxsus tayyorlangan yangi variantni ishlashingiz mumkin."
                style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle, rgba(15, 23, 42, 0.1))', background: 'transparent', color: 'var(--text-primary, #0F172A)', outline: 'none', fontSize: '15px', minHeight: '120px', resize: 'vertical' }}
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={isSending}
              style={{ padding: '14px 24px', background: '#0F172A', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', fontWeight: '600', cursor: isSending ? 'not-allowed' : 'pointer', opacity: isSending ? 0.7 : 1, marginTop: '8px' }}
            >
              {isSending ? 'Yuborilmoqda...' : <><Send size={18} /> Yuborish</>}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
