import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Save, Trash2, Edit2, Sparkles, CheckSquare, X, Check, AlertTriangle, Plus, Image as ImageIcon, FileSpreadsheet, FileText } from 'lucide-react';
import MathText from '../../../components/MathText';
import * as XLSX from 'xlsx';

export default function AdminQuestionsManager({ test, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  
  const [activeTab, setActiveTab] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  const [bulkTopic, setBulkTopic] = useState('');
  const [bulkDifficulty, setBulkDifficulty] = useState('medium');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const [editingQuestion, setEditingQuestion] = useState(null);
  
  const excelInputRef = useRef(null);

  useEffect(() => {
    fetchQuestions();
  }, [test.id]);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data } = await supabase.from('questions').select('*').eq('test_id', test.id).order('order_num');
    if (data) setQuestions(data);
    setLoading(false);
    setSelectedIds(new Set());
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      alert("Faqat PDF formatdagi fayllarni yuklang.");
      e.target.value = '';
      return;
    }

    setUploading(true);
    setUploadStatus('PDF yuklanmoqda...');
    try {
      if (typeof window.pdfjsLib === 'undefined') {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
          document.head.appendChild(script);
          script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            resolve();
          };
          script.onerror = reject;
        });
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({data: arrayBuffer}).promise;
      
      let allParsedQuestions = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        setUploadStatus(`Sahifa ${i} / ${pdf.numPages} tayyorlanmoqda...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        
        const pageBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        setUploadStatus(`Sahifa ${i} / ${pdf.numPages} tahlil qilinmoqda (AI)...`);
        
        const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : '');
        const detectRes = await fetch(`${apiUrl}/api/detect-boxes`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + ((await supabase.auth.getSession()).data.session?.access_token || '')
          },
          body: JSON.stringify({ pageBase64 })
        });
        const detectData = await detectRes.json();
        if (!detectRes.ok) throw new Error(detectData.error || 'Detection failed');
        
        let boxes = detectData.boxes || [];
        // Sort boxes generally top-to-bottom
        boxes.sort((a, b) => a.ymin - b.ymin);
        
        for (let j = 0; j < boxes.length; j++) {
          const box = boxes[j];
          if (!box.isValid) continue;
          
          setUploadStatus(`Sahifa ${i}: Savol ${j+1}/${boxes.length} o'qilmoqda...`);
          
          const cropCanvas = document.createElement('canvas');
          const x0 = Math.floor((box.xmin / 1000) * canvas.width);
          const y0 = Math.floor((box.ymin / 1000) * canvas.height);
          const x1 = Math.ceil((box.xmax / 1000) * canvas.width);
          const y1 = Math.ceil((box.ymax / 1000) * canvas.height);
          
          const w = x1 - x0;
          const h = y1 - y0;
          
          if (w <= 0 || h <= 0 || isNaN(w) || isNaN(h)) continue;
          
          cropCanvas.width = w;
          cropCanvas.height = h;
          const cropCtx = cropCanvas.getContext('2d');
          cropCtx.drawImage(canvas, x0, y0, w, h, 0, 0, w, h);
          
          const cropBase64 = cropCanvas.toDataURL('image/jpeg', 0.9).split(',')[1];
          
          const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : '');
          const parseRes = await fetch(`${apiUrl}/api/parse-cropped`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + ((await supabase.auth.getSession()).data.session?.access_token || '')
            },
            body: JSON.stringify({ imageBase64: cropBase64 })
          });
          const parseData = await parseRes.json();
          if (parseRes.ok && parseData.question) {
             allParsedQuestions.push(parseData.question);
          }
          
          // Strict 4-second delay to safely stay under the 15 RPM Free Tier limit
          await new Promise(r => setTimeout(r, 4000));
        }
      }

      if (allParsedQuestions.length > 0) {
        const newQs = allParsedQuestions.map((q, idx) => ({
          ...q,
          id: `temp-${Date.now()}-${idx}`,
          isNew: true,
          status: 'pending_review',
          order_num: questions.length + idx + 1
        }));
        setQuestions(prev => [...prev, ...newQs]);
        setActiveTab('pending_review');
        alert(`${newQs.length} ta savol topildi! Iltimos, ularni ko'rib chiqing va saqlang.`);
      } else {
        alert("Hech qanday savol topilmadi yoki AI aniqlay olmadi.");
      }
    } catch (err) {
      console.error("Full error:", err);
      alert("Xatolik yuz berdi: " + (err.message || "Server bilan bog'lanishda xatolik."));
    } finally {
      setUploading(false);
      setUploadStatus('');
      e.target.value = '';
    }
  };

  const saveAllToDB = async () => {
    const newQuestions = questions.filter(q => q.isNew);
    if (newQuestions.length === 0) return;

    setLoading(true);
    try {
      const inserts = newQuestions.map(q => ({
        test_id: test.id,
        order_num: q.order_num,
        text: q.text,
        options: q.options,
        correct_option_index: q.correct_option_index,
        explanation_uz: q.explanation_uz,
        explanation_uz: q.explanation_uz,
        explanation_ru: q.explanation_ru,
        points: 1,
        status: 'pending_review',
        question_type: q.question_type || 'mcq',
        image_url: q.image_url || null,
        correct_answer_text: q.correct_answer_text || null
      }));

      const { error } = await supabase.from('questions').insert(inserts);
      if (error) throw error;
      
      alert("Barcha savollar saqlandi!");
      fetchQuestions();
    } catch (err) {
      console.error(err);
      alert("Xatolik: " + err.message);
      setLoading(false);
    }
  };

  const deleteQuestion = async (id, isNew) => {
    if (isNew) {
      setQuestions(prev => prev.filter(q => q.id !== id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    } else {
      if (!window.confirm("Rostdan ham bu savolni o'chirmoqchimisiz?")) return;
      await supabase.from('questions').delete().eq('id', id);
      fetchQuestions();
    }
  };

  const updateStatus = async (id, newStatus) => {
    const q = questions.find(qu => qu.id === id);
    if (q.isNew) {
      setQuestions(prev => prev.map(qu => qu.id === id ? { ...qu, status: newStatus } : qu));
    } else {
      await supabase.from('questions').update({ status: newStatus }).eq('id', id);
      fetchQuestions();
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      const realIds = Array.from(selectedIds).filter(id => !id.startsWith('temp-'));
      if (realIds.length > 0) {
        await supabase.from('questions').update({ topic: bulkTopic, difficulty: bulkDifficulty }).in('id', realIds);
      }
      
      // Update local state for both real and temp
      setQuestions(prev => prev.map(q => {
        if (selectedIds.has(q.id)) {
          return { ...q, topic: bulkTopic, difficulty: bulkDifficulty };
        }
        return q;
      }));
      
      setSelectedIds(new Set());
      setBulkTopic('');
    } catch (err) {
      alert("Xatolik: " + err.message);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error } = await supabase.storage.from('question-images').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('question-images').getPublicUrl(fileName);
      setEditingQuestion(prev => ({...prev, image_url: data.publicUrl}));
    } catch (error) {
      alert("Rasm yuklashda xatolik: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    setUploadStatus('Excel yuklanmoqda...');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        let headerRowIndex = -1;
        for (let i = 0; i < data.length; i++) {
           if (data[i] && data[i].some(cell => typeof cell === 'string' && cell.toLowerCase().includes('savol matni'))) {
             headerRowIndex = i;
             break;
           }
        }
        
        if (headerRowIndex === -1) {
           alert("Excel faylida 'Savol matni' ustuni topilmadi.");
           setUploading(false);
           return;
        }

        const headers = data[headerRowIndex];
        const newQuestions = [];
        for (let i = headerRowIndex + 1; i < data.length; i++) {
           const row = data[i];
           if (!row || row.length === 0) continue;
           
           let qTextUz = '';
           let qTextRu = '';
           let optA = '', optB = '', optC = '', optD = '';
           let ans = '';
           
           for(let j = 0; j < headers.length; j++) {
             const h = (headers[j] || '').toString().toLowerCase();
             const val = row[j] || '';
             if (h.includes("o'zbek tilida") || h.includes("savol matni")) qTextUz = val;
             if (h.includes("на русском языке") || h.includes("текст вопроса")) qTextRu = val;
             if (h.includes("a varianti") || h === 'a') optA = val;
             if (h.includes("b varianti") || h === 'b') optB = val;
             if (h.includes("c varianti") || h === 'c') optC = val;
             if (h.includes("d varianti") || h === 'd') optD = val;
             if (h.includes("to'g'ri javob") || h.includes("ответ") || h.includes("answer")) ans = val;
           }
           
           if (!qTextUz && !qTextRu) continue;
           
           let combinedText = qTextUz;
           if (qTextRu && qTextRu.toString().trim() !== '' && qTextRu !== qTextUz) {
             combinedText += `\n\n(Rus): ${qTextRu}`;
           }
           
           let correctIndex = 0;
           const ansStr = ans.toString().trim().toUpperCase();
           if (ansStr === 'A') correctIndex = 0;
           else if (ansStr === 'B') correctIndex = 1;
           else if (ansStr === 'C') correctIndex = 2;
           else if (ansStr === 'D') correctIndex = 3;
           else {
             if (ansStr === optA.toString().trim().toUpperCase()) correctIndex = 0;
             else if (ansStr === optB.toString().trim().toUpperCase()) correctIndex = 1;
             else if (ansStr === optC.toString().trim().toUpperCase()) correctIndex = 2;
             else if (ansStr === optD.toString().trim().toUpperCase()) correctIndex = 3;
           }
           
           newQuestions.push({
              id: `temp-excel-${Date.now()}-${i}`,
              isNew: true,
              order_num: questions.length + newQuestions.length + 1,
              text: combinedText,
              options: [optA.toString(), optB.toString(), optC.toString(), optD.toString()],
              correct_option_index: correctIndex,
              explanation_uz: '',
              explanation_ru: '',
              topic: '',
              difficulty: 'medium',
              question_type: 'mcq',
              image_url: '',
              correct_answer_text: '',
              status: 'pending_review'
           });
        }
        
        if (newQuestions.length > 0) {
           setQuestions(prev => [...prev, ...newQuestions]);
           setActiveTab('pending_review');
        } else {
           alert("Hech qanday savol topilmadi.");
        }
        
      } catch (e) {
        console.error(e);
        alert("Excel faylini o'qishda xatolik yuz berdi.");
      }
      setUploading(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleMainPdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      alert("Faqat PDF formatdagi fayllarni yuklang.");
      e.target.value = '';
      return;
    }
    setUploading(true);
    setUploadStatus('Asosiy fayl saqlanmoqda...');
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${test.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('question-images').upload(`test-pdfs/${fileName}`, file);
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('question-images').getPublicUrl(`test-pdfs/${fileName}`);
      
      const { error: updateError } = await supabase.from('mock_tests').update({ pdf_url: data.publicUrl }).eq('id', test.id);
      if (updateError) throw updateError;
      
      alert("Asosiy PDF fayl muvaffaqiyatli saqlandi! Endi u o'quvchilarga test oynasida ko'rinadi.");
    } catch (error) {
      alert("Xatolik yuz berdi: " + error.message);
    } finally {
      setUploading(false);
      setUploadStatus('');
      e.target.value = '';
    }
  };

  const handleAddNew = () => {
    setEditingQuestion({
      id: `temp-${Date.now()}`,
      isNew: true,
      isManualNew: true,
      order_num: questions.length + 1,
      text: '',
      options: ['', '', '', ''],
      correct_option_index: 0,
      explanation_uz: '',
      explanation_ru: '',
      topic: '',
      difficulty: 'medium',
      question_type: 'mcq',
      image_url: '',
      correct_answer_text: '',
      status: 'pending_review'
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (editingQuestion.isManualNew) {
      const { isManualNew, ...qToSave } = editingQuestion;
      setQuestions(prev => [...prev, qToSave]);
      setActiveTab('pending_review');
      setEditingQuestion(null);
    } else if (editingQuestion.isNew) {
      setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? editingQuestion : q));
      setEditingQuestion(null);
    } else {
      try {
        const { id, isNew, created_at, isManualNew, ...updateData } = editingQuestion;
        await supabase.from('questions').update(updateData).eq('id', id);
        fetchQuestions();
        setEditingQuestion(null);
      } catch (err) {
        alert("Xatolik: " + err.message);
      }
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const filteredQuestions = questions.filter(q => {
    if (activeTab === 'all') return true;
    return q.status === activeTab;
  });

  return (
    <div style={{ padding: '24px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid rgba(15, 23, 42, 0.05)', minHeight: '100%' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#0F172A', fontWeight: '600', cursor: 'pointer', marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Ortga qaytish
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', color: '#0F172A', marginBottom: '4px' }}>{test.title}</h2>
          <p style={{ color: 'rgba(15, 23, 42, 0.6)', fontSize: '14px' }}>Savollarni boshqarish ({questions.length} ta savol)</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input 
            type="file" 
            id="main-pdf-upload" 
            accept="application/pdf" 
            style={{ display: 'none' }} 
            onChange={handleMainPdfUpload}
            disabled={uploading}
          />
          <label 
            htmlFor="main-pdf-upload"
            className="exam-btn-outline" 
            style={{ color: '#0F172A', borderColor: 'rgba(15, 23, 42, 0.3)', background: 'transparent', display: 'flex', alignItems: 'center', cursor: uploading ? 'wait' : 'pointer' }}
          >
            {uploading && uploadStatus.includes('Asosiy') ? uploadStatus : <><FileText size={16} /> Asosiy PDF biriktirish</>}
          </label>

          <input 
            type="file" 
            accept=".xlsx, .xls" 
            style={{ display: 'none' }} 
            ref={excelInputRef}
            onChange={handleExcelUpload}
            disabled={uploading}
          />
          <button 
            className="exam-btn-outline" 
            onClick={() => excelInputRef.current?.click()}
            style={{ color: '#16A34A', borderColor: 'rgba(22, 163, 74, 0.3)', background: 'rgba(22, 163, 74, 0.05)', display: 'flex', alignItems: 'center', cursor: uploading ? 'wait' : 'pointer' }}
            disabled={uploading}
          >
            <FileSpreadsheet size={16} /> {uploading && uploadStatus.includes('Excel') ? uploadStatus : 'Excel orqali yuklash'}
          </button>

          <input 
            type="file" 
            id="pdf-upload" 
            accept="application/pdf" 
            style={{ display: 'none' }} 
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <label 
            htmlFor="pdf-upload"
            className="exam-btn-outline" 
            style={{ color: '#2563EB', borderColor: 'rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', cursor: uploading ? 'wait' : 'pointer' }}
          >
            {uploading && uploadStatus.includes('PDF') ? uploadStatus : <><Sparkles size={16} /> AI orqali PDF yuklash</>}
          </label>

          <button 
            className="exam-btn-outline" 
            onClick={handleAddNew}
            style={{ color: '#0F172A', borderColor: 'rgba(15, 23, 42, 0.2)', background: 'transparent', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <Plus size={16} /> Qo'lda savol qo'shish
          </button>

          {questions.some(q => q.isNew) && (
            <button className="exam-btn-primary" onClick={saveAllToDB} style={{ background: '#2563EB' }}>
              <Save size={16} /> Yangi savollarni saqlash
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(15, 23, 42, 0.1)', marginBottom: '24px' }}>
        <button onClick={() => setActiveTab('all')} style={{ background: 'none', border: 'none', color: activeTab === 'all' ? '#2563EB' : 'rgba(15, 23, 42, 0.4)', borderBottom: activeTab === 'all' ? '2px solid #2563EB' : '2px solid transparent', padding: '0 0 12px 0', cursor: 'pointer', fontWeight: 600 }}>
          Barchasi ({questions.length})
        </button>
        <button onClick={() => setActiveTab('pending_review')} style={{ background: 'none', border: 'none', color: activeTab === 'pending_review' ? '#2563EB' : 'rgba(15, 23, 42, 0.4)', borderBottom: activeTab === 'pending_review' ? '2px solid #2563EB' : '2px solid transparent', padding: '0 0 12px 0', cursor: 'pointer', fontWeight: 600 }}>
          Kutilmoqda ({questions.filter(q => q.status === 'pending_review').length})
        </button>
        <button onClick={() => setActiveTab('published')} style={{ background: 'none', border: 'none', color: activeTab === 'published' ? '#2563EB' : 'rgba(15, 23, 42, 0.4)', borderBottom: activeTab === 'published' ? '2px solid #2563EB' : '2px solid transparent', padding: '0 0 12px 0', cursor: 'pointer', fontWeight: 600 }}>
          Nashr qilingan ({questions.filter(q => q.status === 'published').length})
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: 'rgba(37, 99, 235, 0.2)', fontWeight: 600 }}>{selectedIds.size} ta savol tanlandi</div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Mavzuni kiritish" 
              value={bulkTopic}
              onChange={e => setBulkTopic(e.target.value)}
              style={{ background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.2)', color: '#0F172A', padding: '8px 12px', borderRadius: '6px' }}
            />
            <select 
              value={bulkDifficulty} 
              onChange={e => setBulkDifficulty(e.target.value)}
              style={{ background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.2)', color: '#0F172A', padding: '8px 12px', borderRadius: '6px' }}
            >
              <option value="easy">Oson</option>
              <option value="medium">O'rtacha</option>
              <option value="hard">Qiyin</option>
            </select>
            <button 
              onClick={handleBulkUpdate}
              disabled={isBulkUpdating}
              style={{ background: '#2563EB', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckSquare size={16} /> Qo'llash
            </button>
          </div>
        </div>
      )}

      {loading && !uploading && <div style={{ color: 'rgba(15, 23, 42, 0.4)' }}>Yuklanmoqda...</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredQuestions.map((q) => (
          <div key={q.id} style={{ background: '#F8FAFC', padding: '24px', borderRadius: '12px', border: q.isNew ? '1px dashed #2563EB' : '1px solid rgba(15, 23, 42, 0.1)', position: 'relative' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="checkbox" 
                  checked={selectedIds.has(q.id)}
                  onChange={() => toggleSelect(q.id)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ color: '#2563EB', fontWeight: 'bold' }}>Savol {q.order_num}</span>
                {q.isNew && <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#2563EB', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>SAQLANMAGAN</span>}
                <span style={{ background: q.status === 'published' ? 'rgba(16, 185, 129, 0.1)' : q.status === 'draft' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: q.status === 'published' ? '#2563EB' : q.status === 'draft' ? '#0F172A' : '#2563EB', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {q.status || 'published'}
                </span>
                {q.topic && <span style={{ background: 'rgba(15, 23, 42, 0.05)', color: 'rgba(15, 23, 42, 0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>{q.topic}</span>}
                {q.difficulty && <span style={{ background: 'rgba(15, 23, 42, 0.05)', color: 'rgba(15, 23, 42, 0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>{q.difficulty}</span>}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {q.status === 'pending_review' && (
                  <button onClick={() => updateStatus(q.id, 'published')} style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#2563EB', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                    <Check size={14} /> Tasdiqlash
                  </button>
                )}
                {q.status === 'pending_review' && (
                  <button onClick={() => updateStatus(q.id, 'draft')} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#0F172A', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                    <X size={14} /> Qaytarish
                  </button>
                )}
                <button onClick={() => setEditingQuestion(q)} style={{ background: 'none', border: 'none', color: 'rgba(15, 23, 42, 0.4)', cursor: 'pointer' }} title="Tahrirlash">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => deleteQuestion(q.id, q.isNew)} style={{ background: 'none', border: 'none', color: '#0F172A', cursor: 'pointer' }} title="O'chirish">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            {q.image_url && (
              <div style={{ marginBottom: '16px' }}>
                <img src={q.image_url} alt="Savol rasmi" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} />
              </div>
            )}
            <div style={{ color: '#0F172A', marginBottom: '24px', fontSize: '16px', lineHeight: '1.5' }}><MathText>{q.text}</MathText></div>
            
            {q.question_type === 'written' || q.question_type === 'essay' ? (
              <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #2563EB', borderRadius: '8px', color: '#0F172A', fontSize: '14px' }}>
                <strong>To'g'ri javob:</strong> {q.correct_answer_text || (q.question_type === 'essay' ? 'Esse' : '')}
              </div>
            ) : q.question_type === 'multipart_ab' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #2563EB', borderRadius: '8px', color: '#0F172A', fontSize: '14px' }}>
                  <strong>A qismi to'g'ri javobi:</strong> {(() => {
                    try { return <MathText>{JSON.parse(q.correct_answer_text).a || '-'}</MathText>; } catch(e) { return <MathText>{q.correct_answer_text}</MathText>; }
                  })()}
                </div>
                <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #2563EB', borderRadius: '8px', color: '#0F172A', fontSize: '14px' }}>
                  <strong>B qismi to'g'ri javobi:</strong> {(() => {
                    try { return <MathText>{JSON.parse(q.correct_answer_text).b || '-'}</MathText>; } catch(e) { return '-'; }
                  })()}
                </div>
              </div>
            ) : q.question_type === 'matching' ? (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {q.options && q.options.map((opt, i) => (
                  <div key={i} style={{ padding: '12px 16px', background: q.correct_option_index === i ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.03)', border: `1px solid ${q.correct_option_index === i ? '#2563EB' : 'transparent'}`, borderRadius: '8px', color: '#0F172A', fontSize: '14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: q.correct_option_index === i ? '#2563EB' : 'rgba(15, 23, 42, 0.5)', fontWeight: 'bold' }}>{String.fromCharCode(65 + i)}</span>
                    {opt && <div style={{ flex: 1 }}><MathText>{opt}</MathText></div>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {q.options && q.options.map((opt, i) => (
                <div key={i} style={{ padding: '12px', background: q.correct_option_index === i ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.03)', border: `1px solid ${q.correct_option_index === i ? '#2563EB' : 'transparent'}`, borderRadius: '8px', color: '#0F172A', fontSize: '14px', display: 'flex', gap: '8px' }}>
                  <span style={{ color: q.correct_option_index === i ? '#2563EB' : 'rgba(15, 23, 42, 0.5)', fontWeight: 'bold' }}>{['A', 'B', 'C', 'D'][i] ? ['A', 'B', 'C', 'D'][i] + '.' : ''}</span>
                  <div style={{ flex: 1 }}><MathText>{opt}</MathText></div>
                </div>
              ))}
            </div>
            )}
          </div>
        ))}
        
        {!loading && filteredQuestions.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', border: '2px dashed rgba(15, 23, 42, 0.1)', borderRadius: '16px', color: 'rgba(15, 23, 42, 0.5)' }}>
            Savollar topilmadi.
          </div>
        )}
      </div>

      {editingQuestion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', borderRadius: '16px', border: '1px solid rgba(15, 23, 42, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ color: '#0F172A', margin: 0 }}>Savolni tahrirlash</h2>
              <button onClick={() => setEditingQuestion(null)} style={{ background: 'none', border: 'none', color: 'rgba(15, 23, 42, 0.6)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ color: '#2563EB' }}><AlertTriangle size={20} /></div>
              <div style={{ fontSize: '13px', color: '#0F172A', lineHeight: '1.5' }}>
                <strong style={{ color: '#2563EB', display: 'block', marginBottom: '4px' }}>Mahalliylashtirish qoidasi</strong>
                Platforma ikki tilda ishlayotgani uchun savol matnini ham O'zbek, ham Rus tilida kiritayotganingizga ishonch hosil qiling. Agar alohida maydon bo'lmasa, matnni: <em style={{color:'#0F172A'}}>"O'zbekcha matn / Русский текст"</em> ko'rinishida kiriting.
              </div>
            </div>
            
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(15, 23, 42, 0.6)', marginBottom: '8px', fontSize: '14px' }}>Savol matni</label>
                <textarea 
                  required
                  rows="4"
                  value={editingQuestion.text}
                  onChange={e => setEditingQuestion({...editingQuestion, text: e.target.value})}
                  style={{ width: '100%', background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.1)', color: '#0F172A', padding: '12px', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: 'rgba(15, 23, 42, 0.6)', marginBottom: '8px', fontSize: '14px' }}>Rasm yuklash (Ixtiyoriy)</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input 
                      type="file" 
                      id="img-upload" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    <label 
                      htmlFor="img-upload"
                      style={{ padding: '8px 12px', background: 'rgba(15, 23, 42, 0.05)', borderRadius: '8px', cursor: uploadingImage ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
                    >
                      <ImageIcon size={16} /> {uploadingImage ? 'Yuklanmoqda...' : 'Rasm tanlash'}
                    </label>
                    {editingQuestion.image_url && <span style={{ color: '#10B981', fontSize: '12px', fontWeight: 'bold' }}>✓ Rasm biriktirildi</span>}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', color: 'rgba(15, 23, 42, 0.6)', marginBottom: '8px', fontSize: '14px' }}>Savol turi</label>
                  <select 
                    value={editingQuestion.question_type || 'mcq'}
                    onChange={e => {
                      const val = e.target.value;
                      let newOpts = [...(editingQuestion.options || [])];
                      if (val === 'matching') {
                        while (newOpts.length < 6) newOpts.push('');
                      } else if (val === 'mcq') {
                        newOpts = newOpts.slice(0, 4);
                        if (editingQuestion.correct_option_index >= 4) editingQuestion.correct_option_index = 0;
                      }
                      setEditingQuestion({...editingQuestion, question_type: val, options: newOpts});
                    }}
                    style={{ width: '100%', background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.1)', color: '#0F172A', padding: '12px', borderRadius: '8px' }}
                  >
                    <option value="mcq">Variantli (A,B,C,D)</option>
                    <option value="written">Yozma javob (Ochiq savol)</option>
                    <option value="multipart_ab">Ikkita qismli yozma (A, B)</option>
                    <option value="matching">Moslashtirish (A-F)</option>
                    <option value="essay">Esse yozish (AI orqali baholanadi)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: 'rgba(15, 23, 42, 0.6)', marginBottom: '8px', fontSize: '14px' }}>Mavzu (Topic)</label>
                  <input 
                    type="text"
                    value={editingQuestion.topic || ''}
                    onChange={e => setEditingQuestion({...editingQuestion, topic: e.target.value})}
                    style={{ width: '100%', background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.1)', color: '#0F172A', padding: '12px', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'rgba(15, 23, 42, 0.6)', marginBottom: '8px', fontSize: '14px' }}>Qiyinlik darajasi</label>
                  <select 
                    value={editingQuestion.difficulty || 'medium'}
                    onChange={e => setEditingQuestion({...editingQuestion, difficulty: e.target.value})}
                    style={{ width: '100%', background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.1)', color: '#0F172A', padding: '12px', borderRadius: '8px' }}
                  >
                    <option value="easy">Oson</option>
                    <option value="medium">O'rtacha</option>
                    <option value="hard">Qiyin</option>
                  </select>
                </div>
              </div>

              {editingQuestion.question_type !== 'written' && editingQuestion.question_type !== 'essay' && editingQuestion.question_type !== 'multipart_ab' && (
              <div>
                <label style={{ display: 'block', color: 'rgba(15, 23, 42, 0.6)', marginBottom: '8px', fontSize: '14px' }}>Variantlar {editingQuestion.question_type === 'matching' ? '(A-F)' : ''}</label>
                {editingQuestion.options.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: 'rgba(15,23,42,0.5)', width: '20px' }}>{String.fromCharCode(65 + idx)}</span>
                    <input 
                      type="radio" 
                      name="correct_option" 
                      checked={editingQuestion.correct_option_index === idx}
                      onChange={() => setEditingQuestion({...editingQuestion, correct_option_index: idx})}
                    />
                    <input 
                      type="text"
                      value={opt}
                      placeholder={editingQuestion.question_type === 'matching' ? "Ixtiyoriy matn (yoki bo'sh qoldiring)" : ""}
                      onChange={e => {
                        const newOpts = [...editingQuestion.options];
                        newOpts[idx] = e.target.value;
                        setEditingQuestion({...editingQuestion, options: newOpts});
                      }}
                      style={{ flex: 1, background: '#FFFFFF', border: editingQuestion.correct_option_index === idx ? '1px solid #2563EB' : '1px solid rgba(15, 23, 42, 0.1)', color: '#0F172A', padding: '12px', borderRadius: '8px' }}
                    />
                  </div>
                ))}
              </div>
              )}
              
              {editingQuestion.question_type === 'essay' && (
              <div style={{ background: '#ECFDF5', border: '1px solid #10B981', padding: '12px', borderRadius: '8px', color: '#047857', fontSize: '13px' }}>
                <strong>Esse Savoli:</strong> O'quvchi bu savolga duch kelganda maxsus esse yozish maydoni ochiladi. Siz "Savol matni" ga esse mavzusini yozishingiz kifoya.
              </div>
              )}
              
              {editingQuestion.question_type === 'written' && (
              <div>
                <label style={{ display: 'block', color: 'rgba(15, 23, 42, 0.6)', marginBottom: '8px', fontSize: '14px' }}>To'g'ri javob matni (Ko'proq javoblarni vergul bilan ajratib yozing: qirq besh, 45, olma)</label>
                <input 
                  type="text"
                  required
                  value={editingQuestion.correct_answer_text || ''}
                  onChange={e => setEditingQuestion({...editingQuestion, correct_answer_text: e.target.value})}
                  style={{ width: '100%', background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.1)', color: '#0F172A', padding: '12px', borderRadius: '8px' }}
                />
              </div>
              )}

              {editingQuestion.question_type === 'multipart_ab' && (() => {
                let mAns = { a: '', b: '' };
                try { if(editingQuestion.correct_answer_text) mAns = JSON.parse(editingQuestion.correct_answer_text); } catch(e) {}
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(15, 23, 42, 0.6)', marginBottom: '8px', fontSize: '14px' }}>A qismi to'g'ri javobi</label>
                      <input 
                        type="text"
                        required
                        value={mAns.a || ''}
                        onChange={e => {
                          const nAns = { ...mAns, a: e.target.value };
                          setEditingQuestion({...editingQuestion, correct_answer_text: JSON.stringify(nAns)});
                        }}
                        style={{ width: '100%', background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.1)', color: '#0F172A', padding: '12px', borderRadius: '8px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(15, 23, 42, 0.6)', marginBottom: '8px', fontSize: '14px' }}>B qismi to'g'ri javobi</label>
                      <input 
                        type="text"
                        required
                        value={mAns.b || ''}
                        onChange={e => {
                          const nAns = { ...mAns, b: e.target.value };
                          setEditingQuestion({...editingQuestion, correct_answer_text: JSON.stringify(nAns)});
                        }}
                        style={{ width: '100%', background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.1)', color: '#0F172A', padding: '12px', borderRadius: '8px' }}
                      />
                    </div>
                  </div>
                );
              })()}

              <div>
                <label style={{ display: 'block', color: 'rgba(15, 23, 42, 0.6)', marginBottom: '8px', fontSize: '14px' }}>Tushuntirish (O'zbek tili)</label>
                <textarea 
                  rows="2"
                  value={editingQuestion.explanation_uz || ''}
                  onChange={e => setEditingQuestion({...editingQuestion, explanation_uz: e.target.value})}
                  style={{ width: '100%', background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.1)', color: '#0F172A', padding: '12px', borderRadius: '8px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'rgba(15, 23, 42, 0.6)', marginBottom: '8px', fontSize: '14px' }}>Tushuntirish (Rus tili)</label>
                <textarea 
                  rows="2"
                  value={editingQuestion.explanation_ru || ''}
                  onChange={e => setEditingQuestion({...editingQuestion, explanation_ru: e.target.value})}
                  style={{ width: '100%', background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.1)', color: '#0F172A', padding: '12px', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setEditingQuestion(null)} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(15, 23, 42, 0.2)', color: '#0F172A', cursor: 'pointer', fontWeight: '600' }}>Bekor qilish</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#2563EB', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
