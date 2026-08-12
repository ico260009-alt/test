import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Shield, Clock, Database, FileJson, Server } from 'lucide-react';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadLogs() {
      // Mock data if table doesn't have rows or to prevent crash if not perfectly migrated
      try {
        const { data, error } = await supabase
          .from('admin_audit_logs')
          .select(`
            id, action_type, table_name, record_id, old_data, new_data, created_at, ip_address,
            profiles(full_name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (data) setLogs(data);
      } catch (err) {
        console.error("Audit log error:", err);
      }
      setLoading(false);
    }
    loadLogs();

    const channel = supabase
      .channel('admin-audit-logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_audit_logs' }, () => {
         loadLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    return (log.action_type || '').toLowerCase().includes(term) ||
           (log.table_name || '').toLowerCase().includes(term) ||
           (log.profiles?.full_name || '').toLowerCase().includes(term);
  });

  return (
    <div className="admin-section">
      <div className="admin-header">
        <h2>Audit Jurnali</h2>
        <p>Adminlarning tizimdagi barcha xatti-harakatlari tarixi.</p>
      </div>

      <div className="admin-card">
        <div style={{ marginBottom: '16px' }}>
          <input 
            type="text" 
            placeholder="Qidirish (ism, amal, jadval)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
          />
        </div>

        {loading ? <p>Yuklanmoqda...</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Kim</th>
                  <th>Qachon</th>
                  <th>Nima o'zgartirdi</th>
                  <th>Eski qiymat</th>
                  <th>Yangi qiymat</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={16} color="#6366f1" />
                        <div>
                          <div style={{ fontWeight: 500 }}>{log.profiles?.full_name || 'Noma\'lum'}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{log.profiles?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} />
                        {new Date(log.created_at).toLocaleString('uz-UZ')}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Database size={14} />
                        <strong>{(log.action_type || '').toUpperCase()}</strong> - {log.table_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>ID: {log.record_id}</div>
                    </td>
                    <td>
                      {log.old_data && (
                        <div style={{ fontSize: '11px', background: '#f8717120', padding: '4px', borderRadius: '4px', maxWidth: '150px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                          <FileJson size={12} style={{ display: 'inline', marginRight: '4px' }}/>
                          {JSON.stringify(log.old_data).substring(0, 50)}...
                        </div>
                      )}
                    </td>
                    <td>
                      {log.new_data && (
                        <div style={{ fontSize: '11px', background: '#4ade8020', padding: '4px', borderRadius: '4px', maxWidth: '150px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                          <FileJson size={12} style={{ display: 'inline', marginRight: '4px' }}/>
                          {JSON.stringify(log.new_data).substring(0, 50)}...
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                        <Server size={14} />
                        {log.ip_address || 'Noma\'lum'}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>Ma'lumot topilmadi</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
