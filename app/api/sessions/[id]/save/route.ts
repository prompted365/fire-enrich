import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/services/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { data, columns } = body;

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update session metadata
      await client.query(
        `UPDATE enrichment_sessions 
         SET 
           row_count = $1,
           field_count = $2,
           updated_at = NOW()
         WHERE id = $3`,
        [data.length, columns?.length || Object.keys(data[0] || {}).length, id]
      );

      // Delete existing results for this session
      await client.query(
        'DELETE FROM enrichment_results WHERE session_id = $1',
        [id]
      );

      // Insert updated results
      for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
        const row = data[rowIndex];
        
        for (const [field, value] of Object.entries(row)) {
          // Skip empty values
          if (value === null || value === undefined || value === '') {
            continue;
          }

          // Parse enrichment metadata if present
          let parsedValue = value;
          let confidence = null;
          let sources = null;

          if (typeof value === 'object' && value !== null) {
            parsedValue = value.value || JSON.stringify(value);
            confidence = value.confidence || null;
            sources = value.sources ? JSON.stringify(value.sources) : null;
          }

          await client.query(
            `INSERT INTO enrichment_results 
             (session_id, row_index, field, value, confidence, sources)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, rowIndex, field, parsedValue, confidence, sources]
          );
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Session saved successfully',
        rowCount: data.length,
        fieldCount: columns?.length || Object.keys(data[0] || {}).length
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error saving session:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
