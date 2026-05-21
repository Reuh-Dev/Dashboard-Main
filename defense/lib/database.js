import postgres from 'postgres';
import sourceData from '@/data/def_services.json';

const EDITABLE_FIELDS = ['service_name', 'directorate', 'department', 'unit', 'required_documents', 'fees', 'notes'];
const SOURCE_FILE = 'def_services.json';
const MINISTRY_KEY = 'defense';

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
    unit: clean(r?.unit),
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
    ['source_unit', "TEXT NOT NULL DEFAULT ''"],
    ['unit', "TEXT NOT NULL DEFAULT ''"],
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

  await db`
    CREATE TABLE IF NOT EXISTS qa_reviews (
      service_id INTEGER PRIMARY KEY REFERENCES services(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('validated', 'no', 'cancelled')),
      corrected_required_documents TEXT NOT NULL DEFAULT '',
      qa_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;

  // Migrate existing qa_reviews constraint to allow 'cancelled'
  await db.unsafe(`ALTER TABLE qa_reviews DROP CONSTRAINT IF EXISTS qa_reviews_status_check`);
  await db.unsafe(`ALTER TABLE qa_reviews ADD CONSTRAINT qa_reviews_status_check CHECK (status IN ('validated', 'no', 'cancelled'))`);

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

  await db`
    CREATE TABLE IF NOT EXISTS service_attachments (
      id SERIAL PRIMARY KEY,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      ministry TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      file_type TEXT NOT NULL DEFAULT '',
      size_bytes INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_service_attachments_service_id ON service_attachments(service_id)`;
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
          source_unit, unit,
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
          ${record.unit}, ${record.unit},
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
          source_unit = EXCLUDED.source_unit,
          unit = CASE WHEN services.unit = '' THEN EXCLUDED.unit ELSE services.unit END,
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
    source_unit: row.source_unit || '',
    unit: row.unit || '',
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
    qa_updated_at: row.qa_updated_at || null,
    attachments: Array.isArray(row.attachments) ? row.attachments : []
  };
}

export async function getState() {
  await ensureDatabaseReady();
  const db = getSql();

  const rows = (await db`
    SELECT s.*, q.status AS qa_status, q.corrected_required_documents, q.qa_note, q.updated_at AS qa_updated_at,
      COALESCE(
        json_agg(json_build_object('id', sa.id, 'name', sa.name, 'type', sa.file_type, 'size', sa.size_bytes, 'created_at', sa.created_at) ORDER BY sa.id ASC)
        FILTER (WHERE sa.id IS NOT NULL), '[]'::json
      ) AS attachments
    FROM services s
    LEFT JOIN qa_reviews q ON q.service_id = s.id
    LEFT JOIN service_attachments sa ON sa.service_id = s.id
    WHERE s.ministry = ${MINISTRY_KEY}
    GROUP BY s.id, q.status, q.corrected_required_documents, q.qa_note, q.updated_at
    ORDER BY s.record_index ASC
  `).map(mapRow);

  const qa = {};
  rows.forEach((row) => {
    if (row.qa_status === 'validated' || row.qa_status === 'no' || row.qa_status === 'cancelled') {
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
        unit = source_unit,
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
  if (!['validated', 'no', 'cancelled'].includes(status)) throw new Error('status must be validated, no, or cancelled.');

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

export async function addAttachment(recordIndex, attachment) {
  if (!Number.isInteger(recordIndex) || recordIndex < 0) throw new Error('record_index must be a zero-based integer.');
  const name = String(attachment?.name || '').slice(0, 200);
  const fileType = String(attachment?.type || '');
  const sizeBytes = Number(attachment?.size || 0);
  const data = String(attachment?.data || '');
  if (!name || !data) throw new Error('Attachment name and data are required.');

  await ensureDatabaseReady();
  const db = getSql();
  await db.begin(async (tx) => {
    const service = await getServiceByIndex(tx, recordIndex);
    const [{ count }] = await tx`SELECT COUNT(*) AS count FROM service_attachments WHERE service_id = ${service.id}`;
    if (Number(count) >= 5) throw new Error('Maximum 5 attachments per service.');
    await tx`INSERT INTO service_attachments (service_id, ministry, name, file_type, size_bytes, data, created_at) VALUES (${service.id}, ${MINISTRY_KEY}, ${name}, ${fileType}, ${sizeBytes}, ${data}, ${now()})`;
    await insertAudit(tx, service.id, 'add_attachment', 'attachments', null, name);
  });
  return getState();
}

export async function deleteAttachment(attachmentId) {
  const id = Number(attachmentId);
  if (!Number.isInteger(id) || id < 1) throw new Error('attachment_id must be a positive integer.');
  await ensureDatabaseReady();
  const db = getSql();
  await db.begin(async (tx) => {
    const [att] = await tx`SELECT sa.*, s.id AS sid FROM service_attachments sa JOIN services s ON s.id = sa.service_id WHERE sa.id = ${id} AND sa.ministry = ${MINISTRY_KEY}`;
    if (!att) throw new Error('Attachment not found.');
    await tx`DELETE FROM service_attachments WHERE id = ${id}`;
    await insertAudit(tx, att.sid, 'delete_attachment', 'attachments', att.name, null);
  });
  return getState();
}

export async function getAttachmentData(attachmentId) {
  const id = Number(attachmentId);
  if (!Number.isInteger(id) || id < 1) throw new Error('attachment_id must be a positive integer.');
  await ensureDatabaseReady();
  const db = getSql();
  const [att] = await db`SELECT data, name, file_type FROM service_attachments WHERE id = ${id} AND ministry = ${MINISTRY_KEY}`;
  if (!att) throw new Error('Attachment not found.');
  return { ok: true, data: att.data, name: att.name, type: att.file_type };
}

export async function getAuditLog(limit = 200) {
  await ensureDatabaseReady();
  const db = getSql();
  const cleanLimit = Math.min(Math.max(Number(limit) || 200, 1), 1000);
  return db`SELECT id, service_id, action, field_name, old_value, new_value, created_at FROM audit_log ORDER BY id DESC LIMIT ${cleanLimit}`;
}
