'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const EDITABLE_FIELDS = ['service_name', 'directorate', 'department', 'unit', 'required_documents', 'fees', 'notes'];

const OPTIONAL_FIELDS = new Set(['unit', 'fees', 'notes']);

const FIELD_META = {
  service_name:       { ar: { label: 'اسم الخدمة',          placeholder: 'أدخل اسم الخدمة…'          }, en: { label: 'Service Name',      placeholder: 'Enter service name…'      } },
  directorate:        { ar: { label: 'المديرية',             placeholder: 'أدخل المديرية…'             }, en: { label: 'Directorate',        placeholder: 'Enter directorate…'        } },
  department:         { ar: { label: 'المصلحة',             placeholder: 'أدخل المصلحة…'              }, en: { label: 'Department',         placeholder: 'Enter department…'         } },
  unit:               { ar: { label: 'الدائرة',             placeholder: 'أدخل الدائرة…'              }, en: { label: 'Unit',               placeholder: 'Enter unit…'               } },
  required_documents: { ar: { label: 'المستندات المطلوبة',   placeholder: 'أدخل المستندات المطلوبة…'   }, en: { label: 'Required Documents', placeholder: 'Enter required documents…' } },
  fees:               { ar: { label: 'الرسوم',               placeholder: 'أدخل الرسوم…'               }, en: { label: 'Fees',               placeholder: 'Enter fees…'               } },
  notes:              { ar: { label: 'ملاحظات',              placeholder: 'أدخل الملاحظات…'            }, en: { label: 'Notes',              placeholder: 'Enter notes…'              } },
};

const COMPACT_FIELDS = new Set(['service_name', 'directorate', 'department', 'unit', 'fees']);

const COPY = {
  ar: {
    switchToArabic: 'AR',
    switchToEnglish: 'EN',
    title: 'لوحة تدقيق خدمات وزارة الاقتصاد والتجارة',
    exportCorrectedJSON: 'تصدير JSON المصحّح',
    pending: 'قيد المراجعة',
    searchPlaceholder: 'ابحث في الخدمات…',
    allRecords: 'كل الخدمات',
    saved: 'محفوظ',
    records: 'الخدمات',
    shown: 'ظاهر',
    noMatchingRecords: 'لا توجد سجلات مطابقة.',
    selectRecord: 'اختر سجلاً',
    recordOf: (current, total) => `السجل ${current} من ${total}`,
    originalValue: 'القيمة الأصلية',
    complete: 'مكتمل',
    save: 'حفظ',
    fieldRequired: 'هذا الحقل مطلوب',
    resetAllQA: 'إعادة تعيين جميع المحفوظات إلى قيد المراجعة',
    resetRecordEdits: 'إلغاء تعديلات السجل',
    confirmResetMsg: 'هل أنت متأكد من إلغاء التعديلات؟',
    confirmYes: 'نعم',
    confirmNo: 'إلغاء',
    emptySelect: 'اختر سجلاً للبدء بالتدقيق.',
    allDirectorates: 'كل المديريات',
    allDepartments: 'كل الأقسام',
    addService: '+ إضافة خدمة',
    removeService: 'إلغاء الخدمة',
    addServiceTitle: 'إضافة خدمة جديدة',
    serviceNameLabel: 'اسم الخدمة',
    serviceNamePlaceholder: 'أدخل اسم الخدمة…',
    addBtn: 'إضافة',
    cancelService: 'إلغاء الخدمة',
    confirmCancelService: (name) => `هل أنت متأكد من إلغاء "${name}"؟`,
    cancelled: 'ملغى',
    attachForms: '📎 إرفاق المستندات',
    attachFormsHint: 'انقر لاختيار ملف PDF أو Word',
    attachedForms: 'النماذج المرفقة',
    fileTooLarge: (name) => `${name} يتجاوز الحد الأقصى (5MB)`,
    maxAttachments: 'الحد الأقصى 5 مرفقات لكل خدمة',
    invalidFileType: 'يُسمح فقط بملفات PDF وWord',
    downloadAllAttachments: 'تنزيل جميع المرفقات',
    noAttachments: 'لا توجد مرفقات في هذه الوزارة',
    preparingDownload: 'جارٍ تحضير الملفات…',
    downloadComplete: 'اكتمل التنزيل',
    zipFilename: 'مرفقات_الاقتصاد_والتجارة.zip',
    status: { validated: 'محفوظ', no: 'لا', pending: 'قيد المراجعة', cancelled: 'ملغى' }
  },
  en: {
    switchToArabic: 'AR',
    switchToEnglish: 'EN',
    title: 'Economy & Trade Services QA Dashboard',
    exportCorrectedJSON: 'Export corrected JSON',
    pending: 'Pending',
    searchPlaceholder: 'Search services…',
    allRecords: 'All records',
    saved: 'Saved',
    records: 'Records',
    shown: 'shown',
    noMatchingRecords: 'No records match this view.',
    selectRecord: 'Select a record',
    recordOf: (current, total) => `Record ${current} of ${total}`,
    originalValue: 'Original value',
    complete: 'Complete',
    save: 'Save',
    fieldRequired: 'This field is required',
    resetAllQA: 'Reset all saved back to pending',
    resetRecordEdits: 'Reset record edits',
    confirmResetMsg: 'Are you sure you want to reset edits?',
    confirmYes: 'Yes',
    confirmNo: 'Cancel',
    emptySelect: 'Select a record to begin QA.',
    allDirectorates: 'All directorates',
    allDepartments: 'All departments',
    addService: '+ Add Service',
    removeService: 'Cancel Service',
    addServiceTitle: 'Add New Service',
    serviceNameLabel: 'Service Name',
    serviceNamePlaceholder: 'Enter service name…',
    addBtn: 'Add',
    cancelService: 'Cancel Service',
    confirmCancelService: (name) => `Are you sure you want to cancel "${name}"?`,
    cancelled: 'Cancelled',
    attachForms: '📎 Attach Documents',
    attachFormsHint: 'Click to select or drag & drop a PDF / Word file',
    attachedForms: 'Attached Forms',
    fileTooLarge: (name) => `${name} exceeds 5MB limit`,
    maxAttachments: 'Maximum 5 attachments per service',
    invalidFileType: 'Only PDF and Word files are allowed',
    downloadAllAttachments: 'Download All Attachments',
    noAttachments: 'No attachments found for this ministry',
    preparingDownload: 'Preparing download…',
    downloadComplete: 'Download complete',
    zipFilename: 'economy_trade_attachments.zip',
    status: { validated: 'Saved', no: 'No', pending: 'Pending', cancelled: 'Cancelled' }
  }
};

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[ـ]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/^[-–—•\d.\s]+/, '').trim())
    .filter(Boolean)
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function recordKey(index) { return `record-${index}`; }
function statusText(status, labels) {
  if (status === 'validated') return labels.status.validated;
  if (status === 'no') return labels.status.no;
  if (status === 'cancelled') return labels.status.cancelled;
  return labels.status.pending;
}
function statusClass(status) {
  if (status === 'validated') return 'ok';
  if (status === 'no') return 'no';
  if (status === 'cancelled') return 'cancelled';
  return 'pending';
}


