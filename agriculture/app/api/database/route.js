import { NextResponse } from 'next/server';
import { addAttachment, addService, clearQA, deleteAttachment, deleteService, getAttachmentData, getAuditLog, getState, importQA, importRecords, resetAllQA, resetRecordEdits, saveAndValidate, saveQA, updateRecord, uploadSourceJson } from '@/lib/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonError(error, status) {
  const responseStatus = Number.isInteger(status)
    ? status
    : (Number.isInteger(error?.statusCode) ? error.statusCode : 500);
  const payload = { ok: false, error: error?.message || 'Database error.' };
  if (Array.isArray(error?.missingFields)) payload.missing_fields = error.missingFields;
  return NextResponse.json(payload, { status: responseStatus });
}

const SAFE_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream'
]);

function normalizedDownloadType(value) {
  const type = String(value || '').split(';', 1)[0].trim().toLowerCase();
  return SAFE_ATTACHMENT_TYPES.has(type) ? type : 'application/octet-stream';
}

function contentDisposition(filename) {
  const cleanedName = String(filename || 'attachment')
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, '_')
    .replace(/[\\/]/g, '_')
    .trim() || 'attachment';
  const safeName = Array.from(cleanedName).slice(0, 200).join('');
  const asciiFallback = safeName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  const utf8Name = encodeURIComponent(safeName)
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Name}`;
}

function decodeBase64(value) {
  const normalized = String(value || '').replace(/\s+/g, '');
  if (!normalized || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 !== 0) {
    throw new Error('Stored attachment data is not valid base64.');
  }
  const bytes = Buffer.from(normalized, 'base64');
  if (bytes.toString('base64').replace(/=+$/g, '') !== normalized.replace(/=+$/g, '')) {
    throw new Error('Stored attachment data is not valid base64.');
  }
  return bytes;
}

function decodeAttachment(data, fallbackType) {
  const value = String(data || '');
  const commaIndex = value.indexOf(',');

  if (/^data:/i.test(value) && commaIndex >= 0) {
    const header = value.slice(0, commaIndex);
    const body = value.slice(commaIndex + 1);
    const base64Match = /^data:([^;,]*)(?:;[^;,=]+=[^;,]*)*;base64$/i.exec(header);
    if (base64Match) {
      return {
        bytes: decodeBase64(body),
        type: normalizedDownloadType(base64Match[1] || fallbackType)
      };
    }

    const plainMatch = /^data:([^;,]*)$/i.exec(header);
    if (plainMatch) {
      return {
        bytes: Buffer.from(decodeURIComponent(body), 'utf8'),
        type: normalizedDownloadType(plainMatch[1] || fallbackType)
      };
    }
    throw new Error('Stored attachment data URL is invalid.');
  }

  return {
    bytes: decodeBase64(value),
    type: normalizedDownloadType(fallbackType)
  };
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get('audit') === '1') {
      return NextResponse.json({ ok: true, audit_log: await getAuditLog(Number(url.searchParams.get('limit') || 200)) });
    }
    if (url.searchParams.get('attachment_id')) {
      const attachment = await getAttachmentData(url.searchParams.get('attachment_id'));
      if (url.searchParams.get('download') === '1') {
        const { bytes, type } = decodeAttachment(attachment.data, attachment.type);
        return new NextResponse(bytes, {
          status: 200,
          headers: {
            'Content-Type': type,
            'Content-Disposition': contentDisposition(attachment.name),
            'Content-Length': String(bytes.length),
            'Cache-Control': 'private, no-store, max-age=0',
            'X-Content-Type-Options': 'nosniff'
          }
        });
      }
      return NextResponse.json(attachment);
    }
    return NextResponse.json(await getState());
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body?.action;

    switch (action) {
      case 'update_record':
        return NextResponse.json(await updateRecord(body.record_index, body.patch));
      case 'reset_record_edits':
        return NextResponse.json(await resetRecordEdits(body.record_index));
      case 'save_and_validate':
        return NextResponse.json(await saveAndValidate(body.record_index, body.record ?? body.patch));
      case 'save_qa':
        return NextResponse.json(await saveQA(body.record_index, body.status, body.corrected_required_documents || '', body.qa_note || ''));
      case 'clear_qa':
        return NextResponse.json(await clearQA(body.record_index));
      case 'reset_all_qa':
        return NextResponse.json(await resetAllQA());
      case 'import_records':
        return NextResponse.json(await importRecords(body.corrected_records));
      case 'import_qa':
        return NextResponse.json(await importQA(body.qa));
      case 'add_service': {
        const serviceName = String(body.service_name || '').trim();
        if (!serviceName) throw new Error('service_name is required.');
        return NextResponse.json(await addService(serviceName));
      }
      case 'delete_service':
        return NextResponse.json(await deleteService(body.record_index));
      case 'add_attachment':
        return NextResponse.json(await addAttachment(body.record_index, body.attachment));
      case 'delete_attachment':
        return NextResponse.json(await deleteAttachment(body.attachment_id));
      case 'upload_source_json':
        if (!Array.isArray(body.records)) throw new Error('records must be an array.');
        return NextResponse.json(await uploadSourceJson(
          body.records,
          body.confirm_delete_attachments === true,
          body.expected_attachment_count
        ));
      default:
        return jsonError(new Error('Unknown database action.'), 400);
    }
  } catch (error) {
    return jsonError(error);
  }
}
