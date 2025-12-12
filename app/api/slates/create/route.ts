import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/services/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name = 'Untitled Slate', columns = ['Column 1', 'Column 2', 'Column 3'], rows = [] } = body;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create a new enrichment session for the slate
      const sessionResult = await client.query(
        `INSERT INTO enrichment_sessions 
         (row_count, field_count, status, session_data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id`,
        [rows.length || 0, columns.length, 'pending', JSON.stringify({ name, is_slate: true })]
      );

      const sessionId = sessionResult.rows[0].id;

      // Insert initial rows if provided
      if (rows.length > 0) {
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          const row = rows[rowIndex];
          
          for (const column of columns) {
            const value = row[column] || '';
            
            if (value) {
              await client.query(
                `INSERT INTO enrichment_results 
                 (session_id, row_index, field, value)
                 VALUES ($1, $2, $3, $4)`,
                [sessionId, rowIndex, column, value]
              );
            }
          }
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        sessionId,
        message: 'Slate created successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating slate:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create slate',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
