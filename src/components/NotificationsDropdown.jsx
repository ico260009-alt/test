import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function NotificationsDropdown({ user, lang }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) {
        console.error('Error fetching notifications:', error);
        setNotifications([]);
        setUnreadCount(0);
      } else if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error('Unexpected error in notifications:', err);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length > 0) {
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({...n, is_read: true})));
      try {
        await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
      } catch (e) {
        console.error('Error marking notifications as read:', e);
      }
    }
  };

  const toggleDropdown = async () => {
    if (!isOpen) {
      await fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        onClick={toggleDropdown}
        style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'white', border: '1px solid rgba(15, 23, 42, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
      >
        <Bell size={20} color="rgba(15, 23, 42, 0.6)" />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: '10px', right: '12px', width: '8px', height: '8px', background: '#0F172A', borderRadius: '50%' }}></span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown-menu" style={{ position: 'absolute', top: '56px', width: '340px', background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', border: '1px solid rgba(15, 23, 42, 0.1)', zIndex: 100 }}>
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(15, 23, 42, 0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0F172A' }}>{lang === 'uz' ? 'Bildirishnomalar' : 'Уведомления'}</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAsRead}
                style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0 }}
              >
                {lang === 'uz' ? 'Barchasini o\'qish' : 'Прочитать все'}
              </button>
            )}
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(15, 23, 42, 0.4)' }}>{lang === 'uz' ? 'Bo\'sh' : 'Пусто'}</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={{ padding: '16px', borderBottom: '1px solid rgba(15, 23, 42, 0.04)', opacity: n.is_read ? 0.7 : 1, background: n.is_read ? 'transparent' : 'rgba(15, 23, 42, 0.03)' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#0F172A' }}>{n.title}</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'rgba(15, 23, 42, 0.5)', lineHeight: '1.4' }}>{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
