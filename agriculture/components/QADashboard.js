'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

const EDITABLE_FIELDS = ['service_name', 'directorate', 'department', 'unit', 'required_documents', 'fees', 'notes'];
const MAX_ATTACHMENTS_PER_SERVICE = 5;
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const MAX_ATTACHMENT_MB = MAX_ATTACHMENT_BYTES / (1024 * 1024);
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

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
    title: 'لوحة تدقيق خدمات وزارة الزراعة',
    exportCorrectedJSON: 'تصدير JSON مع المستندات',
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
    saving: 'جارٍ الحفظ…',
    fieldRequired: 'هذا الحقل مطلوب',
    resetAllQA: 'إعادة تعيين جميع المحفوظات إلى قيد المراجعة',
    resetRecordEdits: 'إلغاء تعديلات السجل',
    confirmResetMsg: 'هل أنت متأكد من إلغاء التعديلات؟',
    confirmYes: 'نعم',
    confirmNo: 'إلغاء',
    emptySelect: 'اختر سجلاً للبدء بالتدقيق.',
    allDirectorates: 'كل المديريات',
    allDepartments: 'كل المصالح',
    addService: '+ إضافة خدمة',
    removeService: 'إلغاء الخدمة',
    addServiceTitle: 'إضافة خدمة جديدة',
    serviceNameLabel: 'اسم الخدمة',
    serviceNamePlaceholder: 'أدخل اسم الخدمة…',
    addBtn: 'إضافة',
    addingService: 'جارٍ الإضافة…',
    serviceNameRequired: 'اسم الخدمة مطلوب.',
    addServiceFailed: 'تعذرت إضافة الخدمة. يرجى المحاولة مرة أخرى.',
    addServiceNetworkError: 'تعذر الاتصال بالخادم. تحقق من الاتصال وحاول مرة أخرى.',
    cancelService: 'إلغاء الخدمة',
    confirmCancelService: (name) => `هل أنت متأكد من إلغاء "${name}"؟`,
    cancelled: 'ملغى',
    attachForms: '📎 إرفاق المستندات',
    attachFormsHint: `انقر لاختيار ملف PDF أو Word (حتى ${MAX_ATTACHMENT_MB}MB)`,
    attachedForms: 'النماذج المرفقة',
    uploadingAttachments: 'جارٍ رفع المستندات…',
    fileTooLarge: (name) => `${name} يتجاوز الحد الأقصى (${MAX_ATTACHMENT_MB}MB)`,
    maxAttachments: `الحد الأقصى ${MAX_ATTACHMENTS_PER_SERVICE} مرفقات لكل خدمة`,
    invalidFileType: 'يُسمح فقط بملفات PDF وWord',
    downloadAttachment: 'تنزيل',
    downloadingAttachment: 'جارٍ التنزيل…',
    downloadAllAttachments: 'تنزيل جميع المرفقات',
    noAttachments: 'لا توجد مرفقات في هذه الوزارة',
    preparingDownload: 'جارٍ تحضير الملفات…',
    downloadComplete: 'اكتمل التنزيل',
    zipFilename: 'مرفقات_الزراعة.zip',
    preparingExport: 'جارٍ تحضير JSON والمستندات…',
    exportComplete: 'تم تصدير JSON والمستندات',
    exportFailed: 'فشل تصدير JSON والمستندات',
    exportPackageFilename: 'خدمات_الزراعة_مع_المستندات.zip',
    status: { validated: 'محفوظ', no: 'لا', pending: 'قيد المراجعة', cancelled: 'ملغى' }
  },
  en: {
    switchToArabic: 'AR',
    switchToEnglish: 'EN',
    title: 'Agriculture Services QA Dashboard',
    exportCorrectedJSON: 'Export JSON + documents',
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
    saving: 'Saving…',
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
    addingService: 'Adding…',
    serviceNameRequired: 'Service name is required.',
    addServiceFailed: 'Unable to add the service. Please try again.',
    addServiceNetworkError: 'Could not reach the server. Check your connection and try again.',
    cancelService: 'Cancel Service',
    confirmCancelService: (name) => `Are you sure you want to cancel "${name}"?`,
    cancelled: 'Cancelled',
    attachForms: '📎 Attach Documents',
    attachFormsHint: `Click to select or drag & drop a PDF / Word file (max ${MAX_ATTACHMENT_MB}MB)`,
    attachedForms: 'Attached Forms',
    uploadingAttachments: 'Uploading documents…',
    fileTooLarge: (name) => `${name} exceeds the ${MAX_ATTACHMENT_MB}MB limit`,
    maxAttachments: `Maximum ${MAX_ATTACHMENTS_PER_SERVICE} attachments per service`,
    invalidFileType: 'Only PDF and Word files are allowed',
    downloadAttachment: 'Download',
    downloadingAttachment: 'Downloading…',
    downloadAllAttachments: 'Download All Attachments',
    noAttachments: 'No attachments found for this ministry',
    preparingDownload: 'Preparing download…',
    downloadComplete: 'Download complete',
    zipFilename: 'agriculture_attachments.zip',
    preparingExport: 'Preparing JSON and documents…',
    exportComplete: 'JSON and documents exported',
    exportFailed: 'JSON and document export failed',
    exportPackageFilename: 'agriculture_services_with_documents.zip',
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

// Canonical key for grouping department (المصلحة) names that are the same but
// written slightly differently: ignores diacritics, tatweel, alef/ya/ta-marbuta
// variants, and ALL whitespace. Genuinely different names keep different keys.
function departmentKey(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[ـ]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, '')
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


function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result);
    reader.onerror = () => reject(reader.error || new Error(`Could not read ${file.name}.`));
    reader.onabort = () => reject(new Error(`Reading ${file.name} was cancelled.`));
    reader.readAsDataURL(file);
  });
}

