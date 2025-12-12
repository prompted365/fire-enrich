import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/services/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Get sessions with metadata
    const sessionsQuery = `
      SELECT 
        s.id,
        s.created_at,
        s.email_column,
        s.fields,
        COUNT(r.id) as row_count,
        array_length(s.fields, 1) as field_count
      FROM enrichment_sessions s
      LEFT JOIN enrichment_results r ON r.session_id = s.id
      GROUP BY s.id, s.created_at, s.email_column, s.fields
      ORDER BY s.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const sessions = await query(sessionsQuery, [limit, offset]);

    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM enrichment_sessions';
    const countResult = await query(countQuery);
    const total = parseInt(countResult.rows[0]?.total || '0');

    return NextResponse.json({
      sessions: sessions.rows.map(row => ({
        id: row.id,
        created_at: row.created_at,
        email_column: row.email_column,
        fields: row.fields,
        row_count: parseInt(row.row_count || '0'),
        field_count: parseInt(row.field_count || '0'),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions', details: error.message },
      { status: 500 }
    );
  }
}