function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function cleanSourceRecord(record) {
  const result = { service_code: String(record?.service_code || '') };
  EDITABLE_FIELDS.forEach((f) => { result[f] = String(record?.[f] || ''); });
  return result;
}

function cleanDbRecord(record, fallbackIndex = 0) {
  const index = Number.isInteger(record?.record_index) ? record.record_index : fallbackIndex;
  const result = {
    id: Number(record?.id || index + 1),
    record_index: index,
    source_service_code: String(record?.source_service_code ?? record?.service_code ?? ''),
    service_code: String(record?.service_code || ''),
    updated_at: record?.updated_at || null,
  };
  EDITABLE_FIELDS.forEach((f) => {
    result[`source_${f}`] = String(record?.[`source_${f}`] ?? record?.[f] ?? '');
    result[f] = String(record?.[f] || '');
  });
  result.attachments = Array.isArray(record?.attachments) ? record.attachments : [];
  return result;
}

function initialDbRecords(records) {
  return (Array.isArray(records) ? records : []).map((record, index) => {
    const source = cleanSourceRecord(record);
    const sourceFields = {};
    EDITABLE_FIELDS.forEach((f) => { sourceFields[`source_${f}`] = source[f]; });
    return cleanDbRecord({ id: index + 1, record_index: index, source_service_code: source.service_code, ...sourceFields, ...source }, index);
  });
}

