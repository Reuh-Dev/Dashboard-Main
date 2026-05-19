import { NextResponse } from 'next/server';
import { addService, clearQA, deleteService, getAuditLog, getState, importQA, importRecords, resetAllQA, resetRecordEdits, saveQA, updateRecord } from '@/lib/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonError(error, status = 500) {
  return NextResponse.json({ ok: false, error: error?.message || 'Database error.' }, { status });
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get('audit') === '1') {
      return NextResponse.json({ ok: true, audit_log: await getAuditLog(url.searchParams.get('limit') || 200) });
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
      default:
        return jsonError(new Error('Unknown database action.'), 400);
    }
  } catch (error) {
    return jsonError(error);
  }
}
