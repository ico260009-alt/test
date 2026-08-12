import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ShieldAlert, Trash2, Ban, RefreshCcw, UserCircle, CreditCard, X, BarChart2, Filter, Key, Mail, Activity, Monitor, MapPin, Database } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // all, admin, user
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, suspended
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, analytics, security
  const [newPlan, setNewPlan] = useState('free');
  const [newPlanExpiry, setNewPlanExpiry] = useState('');
  
  // User details state
  const [userDetails, setUserDetails] = useState({
    attempts: [],
    sessions: [],
    loginLogs: [],
    stats: { totalAttempts: 0, correctAttempts: 0, examsTaken: 0 }
  });
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel('admin-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
         fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (newRole === 'admin' && !window.confirm("Bu foydalanuvchiga ADMIN huquqini bermoqchimisiz?")) return;
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      fetchUsers();
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  };

  const toggleSuspend = async (userId, isSuspended) => {
    const action = isSuspended ? "blokdan chiqarish" : "bloklash";
    if (!window.confirm(`Foydalanuvchini ${action}ga ishonchingiz komilmi?`)) return;
    try {
      const { error } = await supabase.from('profiles').update({ is_suspended: !isSuspended }).eq('id', userId);
      if (error) throw error;
      fetchUsers();
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  };

  const resetProgress = async (userId) => {
    if (!window.confirm("DIQQAT: Foydalanuvchining barcha test natijalari o'chiriladi. Davom etasizmi?")) return;
    try {
      await supabase.from('attempts').delete().eq('user_id', userId);
      await supabase.from('test_sessions').delete().eq('user_id', userId);
      alert("Natijalar muvaffaqiyatli tozalandi!");
      if (selectedUser && selectedUser.id === userId) {
         openUserDetails(selectedUser);
      }
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  };

  const handleChangePlan = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    try {
      const updateData = { subscription_tier: newPlan };
      if (newPlan !== 'free') {
        if (newPlanExpiry) updateData.subscription_until = new Date(newPlanExpiry).toISOString();
        else {
          const date = new Date();
          date.setMonth(date.getMonth() + 1);
          updateData.subscription_until = date.toISOString();
        }
      } else {
        updateData.subscription_until = null;
      }

      const { error } = await supabase.from('profiles').update(updateData).eq('id', selectedUser.id);
      if (error) throw error;
      
      alert("Ta'rif muvaffaqiyatli o'zgartirildi!");
      fetchUsers();
      setSelectedUser({...selectedUser, subscription_tier: newPlan, subscription_until: updateData.subscription_until});
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  };

  const handleManualVerification = async () => {
    alert("Kechirasiz, userni qo'lda tasdiqlash uchun Supabase Service Role (Backend) kerak.");
  };

  const handlePasswordReset = async () => {
    if (!selectedUser?.email) return alert("Foydalanuvchida email yo'q");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(selectedUser.email);
      if (error) throw error;
      alert(`Parolni tiklash havolasi ${selectedUser.email} ga yuborildi!`);
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  };

  const openUserDetails = async (user) => {
    setSelectedUser(user);
    setActiveTab('overview');
    setNewPlan(user.subscription_tier || 'free');
    setNewPlanExpiry(user.subscription_until ? new Date(user.subscription_until).toISOString().split('T')[0] : '');
    
    setDetailsLoading(true);
    try {
      const { data: attempts } = await supabase.from('attempts').select('is_correct').eq('user_id', user.id);
      const { data: sessions } = await supabase.from('test_sessions').select('score, completed_at, mock_tests(title)').eq('user_id', user.id).order('completed_at', { ascending: false });
      const { data: loginLogs } = await supabase.from('login_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);

      let totalAttempts = 0;
      let correctAttempts = 0;
      let examsTaken = sessions ? sessions.length : 0;

      if (attempts) {
        totalAttempts = attempts.length;
        correctAttempts = attempts.filter(a => a.is_correct).length;
      }

      setUserDetails({
        attempts: attempts || [],
        sessions: sessions || [],
        loginLogs: loginLogs || [],
        stats: { totalAttempts, correctAttempts, examsTaken }
      });
    } catch(err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (u.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (u.id?.includes(searchTerm));
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'suspended' ? u.is_suspended : !u.is_suspended);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterRole, filterStatus]);

  const getPlanBadgeColor = (plan) => {
    switch (plan) {
      case 'pro': return { bg: '#FEF3C7', color: '#D97706' };
      case 'plus': return { bg: '#DBEAFE', color: '#2563EB' };
      default: return { bg: '#F1F5F9', color: '#64748B' };
    }
  };

  return (
    <div className="admin-view fade-in">
      <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1>Foydalanuvchilar</h1>
          <p>Barcha ro'yxatdan o'tgan abituriyentlarni boshqarish</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div className="admin-search">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Ism, Email yoki ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}>
            <option value="all">Barcha rollar</option>
            <option value="admin">Admin</option>
            <option value="user">Foydalanuvchi</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}>
            <option value="all">Barcha holatlar</option>
            <option value="active">Faol</option>
            <option value="suspended">Bloklangan</option>
          </select>
        </div>
      </header>

      <div className="admin-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Yuklanmoqda...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>To'liq ism / Email</th>
                  <th>Sana</th>
                  <th>Holati</th>
                  <th>Ta'rif</th>
                  <th>Rol</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map(u => {
                  const planStyle = getPlanBadgeColor(u.subscription_tier || 'free');
                  return (
                  <tr key={u.id}>
                    <td className="uuid-cell" title={u.id}>{u.id.substring(0,8)}...</td>
                    <td style={{ fontWeight: 600, color: u.is_suspended ? 'rgba(15, 23, 42, 0.5)' : '#0F172A', textDecoration: u.is_suspended ? 'line-through' : 'none' }}>
                      {u.full_name || 'Kiritilmagan'}
                      <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#64748B', marginTop: '4px' }}>
                        {u.email || 'Email mavjud emas'}
                      </div>
                    </td>
                    <td style={{ fontSize: '14px', color: '#475569' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('uz-UZ') : '-'}
                    </td>
                    <td>
                      {u.is_suspended ? (
                        <span style={{ color: '#0F172A', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><Ban size={12} /> Bloklangan</span>
                      ) : (
                        <span style={{ color: '#2563EB', fontSize: '12px', fontWeight: 'bold' }}>Faol</span>
                      )}
                    </td>
                    <td>
                      <span style={{ background: planStyle.bg, color: planStyle.color, padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        {u.subscription_tier === 'free' || !u.subscription_tier ? 'Bepul' : u.subscription_tier}
                      </span>
                    </td>
                    <td>
                      <span className={`role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}`} style={{ cursor: 'pointer' }} onClick={() => toggleRole(u.id, u.role)} title="Rolni o'zgartirish">
                        {u.role === 'admin' ? <ShieldAlert size={14} /> : <UserCircle size={14} />} {u.role?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="icon-btn text-blue" title="Batafsil ma'lumot" onClick={() => openUserDetails(u)} style={{ color: '#3B82F6' }}><BarChart2 size={16} /></button>
                        {u.role !== 'admin' && (
                          <button className={`icon-btn ${u.is_suspended ? 'text-blue' : 'text-red'}`} title={u.is_suspended ? "Blokdan chiqarish" : "Bloklash"} onClick={() => toggleSuspend(u.id, u.is_suspended)}>
                            <Ban size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
                {filteredUsers.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'rgba(15, 23, 42, 0.5)' }}>Topilmadi</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {!loading && totalPages > 1 && (
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0' }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} style={{ padding: '6px 12px', background: '#0F172A', color: 'white', border: 'none', borderRadius: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}>Oldingi</button>
            <span style={{ padding: '6px 12px', color: '#64748b' }}>{currentPage} / {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} style={{ padding: '6px 12px', background: '#0F172A', color: 'white', border: 'none', borderRadius: '4px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}>Keyingi</button>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div className="fade-in-up" style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ position: 'sticky', top: 0, background: 'white', padding: '24px', borderBottom: '1px solid #e2e8f0', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#0F172A' }}>{selectedUser.full_name || 'Ismsiz Foydalanuvchi'}</h2>
                <div style={{ color: '#64748b', fontSize: '14px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span><Mail size={14} style={{ display: 'inline', marginRight: '4px' }}/> {selectedUser.email}</span>
                  <span><strong>ID:</strong> {selectedUser.id}</span>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={24} /></button>
            </div>
            
            <div style={{ padding: '0 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '24px', background: '#f8fafc' }}>
              <button className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')} style={{ border: 'none', borderBottom: activeTab==='overview'?'2px solid #2563EB':'2px solid transparent', borderRadius: 0, padding: '16px 0', background:'transparent', color: activeTab==='overview'?'#2563EB':'#64748b', fontWeight:600, cursor: 'pointer', outline: 'none' }}>Umumiy Sozlamalar</button>
              <button className={`admin-tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')} style={{ border: 'none', borderBottom: activeTab==='analytics'?'2px solid #2563EB':'2px solid transparent', borderRadius: 0, padding: '16px 0', background:'transparent', color: activeTab==='analytics'?'#2563EB':'#64748b', fontWeight:600, cursor: 'pointer', outline: 'none' }}>Analitika va Natijalar</button>
              <button className={`admin-tab ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')} style={{ border: 'none', borderBottom: activeTab==='security'?'2px solid #2563EB':'2px solid transparent', borderRadius: 0, padding: '16px 0', background:'transparent', color: activeTab==='security'?'#2563EB':'#64748b', fontWeight:600, cursor: 'pointer', outline: 'none' }}>Xavfsizlik va Loglar</button>
            </div>

            <div style={{ padding: '24px' }}>
              {detailsLoading ? <p>Ma'lumotlar yuklanmoqda...</p> : (
                <>
                  {activeTab === 'overview' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      <div className="admin-card">
                        <h3>Obunani Boshqarish</h3>
                        <form onSubmit={handleChangePlan}>
                          <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Yangi Ta'rif</label>
                            <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}>
                              <option value="free">Bepul Sinov (Free)</option>
                              <option value="plus">Plus</option>
                              <option value="pro">Pro</option>
                            </select>
                          </div>
                          {newPlan !== 'free' && (
                            <div style={{ marginBottom: '24px' }}>
                              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Amal qilish muddati (ixtiyoriy)</label>
                              <input type="date" value={newPlanExpiry} onChange={(e) => setNewPlanExpiry(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }} />
                            </div>
                          )}
                          <button type="submit" style={{ width: '100%', padding: '10px', background: '#2563EB', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '600', cursor: 'pointer' }}>Saqlash</button>
                        </form>
                      </div>

                      <div className="admin-card">
                        <h3>Tezkor Amallar</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                          <button onClick={handleManualVerification} style={{ padding: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 600 }}>Emailni qo'lda tasdiqlash (Override)</button>
                          <button onClick={handlePasswordReset} style={{ padding: '10px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 600 }}>Parolni tiklash havolasini yuborish</button>
                          <button onClick={() => toggleSuspend(selectedUser.id, selectedUser.is_suspended)} style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 600 }}>{selectedUser.is_suspended ? 'Foydalanuvchini blokdan chiqarish' : 'Foydalanuvchini bloklash'}</button>
                          <button onClick={() => resetProgress(selectedUser.id)} style={{ padding: '10px', background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 600 }}>Barcha natijalarni tozalash</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'analytics' && (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                         <div style={{ padding: '16px', background: '#F1F5F9', borderRadius: '8px' }}>
                           <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Mocklar Soni</div>
                           <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0F172A' }}>{userDetails.stats.examsTaken}</div>
                         </div>
                         <div style={{ padding: '16px', background: '#EFF6FF', borderRadius: '8px' }}>
                           <div style={{ color: '#1E40AF', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Jami Savollar</div>
                           <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563EB' }}>{userDetails.stats.totalAttempts}</div>
                         </div>
                         <div style={{ padding: '16px', background: '#ECFDF5', borderRadius: '8px' }}>
                           <div style={{ color: '#065F46', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>To'g'ri Javoblar</div>
                           <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>{userDetails.stats.correctAttempts}</div>
                         </div>
                         <div style={{ padding: '16px', background: '#FEF2F2', borderRadius: '8px' }}>
                           <div style={{ color: '#991B1B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>AI So'rovlar (Taxminiy)</div>
                           <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#EF4444' }}>0</div>
                         </div>
                      </div>
                      
                      <h3>Yechilgan Mocklar Tarixi</h3>
                      {userDetails.sessions.length > 0 ? (
                        <table className="admin-table">
                           <thead><tr><th>Sana</th><th>Mock Nomi</th><th>Natija (Ball)</th></tr></thead>
                           <tbody>
                             {userDetails.sessions.map((s, i) => (
                               <tr key={i}>
                                 <td>{new Date(s.completed_at).toLocaleString('uz-UZ')}</td>
                                 <td>{s.mock_tests?.title || 'Noma\'lum'}</td>
                                 <td><strong>{s.score}</strong></td>
                               </tr>
                             ))}
                           </tbody>
                        </table>
                      ) : (
                        <p style={{ color: '#64748b' }}>Foydalanuvchi hali mock test yechmagan.</p>
                      )}
                    </div>
                  )}

                  {activeTab === 'security' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                      <div className="admin-card">
                         <h3>Login Tarixi va Qurilmalar (Sessiyalar)</h3>
                         {userDetails.loginLogs.length > 0 ? (
                           <table className="admin-table">
                             <thead><tr><th>Sana</th><th>IP Manzil</th><th>Davlat (Taxminiy)</th><th>Qurilma / Brauzer</th><th>Holati</th></tr></thead>
                             <tbody>
                               {userDetails.loginLogs.map(log => (
                                 <tr key={log.id}>
                                   <td>{new Date(log.created_at).toLocaleString('uz-UZ')}</td>
                                   <td><Monitor size={14} style={{ display:'inline', marginRight:'4px' }}/>{log.ip_address}</td>
                                   <td><MapPin size={14} style={{ display:'inline', marginRight:'4px' }}/>{log.country || 'Noma\'lum'}</td>
                                   <td>{log.user_agent || 'Noma\'lum'}</td>
                                   <td>
                                     {log.success ? <span style={{ color: '#10b981', fontWeight: 600 }}>Muvaffaqiyatli</span> : <span style={{ color: '#ef4444', fontWeight: 600 }}>Failed: {log.reason}</span>}
                                   </td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         ) : (
                           <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                             <Activity size={32} color="#94a3b8" style={{ marginBottom: '12px' }}/>
                             <p style={{ color: '#64748b', margin: 0 }}>Hozircha tizimga kirish loglari yo'q.</p>
                             <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px' }}>* Login loglar bazaga endi yozilishni boshlaydi.</p>
                           </div>
                         )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}