export default function QADashboard({ records }) {
  const initialRecords = useMemo(() => initialDbRecords(records), [records]);

  const [selected, setSelected] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [revertTarget, setRevertTarget] = useState(null);
  const [dbRecords, setDbRecords] = useState(initialRecords);
  const [qa, setQa] = useState({});
  const [, setDatabaseStatus] = useState('جارٍ تحميل قاعدة البيانات…');
  const [toast, setToast] = useState('');
  const [uiLanguage] = useState('ar');
  const [showAdmin, setShowAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [saveErrors, setSaveErrors] = useState(new Set());
  const [resetConfirm, setResetConfirm] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const saveTimers = useRef({});

  const isArabic = uiLanguage === 'ar';
  const t = COPY[uiLanguage];

  const currentRecords = useMemo(() => [...dbRecords].sort((a, b) => a.record_index - b.record_index), [dbRecords]);

  function applyDatabaseState(payload) {
    if (Array.isArray(payload?.records)) setDbRecords(payload.records.map(cleanDbRecord));
    if (payload?.qa && typeof payload.qa === 'object' && !Array.isArray(payload.qa)) setQa(payload.qa);
  }

  async function postDatabaseAction(body, options = {}) {
    const { applyState = false } = options;
    setDatabaseStatus('جارٍ الحفظ في قاعدة البيانات…');
    const response = await fetch('/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'فشل حفظ قاعدة البيانات.');
    if (applyState) applyDatabaseState(payload);
    setDatabaseStatus('تم الحفظ');
    return payload;
  }

  useEffect(() => {
    let cancelled = false;
    async function loadDatabase() {
      try {
        const response = await fetch('/api/database', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'فشل تحميل قاعدة البيانات.');
        if (cancelled) return;
        applyDatabaseState(payload);
        setDatabaseStatus('قاعدة البيانات جاهزة');
      } catch (error) {
        if (!cancelled) setDatabaseStatus(`قاعدة البيانات غير متاحة: ${error.message}`);
      }
    }
    loadDatabase();
    return () => {
      cancelled = true;
      Object.values(saveTimers.current).forEach((t) => window.clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    const sequence = 'OMSAR';
    let index = 0;
    function onKeyDown(e) {
      if (!e.ctrlKey) { index = 0; return; }
      if (e.key === 'Control') return;
      if (e.key.toUpperCase() === sequence[index]) {
        e.preventDefault(); index++;
        if (index === sequence.length) { index = 0; setShowLogin(true); }
      } else { index = e.key.toUpperCase() === sequence[0] ? 1 : 0; }
    }
    function onKeyUp(e) { if (e.key === 'Control') index = 0; }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, []);

  function handleAdminLogin(e) {
    e.preventDefault();
    if (loginForm.username === 'admin' && loginForm.password === 'OMSAR@2025') {
      setShowLogin(false); setShowAdmin(true);
      setLoginForm({ username: '', password: '' }); setLoginError('');
    } else { setLoginError('Invalid credentials.'); }
  }

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 1600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function getRecord(recordIndex) { return currentRecords.find((r) => r.record_index === recordIndex) || null; }
  function getSourceRecord(recordIndex) {
    const record = getRecord(recordIndex);
    if (!record) return Object.fromEntries([['service_code', ''], ...EDITABLE_FIELDS.map((f) => [f, ''])]);
    const result = { service_code: record.source_service_code };
    EDITABLE_FIELDS.forEach((f) => { result[f] = record[`source_${f}`] || ''; });
    return result;
  }
  function getQA(index) { return qa[recordKey(index)] || {}; }

  function fieldHasDataEdit(index, field) {
    const record = getRecord(index);
    const source = getSourceRecord(index);
    if (!record || !source) return false;
    return String(record[field] || '') !== String(source[field] || '');
  }
  function recordHasDataEdit(index) { return EDITABLE_FIELDS.some((f) => fieldHasDataEdit(index, f)); }

  function updateLocalRecord(index, patch) {
    setDbRecords((current) => current.map((r) =>
      r.record_index !== index ? r : { ...r, ...patch, updated_at: new Date().toISOString() }
    ));
  }

  function queueRecordSave(index, field, value) {
    const key = `${index}-${field}`;
    if (saveTimers.current[key]) window.clearTimeout(saveTimers.current[key]);
    setDatabaseStatus('جارٍ الحفظ في قاعدة البيانات…');
    saveTimers.current[key] = window.setTimeout(async () => {
      try {
        await postDatabaseAction({ action: 'update_record', record_index: index, patch: { [field]: value } });
      } catch (error) { setDatabaseStatus(`فشل الحفظ: ${error.message}`); }
    }, 450);
  }

  function updateDataCell(index, field, value) {
    if (!EDITABLE_FIELDS.includes(field)) return;
    updateLocalRecord(index, { [field]: value });
    queueRecordSave(index, field, value);
    if (saveErrors.has(field) && String(value).trim()) {
      setSaveErrors((prev) => { const next = new Set(prev); next.delete(field); return next; });
    }
  }

  async function markValidated(index) {
    const record = getRecord(index);
    const emptyFields = EDITABLE_FIELDS.filter((f) => !OPTIONAL_FIELDS.has(f) && !String(record?.[f] || '').trim());
    if (emptyFields.length) {
      setSaveErrors(new Set(emptyFields));
      setTimeout(() => {
        const el = document.querySelector('.fieldError');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }
    setSaveErrors(new Set());
    setQa((current) => ({
      ...current,
      [recordKey(index)]: { ...(current[recordKey(index)] || {}), status: 'validated', corrected_required_documents: '', qa_note: '', updated_at: new Date().toISOString() }
    }));
    try {
      await postDatabaseAction({ action: 'save_qa', record_index: index, status: 'validated', corrected_required_documents: '', qa_note: '' });
      setToast('تم الحفظ');
    } catch (error) { setDatabaseStatus(`فشل الحفظ: ${error.message}`); }
  }

  function exportCorrectedJSON() {
    const cleanRecords = currentRecords
      .filter((r) => (getQA(r.record_index).status || 'pending') !== 'cancelled')
      .map((r) => {
        const result = { service_code: r.service_code };
        EDITABLE_FIELDS.forEach((f) => { result[f] = r[f]; });
        return result;
      });
    downloadBlob(JSON.stringify(cleanRecords, null, 2), 'etr_services_corrected.json', 'application/json;charset=utf-8');
  }

  async function downloadAllAttachments() {
    const servicesWithAttachments = currentRecords.filter((r) => r.attachments?.length > 0);
    if (!servicesWithAttachments.length) { setToast(t.noAttachments); return; }
    setToast(t.preparingDownload);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (const record of servicesWithAttachments) {
        const folderName = `${String(record.record_index + 1).padStart(2, '0')} - ${record.service_name}`
          .slice(0, 80).replace(/[/\\?%*:|"<>]/g, '-');
        const folder = zip.folder(folderName);
        for (const att of record.attachments) {
          try {
            const res = await fetch(`/api/database?attachment_id=${att.id}`);
            const payload = await res.json();
            if (!payload?.data) continue;
            const base64 = payload.data.includes(',') ? payload.data.split(',')[1] : payload.data;
            folder.file(att.name, base64, { base64: true });
          } catch { /* skip failed file */ }
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = t.zipFilename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setToast(t.downloadComplete);
    } catch (err) { setToast(isArabic ? 'فشل التنزيل' : 'Download failed'); }
  }

  async function resetRecordEdits(index) {
    const source = getSourceRecord(index);
    const patch = {};
    EDITABLE_FIELDS.forEach((f) => { patch[f] = source[f]; });
    updateLocalRecord(index, patch);
    try {
      await postDatabaseAction({ action: 'reset_record_edits', record_index: index }, { applyState: true });
      setToast('تمت استعادة القيم الأصلية');
    } catch (error) { setDatabaseStatus(`فشل الحفظ: ${error.message}`); }
  }

  async function addServiceHandler() {
    const name = newServiceName.trim();
    if (!name) return;
    try {
      const payload = await postDatabaseAction({ action: 'add_service', service_name: name }, { applyState: true });
      setShowAddModal(false);
      setNewServiceName('');
      const newIndex = (payload?.records || []).reduce((max, r) => Math.max(max, r.record_index), -1);
      if (newIndex >= 0) setSelected(newIndex);
      setToast(isArabic ? 'تمت إضافة الخدمة' : 'Service added');
    } catch (error) { setDatabaseStatus(error.message); }
  }

  async function cancelServiceHandler(recordIndex) {
    try {
      setQa((current) => ({
        ...current,
        [recordKey(recordIndex)]: { ...(current[recordKey(recordIndex)] || {}), status: 'cancelled', corrected_required_documents: '', qa_note: '', updated_at: new Date().toISOString() }
      }));
      await postDatabaseAction({ action: 'save_qa', record_index: recordIndex, status: 'cancelled', corrected_required_documents: '', qa_note: '' });
      setToast(isArabic ? 'تم إلغاء الخدمة' : 'Service cancelled');
    } catch (error) { setDatabaseStatus(error.message); }
  }

  async function revertServiceHandler(recordIndex) {
    try {
      setQa((current) => {
        const next = { ...current };
        delete next[recordKey(recordIndex)];
        return next;
      });
      await postDatabaseAction({ action: 'clear_qa', record_index: recordIndex });
      setToast(isArabic ? 'تمت استعادة الخدمة' : 'Service restored');
    } catch (error) { setDatabaseStatus(error.message); }
  }

  async function processFiles(files) {
    if (!files.length || selected === null) return;
    const currentAttachments = getRecord(selected)?.attachments || [];
    const MAX_SIZE = 5 * 1024 * 1024;
    const ALLOWED_EXTS = ['.pdf', '.doc', '.docx'];
    for (const file of files) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) { setToast(t.invalidFileType); continue; }
      if (currentAttachments.length >= 5) { setToast(t.maxAttachments); break; }
      if (file.size > MAX_SIZE) { setToast(t.fileTooLarge(file.name)); continue; }
      const data = await new Promise((resolve) => { const r = new FileReader(); r.onload = (ev) => resolve(ev.target.result); r.readAsDataURL(file); });
      try {
        await postDatabaseAction({ action: 'add_attachment', record_index: selected, attachment: { name: file.name, type: file.type, size: file.size, data } }, { applyState: true });
        setToast(isArabic ? 'تم إرفاق الملف' : 'File attached');
      } catch (err) { setDatabaseStatus(err.message); }
    }
  }

  async function handleAttachFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    await processFiles(files);
  }

  async function removeAttachmentHandler(attachmentId) {
    try {
      await postDatabaseAction({ action: 'delete_attachment', attachment_id: attachmentId }, { applyState: true });
      setToast(isArabic ? 'تم حذف المرفق' : 'Attachment removed');
    } catch (err) { setDatabaseStatus(err.message); }
  }

  async function downloadAttachment(attachmentId, filename) {
    try {
      const res = await fetch(`/api/database?attachment_id=${attachmentId}`);
      const payload = await res.json();
      if (!payload?.data) throw new Error('Download failed');
      const a = document.createElement('a'); a.href = payload.data; a.download = filename; a.click();
    } catch (err) { setToast(isArabic ? 'فشل التنزيل' : 'Download failed'); }
  }

  const stats = useMemo(() => {
    let validated = 0; let pending = 0; let cancelled = 0;
    currentRecords.forEach((r) => {
      const status = getQA(r.record_index).status || 'pending';
      if (status === 'validated') validated += 1;
      else if (status === 'cancelled') cancelled += 1;
      else pending += 1;
    });
    return { validated, pending, cancelled };
  }, [qa, currentRecords]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    const query = normalize(search).toLowerCase();
    return currentRecords.map((r) => r.record_index).filter((index) => {
      const record = getRecord(index);
      const status = getQA(index).status || 'pending';
      const haystack = EDITABLE_FIELDS.map((f) => record[f] || '').join('\n');
      const matchesSearch = !query || normalize(haystack).toLowerCase().includes(query);
      const matchesFilter = filter === 'all' || status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [currentRecords, search, filter, qa]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSaveErrors(new Set());
    setResetConfirm(false);
  }, [selected]);

  useEffect(() => {
    if (shown.length && !shown.includes(selected)) setSelected(shown[0]);
  }, [shown, selected]);

  const selectedRecord = getRecord(selected);
  const selectedSourceRecord = getSourceRecord(selected);
  const selectedState = selectedRecord ? getQA(selected) : {};
  const selectedStatus = selectedState.status || 'pending';
  const selectedEdited = selectedRecord ? recordHasDataEdit(selected) : false;
  const activeCount = currentRecords.length - stats.cancelled;
  const pct = activeCount ? Math.round((stats.validated / activeCount) * 100) : 0;

  return (
    <main className={`wrap ${isArabic ? 'rtl' : 'ltr'}`} dir={isArabic ? 'rtl' : 'ltr'} lang={isArabic ? 'ar' : 'en'}>
      <header className="header">
        <h1 className="ar">{t.title}</h1>
      </header>

      <section className="stats" aria-label="QA progress">
        <div className="progressCard">
          <div className="progressMain">
            <div className="progressLeft">
              <span className="progressPct">{pct}<span className="progressPctSymbol">%</span></span>
              <span className="progressLabel">{stats.validated} من {activeCount} {t.complete}</span>
            </div>
            <div className="progressRight">
              <div className="statChip ok">
                <span className="statChipNum">{stats.validated}</span>
                <span className="statChipLabel">{t.saved}</span>
              </div>
              <div className="statChip pending">
                <span className="statChipNum">{stats.pending}</span>
                <span className="statChipLabel">{t.pending}</span>
              </div>
            </div>
          </div>
          <div className="progressTrack">
            <div className="progressFill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </section>

      <div className="toolbar">
        <div className="searchWrap">
          <svg className="searchIcon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input className="toolbarSearch" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder} />
        </div>
        <CustomSelect value={filter} onChange={setFilter} options={[
          { value: 'all', label: t.allRecords },
          { value: 'pending', label: t.pending },
          { value: 'validated', label: t.saved },
          { value: 'cancelled', label: t.cancelled },
        ]} rtl={isArabic} />
      </div>

      <section className="layout">
        <div className="recordsPanel">
          <div className="serviceBar">
            <button className="btn addServiceBtn" onClick={() => { setShowAddModal(true); setNewServiceName(''); }}>
              {t.addService}
            </button>
          </div>
          <aside className="card">
            <div className="cardHead">
              <h2>{t.records}</h2>
              <span className="pill">{shown.length} {t.shown}</span>
            </div>
            <div className="list">
              {shown.length ? shown.map((index) => {
                const record = getRecord(index);
                const status = getQA(index).status || 'pending';
                return (
                  <div key={index}
                    role="button"
                    tabIndex={0}
                    className={`item${index === selected ? ' active' : ''}`}
                    onClick={() => setSelected(index)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(index); } }}>
                    <span className={isArabic ? 'ar name' : 'autoText name'} dir={isArabic ? 'rtl' : 'auto'}>{record.service_name}</span>
                    <span className={`pill ${statusClass(status)}`}>{statusText(status, t)}</span>
                    {status === 'cancelled' ? (
                      <button
                        className="itemRevertBtn"
                        title="استعادة الخدمة"
                        aria-label="استعادة الخدمة"
                        onClick={(e) => { e.stopPropagation(); setRevertTarget(index); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        className="itemTrashBtn"
                        title="إلغاء الخدمة"
                        aria-label="إلغاء الخدمة"
                        onClick={(e) => { e.stopPropagation(); setCancelTarget(index); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              }) : <div className="empty">{t.noMatchingRecords}</div>}
            </div>
          </aside>
        </div>

        <section className="card">
          <div className="cardHead">
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 className={selectedRecord ? 'ar' : ''} dir={selectedRecord ? 'rtl' : undefined}>
                {selectedRecord ? selectedRecord.service_name : t.selectRecord}
              </h2>
              <div className="muted">{selectedRecord ? t.recordOf(currentRecords.findIndex((r) => r.record_index === selected) + 1, currentRecords.length) : ''}</div>
            </div>
            <span className={`pill ${statusClass(selectedStatus)}`}>{statusText(selectedStatus, t)}</span>
          </div>
          <div className="cardBody">
            {selectedRecord ? (
              <>
                <div className="sep" />
                <div className="row" style={{ marginBottom: 4 }}>
                  <button className="btn ok" onClick={() => markValidated(selected)}>{t.save}</button>
                </div>
                <div className="sep" />
                {EDITABLE_FIELDS.map((field) => (
                  <EditableTextArea
                    key={field}
                    title={FIELD_META[field]?.[uiLanguage]?.label || field}
                    field={field}
                    optional={OPTIONAL_FIELDS.has(field)}
                    selected={selected}
                    selectedRecord={selectedRecord}
                    selectedSourceRecord={selectedSourceRecord}
                    fieldHasDataEdit={fieldHasDataEdit}
                    updateDataCell={updateDataCell}
                    labels={t}
                    compact={COMPACT_FIELDS.has(field)}
                    rtl={isArabic}
                    placeholder={FIELD_META[field]?.[uiLanguage]?.placeholder || ''}
                    hasError={saveErrors.has(field)}
                  />
                ))}
                <div className="sep" />
                <div
                  className={`attachmentsSection${dragOver ? ' dragOver' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); }}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); processFiles(Array.from(e.dataTransfer.files)); }}
                >
                  {(selectedRecord?.attachments?.length > 0) && (
                    <div className="attachmentsList">
                      <h3 style={{ marginBottom: 8 }}>{t.attachedForms}</h3>
                      {selectedRecord.attachments.map((a) => (
                        <div key={a.id} className="attachmentItem">
                          <span className="attachmentIcon">📄</span>
                          <button className="attachmentName" onClick={() => downloadAttachment(a.id, a.name)}>{a.name}</button>
                          <span className="attachmentSize">{(a.size / 1024).toFixed(0)} KB</span>
                          <button className="attachmentRemove" onClick={() => removeAttachmentHandler(a.id)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="btn attachBtn">
                    <span className="attachBtnLabel">{t.attachForms}</span>
                    <span className="attachBtnHint">{t.attachFormsHint}</span>
                    <input type="file" hidden accept=".pdf,.doc,.docx" multiple onChange={handleAttachFiles} />
                  </label>
                </div>
                <div className="sep" />
                <div className="row">
                  <button className="btn ok" onClick={() => markValidated(selected)}>{t.save}</button>
                  {selectedEdited && !resetConfirm && (
                    <button className="btn warn" onClick={() => setResetConfirm(true)}>{t.resetRecordEdits}</button>
                  )}
                  {selectedEdited && resetConfirm && (
                    <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>{t.confirmResetMsg}</span>
                      <button className="btn warn" style={{ padding: '6px 14px', minHeight: 36 }} onClick={() => { resetRecordEdits(selected); setResetConfirm(false); }}>{t.confirmYes}</button>
                      <button className="btn ghost" style={{ padding: '6px 14px', minHeight: 36 }} onClick={() => setResetConfirm(false)}>{t.confirmNo}</button>
                    </div>
                  )}
                </div>
              </>
            ) : <div className="empty">{t.emptySelect}</div>}
          </div>
        </section>
      </section>

      {showAddModal && (
        <div className="serviceModalOverlay" onClick={() => setShowAddModal(false)}>
          <div className="serviceModal" onClick={(e) => e.stopPropagation()}>
            <div className="serviceModalHead">
              <span>{t.addServiceTitle}</span>
              <button className="adminClose" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <div className="serviceModalBody">
              <label className="serviceModalLabel">{t.serviceNameLabel}</label>
              <input
                className="serviceModalInput"
                dir={isArabic ? 'rtl' : 'ltr'}
                autoFocus
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder={t.serviceNamePlaceholder}
                onKeyDown={(e) => { if (e.key === 'Enter' && newServiceName.trim()) addServiceHandler(); }}
              />
              <div className="serviceModalActions">
                <button className="btn ghost" onClick={() => setShowAddModal(false)}>{t.confirmNo}</button>
                <button className="btn ok" onClick={addServiceHandler} disabled={!newServiceName.trim()}>{t.addBtn}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cancelTarget !== null && (
        <div className="serviceModalOverlay deleteConfirmModal" onClick={() => setCancelTarget(null)}>
          <div className="serviceModal" onClick={(e) => e.stopPropagation()}>
            <div className="serviceModalHead" style={{ background: '#ef4444' }}>
              <span>{t.cancelService}</span>
              <button className="adminClose" onClick={() => setCancelTarget(null)}>✕</button>
            </div>
            <div className="serviceModalBody">
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }} dir="rtl">
                هل أنت متأكد من تعليق الخدمة <strong>"{getRecord(cancelTarget)?.service_name || ''}"</strong>؟ سيتم وضعها كخدمة ملغاة ويمكن استعادتها لاحقاً.
              </p>
              <div className="serviceModalActions">
                <button className="btn ghost" onClick={() => setCancelTarget(null)}>لا</button>
                <button className="btn danger" onClick={() => { cancelServiceHandler(cancelTarget); setCancelTarget(null); }}>نعم، إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {revertTarget !== null && (
        <div className="serviceModalOverlay" onClick={() => setRevertTarget(null)}>
          <div className="serviceModal" onClick={(e) => e.stopPropagation()}>
            <div className="serviceModalHead" style={{ background: '#16a34a' }}>
              <span>استعادة الخدمة</span>
              <button className="adminClose" onClick={() => setRevertTarget(null)}>✕</button>
            </div>
            <div className="serviceModalBody">
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }} dir="rtl">
                هل أنت متأكد أنك تريد استعادة الخدمة <strong>"{getRecord(revertTarget)?.service_name || ''}"</strong> وإعادتها إلى حالة نشطة؟
              </p>
              <div className="serviceModalActions">
                <button className="btn ghost" onClick={() => setRevertTarget(null)}>{t.confirmNo}</button>
                <button className="btn ok" onClick={() => { revertServiceHandler(revertTarget); setRevertTarget(null); }}>نعم، استعادة</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogin && (
        <div className="loginOverlay" onClick={() => { setShowLogin(false); setLoginError(''); setLoginForm({ username: '', password: '' }); }}>
          <div className="loginPanel" onClick={(e) => e.stopPropagation()}>
            <div className="loginHead"><span>🔒 Admin Access</span></div>
            <form className="loginBody" onSubmit={handleAdminLogin}>
              <input type="text" placeholder="Username" autoComplete="off" autoFocus value={loginForm.username} onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))} />
              <input type="password" placeholder="Password" value={loginForm.password} onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))} />
              {loginError && <p className="loginError">{loginError}</p>}
              <button type="submit" className="btn primary" style={{ width: '100%' }}>Enter</button>
            </form>
          </div>
        </div>
      )}

      {showAdmin && (
        <div className="adminOverlay" onClick={() => setShowAdmin(false)}>
          <div className="adminPanel" onClick={(e) => e.stopPropagation()}>
            <div className="adminHead">
              <span>Admin</span>
              <button className="adminClose" onClick={() => setShowAdmin(false)}>✕</button>
            </div>
            <div className="adminBody">
              <button className="btn ghost" style={{ width: '100%', color: '#151515', borderColor: '#d1d5db', fontWeight: 600 }} onClick={() => { exportCorrectedJSON(); setShowAdmin(false); }}>
                {isArabic ? 'تصدير JSON المصحّح' : 'Export corrected JSON'}
              </button>
              <button className="btn ghost" style={{ width: '100%', color: '#2563eb', borderColor: '#2563eb' }} onClick={async () => { setShowAdmin(false); await downloadAllAttachments(); }}>
                {t.downloadAllAttachments}
              </button>
              <div className="sep" style={{ margin: '4px 0' }} />
              <button className="btn ghost" style={{ width: '100%', color: '#ef4444', borderColor: '#ef4444' }} onClick={async () => {
                if (!window.confirm(isArabic ? 'هل أنت متأكد؟ سيتم إعادة تعيين جميع المحفوظات إلى قيد المراجعة.' : 'Are you sure? All saved records will be reset to pending.')) return;
                try { await postDatabaseAction({ action: 'reset_all_qa' }, { applyState: true }); setShowAdmin(false); setToast(isArabic ? 'تمت إعادة التعيين' : 'Reset complete'); } catch (e) { setDatabaseStatus(e.message); }
              }}>{t.resetAllQA}</button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </main>
  );
}

function CustomSelect({ value, onChange, options, rtl = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  const selected = options.find((o) => o.value === value);
  return (
    <div className={`customSelect${open ? ' open' : ''}`} ref={ref} dir={rtl ? 'rtl' : 'ltr'}>
      <button type="button" className="customSelectBtn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className={rtl ? 'ar' : ''}>{selected?.label}</span>
        <svg className={`chevron${open ? ' up' : ''}`} width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path fill="currentColor" d="M5 7L0 2h10z" />
        </svg>
      </button>
      <div className="customSelectDropdown" aria-hidden={!open}>
        {options.map((opt) => (
          <button key={opt.value} type="button" className={`customSelectOption${value === opt.value ? ' active' : ''}`}
            onClick={() => { onChange(opt.value); setOpen(false); }}>
            <span className={rtl ? 'ar' : ''}>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EditableTextArea({ title, field, selected, selectedRecord, selectedSourceRecord, fieldHasDataEdit, updateDataCell, compact = false, rtl = false, placeholder = '', labels, hasError = false, optional = false }) {
  const edited = fieldHasDataEdit(selected, field);
  return (
    <>
      <div className={`box editableBox field-${field}${hasError ? ' fieldError' : ''}`}>
        <div className="labelRow">
          <h3>{title}{optional && <em style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginInlineStart: 6 }}>(اختياري)</em>}</h3>
        </div>
        <textarea
          className={`cellInput ${compact ? 'compact' : ''} ${rtl ? 'ar' : 'autoText'}`}
          dir={rtl ? 'rtl' : 'auto'}
          value={selectedRecord[field] || ''}
          onChange={(e) => updateDataCell(selected, field, e.target.value)}
          placeholder={placeholder}
        />
        {hasError && <p className="fieldErrorMsg">{labels.fieldRequired}</p>}
        {edited ? (
          <details className="original">
            <summary>{labels.originalValue}</summary>
            <div className={rtl ? 'source ar' : 'source autoText'}>{selectedSourceRecord[field] || ''}</div>
          </details>
        ) : null}
      </div>
      <div style={{ height: 12 }} />
    </>
  );
}
