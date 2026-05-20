import postgres from 'postgres';
import sourceData from '@/data/economy_and_trade_services.json';

const EDITABLE_FIELDS = ['service_name', 'directorate', 'department', 'required_documents', 'fees', 'notes'];
const SOURCE_FILE = 'etr_services.json';
const MINISTRY_KEY = 'economy';

let sqlConnection;
let initPromise;
let ready = false;

function now() { return new Date().toISOString(); }

function getSql() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is missing. Add a Postgres connection string in .env.local or Vercel Environment Variables.');
  }
  if (!sqlConnection) {
    sqlConnection = postgres(dbUrl, { max: 1, prepare: false });
  }
  return sqlConnection;
}

function clean(value) { return String(value ?? '').trim(); }

function readSourceRecords() {
  if (!Array.isArray(sourceData)) throw new Error('Source JSON must be an array.');
  return sourceData.map((r) => ({
    service_code: clean(r?.service_code),
    service_name: clean(r?.service_name),
    directorate: clean(r?.directorate),
    department: clean(r?.department || r?.sub_directorate),
    required_documents: clean(r?.required_documents),
    fees: clean(r?.fees),
    notes: clean(r?.notes)
  }));
}

async function migrate(db) {
  await db`
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      record_index INTEGER NOT NULL,
      ministry TEXT NOT NULL DEFAULT '',
      source_filename TEXT NOT NULL DEFAULT '',
      filename TEXT NOT NULL DEFAULT '',
      source_service_code TEXT NOT NULL DEFAULT '',
      service_code TEXT NOT NULL DEFAULT '',
      source_service_name TEXT NOT NULL DEFAULT '',
      service_name TEXT NOT NULL DEFAULT '',
      source_directorate TEXT NOT NULL DEFAULT '',
      directorate TEXT NOT NULL DEFAULT '',
      source_sub_directorate TEXT NOT NULL DEFAULT '',
      sub_directorate TEXT NOT NULL DEFAULT '',
      source_required_documents TEXT NOT NULL DEFAULT '',
      required_documents TEXT NOT NULL DEFAULT '',
      source_fees TEXT NOT NULL DEFAULT '',
      fees TEXT NOT NULL DEFAULT '',
      source_notes TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;

  const cols = [
    ['ministry', "TEXT NOT NULL DEFAULT ''"],
    ['source_filename', "TEXT NOT NULL DEFAULT ''"],
    ['filename', "TEXT NOT NULL DEFAULT ''"],
    ['source_service_code', "TEXT NOT NULL DEFAULT ''"],
    ['service_code', "TEXT NOT NULL DEFAULT ''"],
    ['source_directorate', "TEXT NOT NULL DEFAULT ''"],
    ['directorate', "TEXT NOT NULL DEFAULT ''"],
    ['source_sub_directorate', "TEXT NOT NULL DEFAULT ''"],
    ['sub_directorate', "TEXT NOT NULL DEFAULT ''"],
    ['source_department', "TEXT NOT NULL DEFAULT ''"],
    ['department', "TEXT NOT NULL DEFAULT ''"],
    ['source_fees', "TEXT NOT NULL DEFAULT ''"],
    ['fees', "TEXT NOT NULL DEFAULT ''"],
    ['source_notes', "TEXT NOT NULL DEFAULT ''"],
    ['notes', "TEXT NOT NULL DEFAULT ''"]
  ];
  for (const [col, def] of cols) {
    await db.unsafe(`ALTER TABLE services ADD COLUMN IF NOT EXISTS ${col} ${def}`);
  }

  // Migrate existing rows that have no ministry set
  await db`UPDATE services SET ministry = ${MINISTRY_KEY} WHERE ministry = ''`;

  // Migrate sub_directorate data into department column
  await db`UPDATE services SET department = sub_directorate WHERE department = '' AND sub_directorate != ''`;
  await db`UPDATE services SET source_department = source_sub_directorate WHERE source_department = '' AND source_sub_directorate != ''`;

  // Drop old single-column unique constraint and replace with composite
  await db.unsafe(`ALTER TABLE services DROP CONSTRAINT IF EXISTS services_record_index_key`);
  await db`CREATE UNIQUE INDEX IF NOT EXISTS idx_services_ministry_record_index ON services(ministry, record_index)`;

  // Normalize directorate names — fix hamza, extra spaces, trailing periods, embedded newlines, colon prefix
  const CANONICAL_DIR = 'المديرية العامة للاقتصاد والتجارة';
  const dirVariants = [
    'المديرية العامة للإقتصاد والتجارة',
    'المديرية العامة للإقتصاد والتجارة.',
    'المديرية العامة للاقتصاد',
    'المديرية العامة للاقتصاد و التجارة',
    'المديرية العامة للاقتصاد والتجارة.',
    'المديرية العامة للاقتصاد والتجارة\nمصلحة التجارة – دائرة الشركات.',
    'المديرية العامة:  للاقتصاد والتجارة',
    'المديرية العامة:  للاقتصاد والتجارة\nمصلحة التجارة – دائرة المعارض والأسواق',
    'مصلحة التجارة – دائرة الشركات',
  ];
  for (const variant of dirVariants) {
    await db`UPDATE services SET directorate = ${CANONICAL_DIR}, source_directorate = ${CANONICAL_DIR} WHERE ministry = ${MINISTRY_KEY} AND directorate = ${variant}`;
  }

  // Normalize department names — remove trailing punctuation, unify consumer protection and IP names
  const deptFixes = [
    ['مديرية حماية المستهلك .', 'مديرية حماية المستهلك'],
    ['مديرية حماية المستهلك.', 'مديرية حماية المستهلك'],
    ['مصلحة حماية المستهلك', 'مديرية حماية المستهلك'],
    ['مصلحة التجارة : دائرة الشركات', 'مصلحة التجارة – دائرة الشركات'],
    ['مصلحة التجارة – دائرة الشركات.', 'مصلحة التجارة – دائرة الشركات'],
    ['مصلحة التجارة – دائرة التجارة الخارجية.', 'مصلحة التجارة – دائرة التجارة الخارجية'],
    ['مصلحة حماية الملكية', 'مصلحة حماية الملكية الفكرية'],
  ];
  for (const [old, fixed] of deptFixes) {
    await db`UPDATE services SET department = ${fixed}, source_department = ${fixed} WHERE ministry = ${MINISTRY_KEY} AND department = ${old}`;
  }

  // Remove records that have no service name (junk/template entries from source data)
  await db`DELETE FROM services WHERE ministry = ${MINISTRY_KEY} AND service_name = '' AND source_service_name = ''`;

  // Remove the English Customs formalities entry
  await db`DELETE FROM services WHERE ministry = ${MINISTRY_KEY} AND source_service_code = 'new - customs procedures'`;
  await db`DELETE FROM services WHERE ministry = ${MINISTRY_KEY} AND service_name = 'Customs formalities'`;

  // Fix reversed closing parenthesis in Kimberley service name
  await db`UPDATE services SET service_name = replace(service_name, '(نظام كمبرلي(', '(نظام كمبرلي)'), source_service_name = replace(source_service_name, '(نظام كمبرلي(', '(نظام كمبرلي)') WHERE ministry = ${MINISTRY_KEY}`;

  await db`
    CREATE TABLE IF NOT EXISTS qa_reviews (
      service_id INTEGER PRIMARY KEY REFERENCES services(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('validated', 'no')),
      corrected_required_documents TEXT NOT NULL DEFAULT '',
      qa_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      field_name TEXT,
      old_value TEXT,
      new_value TEXT,
      created_at TEXT NOT NULL
    )
  `;

  await db`CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC)`;
}

async function seed(db) {
  const records = readSourceRecords();
  const insertedAt = now();

  await db.begin(async (tx) => {
    for (const [index, record] of records.entries()) {
      await tx`
        INSERT INTO services (
          record_index, ministry, source_filename, filename,
          source_service_code, service_code,
          source_service_name, service_name,
          source_directorate, directorate,
          source_department, department,
          source_required_documents, required_documents,
          source_fees, fees,
          source_notes, notes,
          created_at, updated_at
        ) VALUES (
          ${index}, ${MINISTRY_KEY}, ${SOURCE_FILE}, ${SOURCE_FILE},
          ${record.service_code}, ${record.service_code},
          ${record.service_name}, ${record.service_name},
          ${record.directorate}, ${record.directorate},
          ${record.department}, ${record.department},
          ${record.required_documents}, ${record.required_documents},
          ${record.fees}, ${record.fees},
          ${record.notes}, ${record.notes},
          ${insertedAt}, ${insertedAt}
        )
        ON CONFLICT (ministry, record_index) DO UPDATE SET
          source_filename = EXCLUDED.source_filename,
          source_service_code = EXCLUDED.source_service_code,
          source_service_name = EXCLUDED.source_service_name,
          service_name = CASE WHEN services.service_name = '' THEN EXCLUDED.service_name ELSE services.service_name END,
          source_directorate = EXCLUDED.source_directorate,
          directorate = CASE WHEN services.directorate = '' THEN EXCLUDED.directorate ELSE services.directorate END,
          source_department = EXCLUDED.source_department,
          department = CASE WHEN services.department = '' THEN EXCLUDED.department ELSE services.department END,
          source_required_documents = EXCLUDED.source_required_documents,
          required_documents = CASE WHEN services.required_documents = '' THEN EXCLUDED.required_documents ELSE services.required_documents END,
          source_fees = EXCLUDED.source_fees,
          fees = CASE WHEN services.fees = '' THEN EXCLUDED.fees ELSE services.fees END,
          source_notes = EXCLUDED.source_notes,
          notes = CASE WHEN services.notes = '' THEN EXCLUDED.notes ELSE services.notes END
      `;
    }
  });
}

async function ensureDatabaseReady() {
  if (ready) return;
  if (!initPromise) {
    initPromise = (async () => {
      const db = getSql();
      await migrate(db);
      await seed(db);
      ready = true;
    })().catch((err) => { initPromise = undefined; ready = false; throw err; });
  }
  await initPromise;
}

function mapRow(row) {
  return {
    id: row.id,
    record_index: row.record_index,
    ministry: row.ministry,
    source_service_code: row.source_service_code || '',
    service_code: row.service_code || '',
    source_service_name: row.source_service_name || '',
    service_name: row.service_name || '',
    source_directorate: row.source_directorate || '',
    directorate: row.directorate || '',
    source_department: row.source_department || '',
    department: row.department || '',
    source_required_documents: row.source_required_documents || '',
    required_documents: row.required_documents || '',
    source_fees: row.source_fees || '',
    fees: row.fees || '',
    source_notes: row.source_notes || '',
    notes: row.notes || '',
    updated_at: row.updated_at,
    qa_status: row.qa_status || 'pending',
    corrected_required_documents: row.corrected_required_documents || '',
    qa_note: row.qa_note || '',
    qa_updated_at: row.qa_updated_at || null
  };
}

export async function getState() {
  await ensureDatabaseReady();
  const db = getSql();

  const rows = (await db`
    SELECT s.*, q.status AS qa_status, q.corrected_required_documents, q.qa_note, q.updated_at AS qa_updated_at
    FROM services s
    LEFT JOIN qa_reviews q ON q.service_id = s.id
    WHERE s.ministry = ${MINISTRY_KEY}
    ORDER BY s.record_index ASC
  `).map(mapRow);

  const qa = {};
  rows.forEach((row) => {
    if (row.qa_status === 'validated' || row.qa_status === 'no') {
      qa[`record-${row.record_index}`] = {
        status: row.qa_status,
        corrected_required_documents: row.corrected_required_documents,
        qa_note: row.qa_note,
        updated_at: row.qa_updated_at
      };
    }
  });

  return { ok: true, database: 'postgres', db_file: 'DATABASE_URL', updated_at: now(), records: rows, qa };
}

async function getServiceByIndex(db, recordIndex) {
  const [service] = await db`SELECT * FROM services WHERE ministry = ${MINISTRY_KEY} AND record_index = ${recordIndex}`;
  if (!service) throw new Error(`Record ${recordIndex + 1} was not found.`);
  return service;
}

async function insertAudit(db, serviceId, action, fieldName = null, oldValue = null, newValue = null) {
  await db`
    INSERT INTO audit_log (service_id, action, field_name, old_value, new_value, created_at)
    VALUES (${serviceId}, ${action}, ${fieldName}, ${oldValue}, ${newValue}, ${now()})
  `;
}

export async function updateRecord(recordIndex, patch) {
  if (!Number.isInteger(recordIndex) || recordIndex < 0) throw new Error('record_index must be a zero-based integer.');

  const cleanPatch = {};
  EDITABLE_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(patch || {}, field)) cleanPatch[field] = String(patch[field] ?? '');
  });
  if (!Object.keys(cleanPatch).length) return getState();

  await ensureDatabaseReady();
  const db = getSql();
  const updatedAt = now();

  await db.begin(async (tx) => {
    const service = await getServiceByIndex(tx, recordIndex);
    const update = {};
    for (const [field, value] of Object.entries(cleanPatch)) {
      if (service[field] !== value) update[field] = value;
    }
    if (Object.keys(update).length) {
      update.updated_at = updatedAt;
      await tx`UPDATE services SET ${tx(update)} WHERE id = ${service.id}`;
      for (const [field, value] of Object.entries(update)) {
        if (field !== 'updated_at') await insertAudit(tx, service.id, 'update_record', field, service[field], value);
      }
    }
  });

  return getState();
}

export async function resetRecordEdits(recordIndex) {
  if (!Number.isInteger(recordIndex) || recordIndex < 0) throw new Error('record_index must be a zero-based integer.');

  await ensureDatabaseReady();
  const db = getSql();
  const updatedAt = now();

  await db.begin(async (tx) => {
    const service = await getServiceByIndex(tx, recordIndex);
    await tx`
      UPDATE services SET
        service_name = source_service_name,
        directorate = source_directorate,
        department = source_department,
        required_documents = source_required_documents,
        fees = source_fees,
        notes = source_notes,
        updated_at = ${updatedAt}
      WHERE id = ${service.id}
    `;
    await insertAudit(tx, service.id, 'reset_record_edits');
  });

  return getState();
}

export async function saveQA(recordIndex, status, correctedRequiredDocuments = '', qaNote = '') {
  if (!Number.isInteger(recordIndex) || recordIndex < 0) throw new Error('record_index must be a zero-based integer.');
  if (!['validated', 'no'].includes(status)) throw new Error('status must be either validated or no.');

  await ensureDatabaseReady();
  const db = getSql();
  const updatedAt = now();

  await db.begin(async (tx) => {
    const service = await getServiceByIndex(tx, recordIndex);
    await tx`
      INSERT INTO qa_reviews (service_id, status, corrected_required_documents, qa_note, created_at, updated_at)
      VALUES (${service.id}, ${status}, ${String(correctedRequiredDocuments || '')}, ${String(qaNote || '')}, ${updatedAt}, ${updatedAt})
      ON CONFLICT(service_id) DO UPDATE SET
        status = EXCLUDED.status,
        corrected_required_documents = EXCLUDED.corrected_required_documents,
        qa_note = EXCLUDED.qa_note,
        updated_at = EXCLUDED.updated_at
    `;
    await insertAudit(tx, service.id, 'save_qa', 'status', null, status);
  });

  return getState();
}

export async function clearQA(recordIndex) {
  if (!Number.isInteger(recordIndex) || recordIndex < 0) throw new Error('record_index must be a zero-based integer.');
  await ensureDatabaseReady();
  const db = getSql();
  await db.begin(async (tx) => {
    const service = await getServiceByIndex(tx, recordIndex);
    await tx`DELETE FROM qa_reviews WHERE service_id = ${service.id}`;
    await insertAudit(tx, service.id, 'clear_qa');
  });
  return getState();
}

export async function resetAllQA() {
  await ensureDatabaseReady();
  const db = getSql();
  await db.begin(async (tx) => {
    await tx`DELETE FROM qa_reviews WHERE service_id IN (SELECT id FROM services WHERE ministry = ${MINISTRY_KEY})`;
    await insertAudit(tx, null, 'reset_all_qa');
  });
  return getState();
}

export async function importRecords(correctedRecords) {
  if (!Array.isArray(correctedRecords)) throw new Error('corrected_records must be an array.');
  await ensureDatabaseReady();
  const db = getSql();
  const updatedAt = now();

  await db.begin(async (tx) => {
    for (const [index, record] of correctedRecords.entries()) {
      const [service] = await tx`SELECT * FROM services WHERE ministry = ${MINISTRY_KEY} AND record_index = ${index}`;
      if (!service) continue;
      const patch = {};
      EDITABLE_FIELDS.forEach((field) => { if (typeof record?.[field] === 'string') patch[field] = record[field]; });
      if (Object.keys(patch).length) {
        patch.updated_at = updatedAt;
        await tx`UPDATE services SET ${tx(patch)} WHERE id = ${service.id}`;
        for (const [field, value] of Object.entries(patch)) {
          if (field !== 'updated_at') await insertAudit(tx, service.id, 'import_records', field, service[field], value);
        }
      }
    }
  });

  return getState();
}

export async function importQA(qa) {
  if (!qa || typeof qa !== 'object' || Array.isArray(qa)) throw new Error('qa must be an object keyed by record id.');
  await ensureDatabaseReady();
  const db = getSql();
  const updatedAt = now();

  await db.begin(async (tx) => {
    await tx`DELETE FROM qa_reviews WHERE service_id IN (SELECT id FROM services WHERE ministry = ${MINISTRY_KEY})`;
    for (const [key, value] of Object.entries(qa)) {
      const match = key.match(/^record-(\d+)$/);
      if (!match) continue;
      const recordIndex = Number(match[1]);
      if (!Number.isInteger(recordIndex) || recordIndex < 0) continue;
      if (!['validated', 'no'].includes(value?.status)) continue;
      const [service] = await tx`SELECT id FROM services WHERE ministry = ${MINISTRY_KEY} AND record_index = ${recordIndex}`;
      if (!service) continue;
      await tx`
        INSERT INTO qa_reviews (service_id, status, corrected_required_documents, qa_note, created_at, updated_at)
        VALUES (${service.id}, ${value.status}, ${String(value.corrected_required_documents || '')}, ${String(value.qa_note || '')}, ${updatedAt}, ${value.updated_at || updatedAt})
      `;
    }
    await insertAudit(tx, null, 'import_qa');
  });

  return getState();
}

export async function addService(serviceName) {
  await ensureDatabaseReady();
  const db = getSql();
  const createdAt = now();
  const [{ max_index }] = await db`SELECT COALESCE(MAX(record_index), -1) AS max_index FROM services WHERE ministry = ${MINISTRY_KEY}`;
  const newIndex = Number(max_index) + 1;
  const [newService] = await db`
    INSERT INTO services (
      record_index, ministry, source_filename, filename,
      source_service_code, service_code,
      source_service_name, service_name,
      source_directorate, directorate,
      source_department, department,
      source_required_documents, required_documents,
      source_fees, fees,
      source_notes, notes,
      created_at, updated_at
    ) VALUES (
      ${newIndex}, ${MINISTRY_KEY}, '', '',
      '', '',
      ${String(serviceName)}, ${String(serviceName)},
      '', '',
      '', '',
      '', '',
      '', '',
      '', '',
      ${createdAt}, ${createdAt}
    ) RETURNING id
  `;
  await insertAudit(db, newService.id, 'add_service', 'service_name', null, String(serviceName));
  return getState();
}

export async function deleteService(recordIndex) {
  if (!Number.isInteger(recordIndex) || recordIndex < 0) throw new Error('record_index must be a zero-based integer.');
  await ensureDatabaseReady();
  const db = getSql();
  await db.begin(async (tx) => {
    const service = await getServiceByIndex(tx, recordIndex);
    await insertAudit(tx, service.id, 'delete_service', 'service_name', service.service_name, null);
    await tx`DELETE FROM services WHERE id = ${service.id}`;
  });
  return getState();
}

export async function getAuditLog(limit = 200) {
  await ensureDatabaseReady();
  const db = getSql();
  const cleanLimit = Math.min(Math.max(Number(limit) || 200, 1), 1000);
  return db`SELECT id, service_id, action, field_name, old_value, new_value, created_at FROM audit_log ORDER BY id DESC LIMIT ${cleanLimit}`;
}
