import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, Trash2, Search, CheckCircle, XCircle, Settings, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import AdminQuestionsManager from './AdminQuestionsManager';

const MILLIY_SERTIFIKAT_SUBJECTS = [
  "Matematika",
  "Fizika",
  "Ona tili va adabiyot",
  "Kimyo",
  "Biologiya",
  "Tarix",
  "Ingliz tili"
];

export default function AdminTests() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [managingTest, setManagingTest] = useState(null);
  const [editingTestId, setEditingTestId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    dtm_main1: '',
    dtm_main2: '',
    duration_minutes: 180,
    question_count: 90,
    is_premium: false,
    available_from: '',
    available_until: '',
    exam_system: 'dtm',
    paper_number: '',
    variant_name: ''
  });

  const fetchTests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('mock_tests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setTests(data || []);
    } catch (err) {
      console.error('Error fetching tests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const insertData = { ...formData };
      if (!insertData.available_from) insertData.available_from = null;
      if (!insertData.available_until) insertData.available_until = null;
      if (insertData.paper_number === '') {
        insertData.paper_number = null;
      } else if (insertData.paper_number !== null) {
        insertData.paper_number = parseInt(insertData.paper_number, 10);
      }
      
      if (insertData.exam_system === 'alevel') {
        insertData.title = `${insertData.variant_name} - Paper ${insertData.paper_number}`;
      } else if (insertData.exam_system === 'dtm') {
        insertData.subject = `${formData.dtm_main1}|${formData.dtm_main2}`;
      }
      delete insertData.variant_name;
      delete insertData.dtm_main1;
      delete insertData.dtm_main2;

      if (editingTestId) {
        const { error } = await supabase.from('mock_tests').update(insertData).eq('id', editingTestId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('mock_tests').insert([insertData]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingTestId(null);
      fetchTests();
      setFormData({ title: '', subject: '', dtm_main1: '', dtm_main2: '', duration_minutes: 180, question_count: 90, is_premium: false, available_from: '', available_until: '', exam_system: 'dtm', paper_number: '', variant_name: '', essay_topic: '' });
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Barcha ma'lumotlar (foydalanuvchilar natijalari bilan) o'chib ketadi. Testni o'chirishga ishonchingiz komilmi?")) return;
    try {
      // Safely try to clean up child records if SQL CASCADE isn't set up yet
      // We ignore errors here because tables might not exist or RLS might block it
      await supabase.from('exam_integrity_events').delete().eq('test_id', id);
      await supabase.from('test_sessions').delete().eq('test_id', id);

      const { data: qs } = await supabase.from('questions').select('id').eq('test_id', id);
      if (qs && qs.length > 0) {
        const qIds = qs.map(q => q.id);
        await supabase.from('bookmarks').delete().in('question_id', qIds);
        await supabase.from('questions').delete().eq('test_id', id);
      }

      // Finally delete the test
      const { error } = await supabase.from('mock_tests').delete().eq('id', id);
      if (error) throw error;
      fetchTests();
    } catch (err) {
      alert("Xatolik: ushbu testga bog'langan natijalar mavjud. Uni o'chirish uchun ma'lumotlar bazasida CASCADE sozlangan bo'lishi kerak. (" + (err.message || "Xato") + ")");
    }
  };

  const toggleVisibility = async (t) => {
    try {
      const { error } = await supabase.from('mock_tests').update({ is_hidden: !t.is_hidden }).eq('id', t.id);
      if (error) throw error;
      fetchTests();
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  };

  if (managingTest) {
    return <AdminQuestionsManager test={managingTest} onBack={() => setManagingTest(null)} />;
  }

  const totalPages = Math.ceil(tests.length / itemsPerPage);
  const paginatedTests = tests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="admin-view fade-in">
      <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>Testlar Boshqaruvi</h1>
          <p>Mock testlarni qo'shish, tahrirlash va o'chirish</p>
        </div>

        <button className="admin-btn-primary" onClick={() => {
          setEditingTestId(null);
          setFormData({ title: '', subject: '', dtm_main1: '', dtm_main2: '', duration_minutes: 180, question_count: 90, is_premium: false, available_from: '', available_until: '', exam_system: 'dtm', paper_number: '', variant_name: '' });
          setIsModalOpen(true);
        }}>
          <Plus size={18} />
          <span>Yangi Test Qo'shish</span>
        </button>
      </header>

      <div className="admin-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(15, 23, 42, 0.4)' }}>Yuklanmoqda...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nomi</th>
                <th>Fan (Yo'nalish)</th>
                <th>Davomiyligi</th>
                <th>Savollar soni</th>
                <th>Vaqti</th>
                <th>Turi</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTests.map(t => (
                <tr key={t.id} style={{ opacity: t.is_hidden ? 0.6 : 1 }}>
                  <td style={{ fontWeight: 600 }}>
                    {t.title}
                    {t.is_hidden && <span style={{ marginLeft: '8px', fontSize: '11px', background: '#FEE2E2', color: '#991B1B', padding: '2px 6px', borderRadius: '4px' }}>Yashirin</span>}
                    {t.exam_system === 'alevel' && (
                      <div style={{ fontSize: '11px', color: '#3B82F6', marginTop: '4px' }}>
                        A-Level {t.paper_number ? `Paper ${t.paper_number}` : ''}
                      </div>
                    )}
                    {t.exam_system === 'milliy_sertifikat' && (
                      <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px', fontWeight: 'bold' }}>
                        Milliy Sertifikat
                      </div>
                    )}
                    {t.exam_system === 'sat' && (
                      <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '4px', fontWeight: 'bold' }}>
                        SAT
                      </div>
                    )}
                    {t.exam_system === 'ielts' && (
                      <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', fontWeight: 'bold' }}>
                        IELTS
                      </div>
                    )}
                    {t.exam_system === 'ap' && (
                      <div style={{ fontSize: '11px', color: '#8B5CF6', marginTop: '4px', fontWeight: 'bold' }}>
                        Advanced Placement (AP)
                      </div>
                    )}
                  </td>
                  <td>{t.subject}</td>
                  <td>{t.duration_minutes} min</td>
                  <td>{t.question_count} ta</td>
                  <td>
                    <div style={{ fontSize: '12px', color: 'rgba(15, 23, 42, 0.4)' }}>
                      {t.available_from ? new Date(t.available_from).toLocaleString() : 'Cheksiz'} - <br />
                      {t.available_until ? new Date(t.available_until).toLocaleString() : 'Cheksiz'}
                    </div>
                  </td>
                  <td>
                    {t.is_premium ? (
                      <span className="role-badge" style={{ background: 'rgba(245,158,11,0.1)', color: '#2563EB', border: '1px solid rgba(245,158,11,0.2)' }}>PREMIUM</span>
                    ) : (
                      <span className="role-badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#2563EB', border: '1px solid rgba(16,185,129,0.2)' }}>BEPUL</span>
                    )}
                  </td>
                  <td>
                    <button className="icon-btn text-blue" title="Savollarni Boshqarish" onClick={() => setManagingTest(t)}>
                      <Settings size={16} />
                    </button>
                    <button className="icon-btn text-muted ml-2" title={t.is_hidden ? "Ko'rsatish" : "Yashirish"} onClick={() => toggleVisibility(t)}>
                      {t.is_hidden ? <EyeOff size={16} color="#94A3B8" /> : <Eye size={16} />}
                    </button>
                    <button
                      className="icon-btn text-muted ml-2"
                      title="Tahrirlash"
                      onClick={() => {
                        setEditingTestId(t.id);
                        setFormData({
                          title: t.title,
                          subject: t.subject,
                          dtm_main1: t.exam_system === 'dtm' ? (t.subject || '').split('|')[0] || '' : '',
                          dtm_main2: t.exam_system === 'dtm' ? (t.subject || '').split('|')[1] || '' : '',
                          duration_minutes: t.duration_minutes,
                          question_count: t.question_count,
                          is_premium: t.is_premium || false,
                          available_from: t.available_from ? t.available_from.slice(0, 16) : '',
                          available_until: t.available_until ? t.available_until.slice(0, 16) : '',
                          exam_system: t.exam_system || 'dtm',
                          paper_number: t.paper_number || '',
                          variant_name: t.exam_system === 'alevel' ? t.title.split(' - Paper')[0] : ''
                        });
                        setIsModalOpen(true);
                      }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button className="icon-btn text-red ml-2" title="O'chirish" onClick={() => handleDelete(t.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {tests.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'rgba(15, 23, 42, 0.5)' }}>
                    Testlar topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {!loading && totalPages > 1 && (
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              style={{ padding: '6px 12px', background: '#0F172A', color: 'white', border: 'none', borderRadius: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
            >Oldingi</button>
            <span style={{ padding: '6px 12px', color: 'rgba(15, 23, 42, 0.4)' }}>{currentPage} / {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              style={{ padding: '6px 12px', background: '#0F172A', color: 'white', border: 'none', borderRadius: '4px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
            >Keyingi</button>
          </div>
        )}
      </div>

      {/* Add Test Modal via Portal to escape CSS transforms */}
      {isModalOpen && createPortal(
        <div className="admin-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
          <div className="admin-panel" style={{ width: '100%', maxWidth: '500px', padding: '32px', margin: 'auto' }}>
            <h2 style={{ marginBottom: '24px' }}>{editingTestId ? 'Testni Tahrirlash' : 'Yangi Mock Test'}</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {formData.exam_system !== 'alevel' && (
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'rgba(15, 23, 42, 0.6)' }}>Test Nomi</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.1)', background: '#FFFFFF', color: '#0F172A' }} />
                </div>
              )}

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'rgba(15, 23, 42, 0.6)' }}>Fan (Yo'nalish)</label>
                {formData.exam_system === 'milliy_sertifikat' ? (
                  <select required value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.1)', background: '#FFFFFF', color: '#0F172A' }}>
                    <option value="">Fanni tanlang</option>
                    {MILLIY_SERTIFIKAT_SUBJECTS.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                ) : formData.exam_system === 'dtm' ? (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <select required value={formData.dtm_main1} onChange={e => setFormData({ ...formData, dtm_main1: e.target.value })} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.1)', background: '#FFFFFF', color: '#0F172A' }}>
                      <option value="">1-Asosiy fan</option>
                      {MILLIY_SERTIFIKAT_SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                    <select required value={formData.dtm_main2} onChange={e => setFormData({ ...formData, dtm_main2: e.target.value })} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.1)', background: '#FFFFFF', color: '#0F172A' }}>
                      <option value="">2-Asosiy fan</option>
                      {MILLIY_SERTIFIKAT_SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                  </div>
                ) : (
                  <input required type="text" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} placeholder="Masalan: O'zbek tili" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.1)', background: '#FFFFFF', color: '#0F172A' }} />
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'rgba(15, 23, 42, 0.6)' }}>Imtihon Tizimi</label>
                  <select value={formData.exam_system} onChange={e => {
                    const newSystem = e.target.value;
                    if (newSystem === 'milliy_sertifikat') {
                      setFormData({ ...formData, exam_system: newSystem, duration_minutes: 150, question_count: 45, subject: MILLIY_SERTIFIKAT_SUBJECTS[0] });
                    } else if (newSystem === 'dtm') {
                      setFormData({ ...formData, exam_system: newSystem, duration_minutes: 180, question_count: 90, subject: '' });
                    } else if (newSystem === 'alevel') {
                      setFormData({ ...formData, exam_system: newSystem, subject: '' });
                    } else {
                      setFormData({ ...formData, exam_system: newSystem, subject: '' });
                    }
                  }} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.1)', background: '#FFFFFF' }}>
                    <option value="dtm">DTM / Standart</option>
                    <option value="alevel">Cambridge A-Level</option>
                    <option value="milliy_sertifikat">Milliy Sertifikat</option>
                    <option value="sat">SAT</option>
                    <option value="ielts">IELTS</option>
                    <option value="ap">Advanced Placement (AP)</option>
                  </select>
                </div>
                {formData.exam_system === 'alevel' && (
                  <>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'rgba(15, 23, 42, 0.6)' }}>Variant (Masalan: Mock 1, 2024)</label>
                      <input required type="text" value={formData.variant_name} onChange={e => setFormData({ ...formData, variant_name: e.target.value })} placeholder="Mock 1" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.1)', background: '#FFFFFF', color: '#0F172A' }} />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'rgba(15, 23, 42, 0.6)' }}>Paper Raqami</label>
                      <input required type="number" value={formData.paper_number} onChange={e => setFormData({ ...formData, paper_number: e.target.value })} placeholder="1, 3, 4, 5..." style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.1)', background: '#FFFFFF', color: '#0F172A' }} />
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'rgba(15, 23, 42, 0.6)' }}>Vaqti (minut)</label>
                  <input required type="number" value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.1)', background: '#FFFFFF', color: '#0F172A' }} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'rgba(15, 23, 42, 0.6)' }}>Savollar soni</label>
                  <input required type="number" value={formData.question_count} onChange={e => setFormData({ ...formData, question_count: parseInt(e.target.value) })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.1)', background: '#FFFFFF', color: '#0F172A' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'rgba(15, 23, 42, 0.6)' }}>Boshlanish vaqti (Ixtiyoriy)</label>
                  <input type="datetime-local" value={formData.available_from} onChange={e => setFormData({ ...formData, available_from: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.1)', background: '#FFFFFF', color: '#0F172A' }} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'rgba(15, 23, 42, 0.6)' }}>Tugash vaqti (Ixtiyoriy)</label>
                  <input type="datetime-local" value={formData.available_until} onChange={e => setFormData({ ...formData, available_until: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.1)', background: '#FFFFFF', color: '#0F172A' }} />
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                <input type="checkbox" id="premium" checked={formData.is_premium} onChange={e => setFormData({ ...formData, is_premium: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                <label htmlFor="premium" style={{ color: '#0F172A', fontWeight: '500' }}>Faqat Premium (Pullik) ta'rif uchun</label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingTestId(null); }} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.2)', background: 'transparent', color: '#0F172A', cursor: 'pointer', fontWeight: '600' }}>Bekor qilish</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#2563EB', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Saqlash</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
