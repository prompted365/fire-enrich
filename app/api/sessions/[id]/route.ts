import { NextRequest, NextResponse } from 'next/server';
import { initDB, getSessionMetadata, getSessionResults } from '@/lib/services/db';
import type { RowEnrichmentResult } from '@/lib/types';

// Use Node.js runtime for database drivers
export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await initDB();
    const sessionId = params.id;

    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const format = (searchParams.get('format') || 'json').toLowerCase();

    const metadata = await getSessionMetadata(sessionId);
    if (!metadata) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const offset = (page - 1) * pageSize;
    const results = await getSessionResults(sessionId, offset, pageSize);

    if (format === 'csv') {
      const csv = resultsToCSV(results);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="session_${sessionId}.csv"`
        }
      });
    }

    return NextResponse.json({ metadata, results, page, pageSize });
  } catch (error) {
    console.error('Failed to fetch session data:', error);
    return NextResponse.json({ error: 'Failed to fetch session data' }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function resultsToCSV(results: RowEnrichmentResult[]): string {
  if (results.length === 0) return '';

  const enrichmentFields = new Set<string>();
  const originalFields = Object.keys(results[0].originalData || {});

  for (const r of results) {
    Object.keys(r.enrichments).forEach(f => enrichmentFields.add(f));
  }

  const headers = [
    'rowIndex',
    'status',
    'error',
    ...originalFields,
    ...Array.from(enrichmentFields)
  ];

  const lines = [headers.join(',')];

  for (const r of results) {
    const values: string[] = [];
    values.push(String(r.rowIndex));
    values.push(r.status);
    values.push(r.error ? escapeCSV(r.error) : '');
    originalFields.forEach(f => values.push(escapeCSV(r.originalData[f] || '')));
    Array.from(enrichmentFields).forEach(f => {
      const val = r.enrichments[f]?.value;
      if (val === undefined || val === null) {
        values.push('');
      } else if (Array.isArray(val)) {
        values.push(escapeCSV(val.join('; ')));
      } else {
        values.push(escapeCSV(String(val)));
      }
    });
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