function safePathSegment(value, fallback = 'item', maxLength = 100) {
  let cleaned = String(value || '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim();
  cleaned = Array.from(cleaned).slice(0, maxLength).join('').replace(/[. ]+$/g, '');
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(cleaned)) cleaned = `_${cleaned}`;
  return cleaned || fallback;
}

function uniqueAttachmentFilename(filename, usedNames) {
  const originalName = String(filename || 'document');
  const lastDot = originalName.lastIndexOf('.');
  const hasExtension = lastDot > 0 && lastDot < originalName.length - 1;
  const rawBase = hasExtension ? originalName.slice(0, lastDot) : originalName;
  const rawExtension = hasExtension ? originalName.slice(lastDot + 1) : '';
  const cleanExtension = safePathSegment(rawExtension, '', 10).replace(/\s+/g, '');
  const extension = cleanExtension ? `.${cleanExtension}` : '';
  const base = safePathSegment(rawBase, 'document', Math.max(40, 110 - extension.length));
  const safeName = `${base}${extension}`;

  let candidate = safeName;
  let suffix = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${base} (${suffix})${extension}`;
    suffix += 1;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

async function fetchAttachmentBinary(attachment) {
  const response = await fetch(`/api/database?attachment_id=${encodeURIComponent(attachment.id)}&download=1`, { cache: 'no-store' });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || `Could not download ${attachment.name || 'attachment'}.`);
  }
  const bytes = await response.arrayBuffer();
  const contentType = String(response.headers.get('content-type') || attachment.type || 'application/octet-stream')
    .split(';', 1)[0]
    .trim();
  return { bytes, contentType };
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
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [addServiceError, setAddServiceError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [revertTarget, setRevertTarget] = useState(null);
  const [dbRecords, setDbRecords] = useState(initialRecords);
  const [dbReady, setDbReady] = useState(false);
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
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState(null);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const dirtyFieldsRef = useRef(new Map());
  const isAddingRef = useRef(false);
  const isSavingRef = useRef(false);
  const attachmentUploadInProgressRef = useRef(false);

  const isArabic = uiLanguage === 'ar';
  const t = COPY[uiLanguage];

  const currentRecords = useMemo(() => [...dbRecords].sort((a, b) => a.record_index - b.record_index), [dbRecords]);

  function applyDatabaseState(payload, options = {}) {
    const { preserveDrafts = true } = options;

    if (Array.isArray(payload?.records)) {
      const serverRecords = payload.records.map(cleanDbRecord);
      setDbRecords((current) => {
        if (!preserveDrafts || dirtyFieldsRef.current.size === 0) return serverRecords;

        const localByIndex = new Map(current.map((record) => [record.record_index, record]));
        return serverRecords.map((serverRecord) => {
          const dirtyFields = dirtyFieldsRef.current.get(serverRecord.record_index);
          const localRecord = localByIndex.get(serverRecord.record_index);
          if (!dirtyFields?.size || !localRecord) return serverRecord;

          const merged = { ...serverRecord };
          dirtyFields.forEach((field) => { merged[field] = localRecord[field]; });
          return merged;
        });
      });
    }
    if (payload?.qa && typeof payload.qa === 'object' && !Array.isArray(payload.qa)) setQa(payload.qa);
    setDbReady(true);
  }

  async function postDatabaseAction(body, options = {}) {
    const { applyState = false, preserveDrafts = true } = options;
    setDatabaseStatus('جارٍ الحفظ في قاعدة البيانات…');
    const response = await fetch('/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok || payload?.ok === false) {
      const error = new Error(payload?.error || 'فشل حفظ قاعدة البيانات.');
      if (Array.isArray(payload?.missing_fields)) error.missingFields = payload.missing_fields;
      throw error;
    }
    if (applyState) applyDatabaseState(payload, { preserveDrafts });
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
    if (loginForm.username === 'admin' && loginForm.password === 'OMSAR@2026') {
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

  function markDirtyField(index, field) {
    const dirtyFields = dirtyFieldsRef.current.get(index) || new Set();
    dirtyFields.add(field);
    dirtyFieldsRef.current.set(index, dirtyFields);
  }

  function clearRecordDraft(index) {
    dirtyFieldsRef.current.delete(index);
  }

  function editableRecordPayload(record) {
    return Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, String(record?.[field] ?? '')]));
  }

  function updateDataCell(index, field, value) {
    if (!EDITABLE_FIELDS.includes(field)) return;
    markDirtyField(index, field);
    updateLocalRecord(index, { [field]: value });
    if (saveErrors.has(field) && String(value).trim()) {
      setSaveErrors((prev) => { const next = new Set(prev); next.delete(field); return next; });
    }
  }

  async function markValidated(index) {
    if (isSaving || isSavingRef.current || attachmentUploadInProgressRef.current) return;

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
    isSavingRef.current = true;
    setIsSaving(true);

    try {
      const payload = await postDatabaseAction({
        action: 'save_and_validate',
        record_index: index,
        record: editableRecordPayload(record)
      });
      clearRecordDraft(index);
      applyDatabaseState(payload);
      setToast(isArabic ? 'تم الحفظ والتحقق' : 'Saved and validated');
    } catch (error) {
      if (Array.isArray(error.missingFields)) setSaveErrors(new Set(error.missingFields));
      setDatabaseStatus(`فشل الحفظ: ${error.message}`);
      setToast(isArabic ? 'فشل الحفظ' : 'Save failed');
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  async function exportCorrectedJSON() {
    if (attachmentUploadInProgressRef.current) { setToast(t.uploadingAttachments); return; }
    setToast(t.preparingExport);

    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const exportRecords = [];
      const includedRecords = currentRecords
        .filter((record) => (getQA(record.record_index).status || 'pending') !== 'cancelled');

      for (const record of includedRecords) {
        const result = { service_code: record.service_code };
        EDITABLE_FIELDS.forEach((field) => { result[field] = record[field]; });
        result.attachments = [];

        if (record.attachments?.length) {
          const ordinal = String(record.record_index + 1).padStart(4, '0');
          const safeCode = safePathSegment(record.service_code, '', 25);
          const codePart = safeCode ? ` - ${safeCode}` : '';
          const servicePart = safePathSegment(record.service_name, 'service', 55);
          const serviceFolder = `documents/${ordinal}${codePart} - ${servicePart}`;
          const usedNames = new Set();

          for (const attachment of record.attachments) {
            const { bytes, contentType } = await fetchAttachmentBinary(attachment);
            const exportedFilename = uniqueAttachmentFilename(attachment.name, usedNames);
            const relativePath = `${serviceFolder}/${exportedFilename}`;
            zip.file(relativePath, bytes);
            result.attachments.push({
              attachment_id: Number(attachment.id),
              name: attachment.name,
              path: relativePath,
              file_type: contentType,
              size_bytes: bytes.byteLength
            });
          }
        }

        exportRecords.push(result);
      }

      zip.file('agr_services_corrected.json', JSON.stringify(exportRecords, null, 2));
      zip.file(
        'README.txt',
        [
          'Agriculture services export',
          '',
          'agr_services_corrected.json contains the corrected, non-cancelled service records.',
          'Each service has an attachments array.',
          'For every attachment, path points to the matching file inside this ZIP package.',
          'Paths use forward slashes and are relative to the ZIP root.',
          'attachment_id is the database attachment ID at the time of export.',
          'Duplicate filenames are renamed inside the ZIP, and path always records the exported filename.'
        ].join('\n')
      );

      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      downloadBlob(blob, t.exportPackageFilename);
      setToast(t.exportComplete);
    } catch (error) {
      console.error('Export failed', error);
      setToast(`${t.exportFailed}: ${error.message}`);
    }
  }

  async function downloadAllAttachments() {
    if (attachmentUploadInProgressRef.current) { setToast(t.uploadingAttachments); return; }
    const servicesWithAttachments = currentRecords.filter((record) => record.attachments?.length > 0);
    if (!servicesWithAttachments.length) { setToast(t.noAttachments); return; }
    setToast(t.preparingDownload);

    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();

      for (const record of servicesWithAttachments) {
        const ordinal = String(record.record_index + 1).padStart(4, '0');
        const folderName = `${ordinal} - ${safePathSegment(record.service_name, 'service', 70)}`;
        const folder = zip.folder(folderName);
        const usedNames = new Set();

        for (const attachment of record.attachments) {
          const { bytes } = await fetchAttachmentBinary(attachment);
          folder.file(uniqueAttachmentFilename(attachment.name, usedNames), bytes);
        }
      }

      zip.file(
        'README.txt',
        'Attachments are grouped by service. Duplicate filenames are renamed so no document is overwritten.\n'
      );
      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      downloadBlob(blob, t.zipFilename);
      setToast(t.downloadComplete);
    } catch (error) {
      console.error('Attachment ZIP download failed', error);
      setToast(`${isArabic ? 'فشل التنزيل' : 'Download failed'}: ${error.message}`);
    }
  }

  async function resetRecordEdits(index) {
    if (isSaving || isSavingRef.current) return;
    try {
      const payload = await postDatabaseAction({ action: 'reset_record_edits', record_index: index });
      clearRecordDraft(index);
      applyDatabaseState(payload);
      setToast('تمت استعادة القيم الأصلية');
    } catch (error) { setDatabaseStatus(`فشل الحفظ: ${error.message}`); }
  }

  function openAddServiceModal() {
    if (isAdding || isAddingRef.current) return;
    setNewServiceName('');
    setAddServiceError('');
    setShowAddModal(true);
  }

  function closeAddServiceModal() {
    if (isAdding || isAddingRef.current) return;
    setShowAddModal(false);
    setNewServiceName('');
    setAddServiceError('');
  }

  function getAddServiceErrorMessage(error) {
    const message = String(error?.message || '').trim();
    if (error instanceof SyntaxError || !message) return t.addServiceFailed;
    if (/failed to fetch|networkerror|load failed/i.test(message)) return t.addServiceNetworkError;
    return message;
  }

  async function addServiceHandler() {
    const name = newServiceName.trim();
    if (!name) {
      setAddServiceError(t.serviceNameRequired);
      return;
    }
    if (isAdding || isAddingRef.current) return;

    // The ref closes the tiny gap before React commits the state update, so a
    // rapid Enter/click pair cannot start two requests in the same render.
    isAddingRef.current = true;
    setAddServiceError('');
    setIsAdding(true);

    try {
      const payload = await postDatabaseAction({ action: 'add_service', service_name: name }, { applyState: true });
      setShowAddModal(false);
      setNewServiceName('');
      setAddServiceError('');
      const newIndex = Number(payload?.created_record_index);
      if (Number.isInteger(newIndex) && newIndex >= 0) setSelected(newIndex);
      setToast(isArabic ? 'تمت إضافة الخدمة' : 'Service added');
    } catch (error) {
      const message = getAddServiceErrorMessage(error);
      setAddServiceError(message);
      setDatabaseStatus(message);
    } finally {
      isAddingRef.current = false;
      setIsAdding(false);
    }
  }

  async function cancelServiceHandler(recordIndex) {
    if (isSaving || isSavingRef.current) return;
    try {
      const payload = await postDatabaseAction({ action: 'save_qa', record_index: recordIndex, status: 'cancelled', corrected_required_documents: '', qa_note: '' });
      clearRecordDraft(recordIndex);
      applyDatabaseState(payload);
      setToast(isArabic ? 'تم إلغاء الخدمة' : 'Service cancelled');
    } catch (error) { setDatabaseStatus(error.message); }
  }

  async function revertServiceHandler(recordIndex) {
    if (isSaving || isSavingRef.current) return;
    try {
      const payload = await postDatabaseAction({ action: 'clear_qa', record_index: recordIndex });
      applyDatabaseState(payload);
      setToast(isArabic ? 'تمت استعادة الخدمة' : 'Service restored');
    } catch (error) { setDatabaseStatus(error.message); }
  }

  async function uploadJsonHandler(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (isSaving || isSavingRef.current || attachmentUploadInProgressRef.current) {
      setToast(attachmentUploadInProgressRef.current ? t.uploadingAttachments : t.saving);
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error(isArabic ? 'الملف يجب أن يكون مصفوفة JSON' : 'File must be a JSON array.');
      const attachmentCount = currentRecords.reduce((total, record) => total + (record.attachments?.length || 0), 0);
      if (attachmentCount > 0) {
        const confirmed = window.confirm(isArabic
          ? `تحذير: استبدال ملف JSON سيحذف ${attachmentCount} مستند مرفق حالياً. هل تريد المتابعة؟`
          : `Warning: replacing the source JSON will delete ${attachmentCount} currently attached document${attachmentCount === 1 ? '' : 's'}. Continue?`);
        if (!confirmed) return;
      }

      setShowAdmin(false);
      setToast(isArabic ? 'جارٍ رفع البيانات…' : 'Uploading data…');
      const payload = await postDatabaseAction({
        action: 'upload_source_json',
        records: parsed,
        confirm_delete_attachments: attachmentCount > 0,
        expected_attachment_count: attachmentCount
      });
      dirtyFieldsRef.current.clear();
      applyDatabaseState(payload, { preserveDrafts: false });
      setToast(isArabic ? 'تم رفع البيانات بنجاح' : 'Data uploaded successfully');
    } catch (err) {
      setToast(isArabic ? `فشل الرفع: ${err.message}` : `Upload failed: ${err.message}`);
    }
  }

  async function processFiles(files) {
    const fileList = Array.from(files || []);
    if (
      isSaving || isSavingRef.current || attachmentUploadInProgressRef.current
      || !fileList.length || selected === null
    ) return;

    const recordIndex = selected;
    const currentAttachments = getRecord(recordIndex)?.attachments || [];
    let remainingSlots = MAX_ATTACHMENTS_PER_SERVICE - currentAttachments.length;
    if (remainingSlots <= 0) { setToast(t.maxAttachments); return; }

    attachmentUploadInProgressRef.current = true;
    setIsUploadingAttachments(true);
    let uploadedCount = 0;
    const errors = [];

    try {
      for (const file of fileList) {
        if (remainingSlots <= 0) {
          errors.push(t.maxAttachments);
          break;
        }

        const lastDot = file.name.lastIndexOf('.');
        const extension = lastDot >= 0 ? file.name.slice(lastDot).toLowerCase() : '';
        if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(extension)) {
          errors.push(`${file.name}: ${t.invalidFileType}`);
          continue;
        }
        if (file.size < 1) {
          errors.push(`${file.name}: ${isArabic ? 'الملف فارغ' : 'File is empty'}`);
          continue;
        }
        if (file.size > MAX_ATTACHMENT_BYTES) {
          errors.push(t.fileTooLarge(file.name));
          continue;
        }

        try {
          const data = await readFileAsDataUrl(file);
          await postDatabaseAction({
            action: 'add_attachment',
            record_index: recordIndex,
            attachment: { name: file.name, type: file.type, size: file.size, data }
          }, { applyState: true });
          uploadedCount += 1;
          remainingSlots -= 1;
        } catch (error) {
          errors.push(`${file.name}: ${error.message}`);
        }
      }

      if (errors.length) {
        const extra = errors.length > 1 ? ` (+${errors.length - 1})` : '';
        setToast(`${errors[0]}${extra}`);
      } else if (uploadedCount > 0) {
        setToast(isArabic ? `تم إرفاق ${uploadedCount} ملف` : `${uploadedCount} file${uploadedCount === 1 ? '' : 's'} attached`);
      }
    } finally {
      attachmentUploadInProgressRef.current = false;
      setIsUploadingAttachments(false);
    }
  }

  async function handleAttachFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    await processFiles(files);
  }

  async function removeAttachmentHandler(attachmentId) {
    if (isSaving || isSavingRef.current || attachmentUploadInProgressRef.current) return;
    try {
      await postDatabaseAction({ action: 'delete_attachment', attachment_id: attachmentId }, { applyState: true });
      setToast(isArabic ? 'تم حذف المرفق' : 'Attachment removed');
    } catch (err) { setDatabaseStatus(err.message); }
  }

  async function downloadAttachment(attachmentId, filename) {
    if (downloadingAttachmentId === attachmentId) return;
    setDownloadingAttachmentId(attachmentId);
    try {
      const res = await fetch(`/api/database?attachment_id=${encodeURIComponent(attachmentId)}&download=1`, { cache: 'no-store' });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Download failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'attachment';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setToast(`${isArabic ? 'فشل التنزيل' : 'Download failed'}: ${err.message}`);
    } finally {
      setDownloadingAttachmentId(null);
    }
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

  // Group department names by canonical key so near-identical spellings collapse
  // into one filter option / one list group. labelByKey holds the display name
  // (the most common spelling) for each key.
  const { departmentOptions, departmentLabelByKey } = useMemo(() => {
    const spellings = new Map(); // key -> Map(originalSpelling -> count)
    currentRecords.forEach((r) => {
      // Cancelled services should not contribute a department to the filter.
      const status = (qa[recordKey(r.record_index)] || {}).status || 'pending';
      if (status === 'cancelled') return;
      const raw = String(r.department || '').trim();
      if (!raw) return;
      const key = departmentKey(raw);
      if (!key) return;
      if (!spellings.has(key)) spellings.set(key, new Map());
      const m = spellings.get(key);
      m.set(raw, (m.get(raw) || 0) + 1);
    });
    const labelByKey = new Map();
    spellings.forEach((m, key) => {
      let best = '';
      let bestCount = -1;
      m.forEach((count, spelling) => { if (count > bestCount) { best = spelling; bestCount = count; } });
      labelByKey.set(key, best);
    });
    const keys = [...labelByKey.keys()].sort((a, b) => labelByKey.get(a).localeCompare(labelByKey.get(b), 'ar'));
    const options = [{ value: 'all', label: t.allDepartments }, ...keys.map((k) => ({ value: k, label: labelByKey.get(k) }))];
    return { departmentOptions: options, departmentLabelByKey: labelByKey };
  }, [currentRecords, qa, t]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-department progress, derived live from records + qa (nothing stored).
  // total = active (non-cancelled) services in the department; done = validated.
  const departmentProgress = useMemo(() => {
    const map = new Map(); // departmentKey -> { done, total }
    currentRecords.forEach((r) => {
      const status = (qa[recordKey(r.record_index)] || {}).status || 'pending';
      if (status === 'cancelled') return;
      const key = departmentKey(r.department);
      if (!map.has(key)) map.set(key, { done: 0, total: 0 });
      const entry = map.get(key);
      entry.total += 1;
      if (status === 'validated') entry.done += 1;
    });
    return map;
  }, [currentRecords, qa]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    const query = normalize(search).toLowerCase();
    const indices = currentRecords.map((r) => r.record_index).filter((index) => {
      const record = getRecord(index);
      const status = getQA(index).status || 'pending';
      const haystack = EDITABLE_FIELDS.map((f) => record[f] || '').join('\n');
      const matchesSearch = !query || normalize(haystack).toLowerCase().includes(query);
      const matchesFilter = (filter === 'all' && status !== 'cancelled') || status === filter;
      const matchesDepartment = departmentFilter === 'all' || departmentKey(record.department) === departmentFilter;
      return matchesSearch && matchesFilter && matchesDepartment;
    });
    // Display-only ordering: group services by department (المصلحة) using the
    // canonical key so near-identical spellings stay together; blanks last,
    // keeping original record_index order within each department. Does not mutate data.
    return indices.sort((a, b) => {
      const da = departmentKey(getRecord(a)?.department);
      const db = departmentKey(getRecord(b)?.department);
      if (da !== db) {
        if (!da) return 1;
        if (!db) return -1;
        const la = departmentLabelByKey.get(da) || da;
        const lb = departmentLabelByKey.get(db) || db;
        return la.localeCompare(lb, 'ar');
      }
      return a - b;
    });
  }, [currentRecords, search, filter, departmentFilter, departmentLabelByKey, qa]); // eslint-disable-line react-hooks/exhaustive-deps

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
              <span className="progressPct">{dbReady ? pct : '—'}<span className="progressPctSymbol">%</span></span>
              <span className="progressLabel">{dbReady ? `${stats.validated} من ${activeCount} ${t.complete}` : '…'}</span>
            </div>
            <div className="progressRight">
              <div className="statChip ok">
                <span className="statChipNum">{dbReady ? stats.validated : '—'}</span>
                <span className="statChipLabel">{t.saved}</span>
              </div>
              <div className="statChip pending">
                <span className="statChipNum">{dbReady ? stats.pending : '—'}</span>
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
        <CustomSelect value={departmentFilter} onChange={setDepartmentFilter} options={departmentOptions} rtl={isArabic} />
      </div>

      <section className="layout">
        <div className="recordsPanel">
          <div className="serviceBar">
            <button className="btn addServiceBtn" onClick={openAddServiceModal}>
              {t.addService}
            </button>
          </div>
          <aside className="card">
            <div className="cardHead">
              <h2>{t.records}</h2>
              <span className="pill">{shown.length} {t.shown}</span>
            </div>
            <div className="list">
              {shown.length ? shown.map((index, i) => {
                const record = getRecord(index);
                const status = getQA(index).status || 'pending';
                const deptK = departmentKey(record.department);
                const prevDeptK = i > 0 ? departmentKey(getRecord(shown[i - 1])?.department) : null;
                // No department header for cancelled services (cancelled tab = flat list).
                const showHeader = deptK !== prevDeptK && status !== 'cancelled';
                const headerLabel = deptK ? (departmentLabelByKey.get(deptK) || String(record.department || '').trim()) : 'بدون مصلحة';
                const deptProg = showHeader ? (departmentProgress.get(deptK) || { done: 0, total: 0 }) : null;
                const deptPct = deptProg && deptProg.total ? Math.round((deptProg.done / deptProg.total) * 100) : 0;
                return (
                  <Fragment key={index}>
                  {showHeader && (
                    <div className="deptGroupHeader ar" dir="rtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 12px', margin: '8px 0 2px', fontSize: 12, fontWeight: 700, color: '#0e7490', background: '#ecfeff', borderInlineStart: '3px solid #06b6d4', borderRadius: 6 }}>
                      <span style={{ flex: 1, minWidth: 0 }}>{headerLabel}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }} title={`${deptProg.done} من ${deptProg.total} مكتمل`}>
                        <span dir="ltr" style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{deptProg.done}/{deptProg.total}</span>
                        <span style={{ width: 46, height: 6, borderRadius: 999, background: '#cffafe', overflow: 'hidden', display: 'inline-block' }}>
                          <span style={{ display: 'block', height: '100%', width: `${deptPct}%`, background: '#06b6d4', borderRadius: 999 }} />
                        </span>
                      </span>
                    </div>
                  )}
                  <div
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
                        disabled={isSaving}
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
                        disabled={isSaving}
                        onClick={(e) => { e.stopPropagation(); setCancelTarget(index); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                  </Fragment>
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
                  <button className="btn ok" onClick={() => markValidated(selected)} disabled={isSaving || isUploadingAttachments}>
                    {isSaving ? t.saving : t.save}
                  </button>
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
                    disabled={isSaving}
                  />
                ))}
                <div className="sep" />
                <div
                  className={`attachmentsSection${dragOver && !isSaving && !isUploadingAttachments ? ' dragOver' : ''}`}
                  aria-busy={isUploadingAttachments}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isSaving && !isUploadingAttachments) setDragOver(true);
                  }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (!isSaving && !isUploadingAttachments) void processFiles(Array.from(e.dataTransfer.files));
                  }}
                >
                  {(selectedRecord?.attachments?.length > 0) && (
                    <div className="attachmentsList">
                      <h3 style={{ marginBottom: 8 }}>{t.attachedForms}</h3>
                      {selectedRecord.attachments.map((a) => (
                        <div key={a.id} className="attachmentItem">
                          <span className="attachmentIcon">📄</span>
                          <button
                            className="attachmentName"
                            type="button"
                            onClick={() => downloadAttachment(a.id, a.name)}
                            disabled={downloadingAttachmentId === a.id}
                            title={`${t.downloadAttachment}: ${a.name}`}
                          >
                            {a.name}
                          </button>
                          <span className="attachmentSize">{(a.size / 1024).toFixed(0)} KB</span>
                          <button
                            className="attachmentDownload"
                            type="button"
                            onClick={() => downloadAttachment(a.id, a.name)}
                            disabled={downloadingAttachmentId === a.id}
                            aria-label={`${t.downloadAttachment}: ${a.name}`}
                            title={`${t.downloadAttachment}: ${a.name}`}
                          >
                            {downloadingAttachmentId === a.id ? t.downloadingAttachment : `↓ ${t.downloadAttachment}`}
                          </button>
                          <button
                            className="attachmentRemove"
                            type="button"
                            onClick={() => removeAttachmentHandler(a.id)}
                            disabled={isSaving || isUploadingAttachments || downloadingAttachmentId === a.id}
                            aria-label={isArabic ? `حذف ${a.name}` : `Remove ${a.name}`}
                            title={isArabic ? 'حذف المرفق' : 'Remove attachment'}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label
                    className={`btn attachBtn${isSaving || isUploadingAttachments ? ' disabled' : ''}`}
                    aria-disabled={isSaving || isUploadingAttachments}
                  >
                    <span className="attachBtnLabel">{isUploadingAttachments ? t.uploadingAttachments : t.attachForms}</span>
                    <span className="attachBtnHint">{t.attachFormsHint}</span>
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx"
                      multiple
                      onChange={handleAttachFiles}
                      disabled={isSaving || isUploadingAttachments}
                    />
                  </label>
                </div>
                <div className="sep" />
                <div className="row">
                  <button className="btn ok" onClick={() => markValidated(selected)} disabled={isSaving || isUploadingAttachments}>
                    {isSaving ? t.saving : t.save}
                  </button>
                  {selectedEdited && !resetConfirm && (
                    <button className="btn warn" onClick={() => setResetConfirm(true)} disabled={isSaving || isUploadingAttachments}>{t.resetRecordEdits}</button>
                  )}
                  {selectedEdited && resetConfirm && (
                    <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>{t.confirmResetMsg}</span>
                      <button className="btn warn" style={{ padding: '6px 14px', minHeight: 36 }} onClick={() => { resetRecordEdits(selected); setResetConfirm(false); }} disabled={isSaving || isUploadingAttachments}>{t.confirmYes}</button>
                      <button className="btn ghost" style={{ padding: '6px 14px', minHeight: 36 }} onClick={() => setResetConfirm(false)} disabled={isSaving || isUploadingAttachments}>{t.confirmNo}</button>
                    </div>
                  )}
                </div>
              </>
            ) : <div className="empty">{t.emptySelect}</div>}
          </div>
        </section>
      </section>

      {showAddModal && (
        <div className="serviceModalOverlay" onClick={closeAddServiceModal}>
          <div
            className="serviceModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-service-title"
            aria-busy={isAdding}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="serviceModalHead">
              <span id="add-service-title">{t.addServiceTitle}</span>
              <button type="button" className="adminClose" onClick={closeAddServiceModal} disabled={isAdding} aria-label={t.confirmNo}>✕</button>
            </div>
            <div className="serviceModalBody">
              <label className="serviceModalLabel" htmlFor="new-service-name">{t.serviceNameLabel}</label>
              <input
                id="new-service-name"
                className="serviceModalInput"
                dir={isArabic ? 'rtl' : 'ltr'}
                autoFocus
                value={newServiceName}
                onChange={(e) => {
                  setNewServiceName(e.target.value);
                  if (addServiceError) setAddServiceError('');
                }}
                placeholder={t.serviceNamePlaceholder}
                disabled={isAdding}
                aria-invalid={Boolean(addServiceError)}
                aria-describedby={addServiceError ? 'add-service-error' : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!e.repeat) void addServiceHandler();
                  }
                }}
              />
              {addServiceError && (
                <p id="add-service-error" className="serviceModalError" role="alert" aria-live="assertive" aria-atomic="true" dir="auto">
                  {addServiceError}
                </p>
              )}
              <div className="serviceModalActions">
                <button type="button" className="btn ghost" onClick={closeAddServiceModal} disabled={isAdding}>{t.confirmNo}</button>
                <button type="button" className="btn ok" onClick={addServiceHandler} disabled={isAdding || !newServiceName.trim()}>
                  {isAdding ? t.addingService : t.addBtn}
                </button>
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
                <button className="btn danger" disabled={isSaving} onClick={() => { cancelServiceHandler(cancelTarget); setCancelTarget(null); }}>نعم، إلغاء</button>
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
                <button className="btn ok" disabled={isSaving} onClick={() => { revertServiceHandler(revertTarget); setRevertTarget(null); }}>نعم، استعادة</button>
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
              <button className="btn ghost" style={{ width: '100%', color: '#151515', borderColor: '#d1d5db', fontWeight: 600 }} onClick={async () => { setShowAdmin(false); await exportCorrectedJSON(); }}>
                {t.exportCorrectedJSON}
              </button>
              <button className="btn ghost" style={{ width: '100%', color: '#2563eb', borderColor: '#2563eb' }} onClick={async () => { setShowAdmin(false); await downloadAllAttachments(); }}>
                {t.downloadAllAttachments}
              </button>
              <div className="sep" style={{ margin: '4px 0' }} />
              <label
                className={`btn ghost${isSaving || isUploadingAttachments ? ' disabled' : ''}`}
                aria-disabled={isSaving || isUploadingAttachments}
                style={{ width: '100%', color: '#7c3aed', borderColor: '#7c3aed', textAlign: 'center', cursor: isSaving || isUploadingAttachments ? 'not-allowed' : 'pointer' }}
              >
                {isArabic ? '📂 رفع ملف JSON' : '📂 Upload JSON File'}
                <input type="file" hidden accept=".json" onChange={uploadJsonHandler} disabled={isSaving || isUploadingAttachments} />
              </label>
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

function EditableTextArea({ title, field, selected, selectedRecord, selectedSourceRecord, fieldHasDataEdit, updateDataCell, compact = false, rtl = false, placeholder = '', labels, hasError = false, optional = false, disabled = false }) {
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
          disabled={disabled}
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
