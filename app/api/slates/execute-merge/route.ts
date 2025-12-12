import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/services/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      slate1Id,
      slate2Id,
      mergeStrategy,
      mergeKeys,
      fieldMappings,
      newSlateName
    } = body;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Fetch data from both slates
      const slate1Result = await client.query(
        `SELECT er.*, es.session_data 
         FROM enrichment_results er
         JOIN enrichment_sessions es ON er.session_id = es.id
         WHERE er.session_id = $1
         ORDER BY er.row_index, er.field`,
        [slate1Id]
      );

      const slate2Result = await client.query(
        `SELECT er.*, es.session_data 
         FROM enrichment_results er
         JOIN enrichment_sessions es ON er.session_id = es.id
         WHERE er.session_id = $1
         ORDER BY er.row_index, er.field`,
        [slate2Id]
      );

      // Transform results into row-based format
      const slate1Data = transformToRows(slate1Result.rows);
      const slate2Data = transformToRows(slate2Result.rows);

      // Perform the merge based on strategy and keys
      const mergedData = performMerge(
        slate1Data,
        slate2Data,
        mergeStrategy,
        mergeKeys,
        fieldMappings
      );

      // Get all unique columns from merged data
      const allColumns = Array.from(
        new Set(mergedData.flatMap(row => Object.keys(row)))
      );

      // Create new session for merged slate
      const sessionResult = await client.query(
        `INSERT INTO enrichment_sessions 
         (row_count, field_count, status, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        [
          mergedData.length,
          allColumns.length,
          'completed'
        ]
      );

      const newSessionId = sessionResult.rows[0].id;

      // Insert merged data
      for (let rowIndex = 0; rowIndex < mergedData.length; rowIndex++) {
        const row = mergedData[rowIndex];
        
        for (const [field, value] of Object.entries(row)) {
          if (value !== null && value !== undefined && value !== '') {
            await client.query(
              `INSERT INTO enrichment_results 
               (session_id, row_index, field, value)
               VALUES ($1, $2, $3, $4)`,
              [newSessionId, rowIndex, field, String(value)]
            );
          }
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        sessionId: newSessionId,
        rowCount: mergedData.length,
        fieldCount: allColumns.length
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error executing merge:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute merge',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function transformToRows(results: any[]): Record<string, any>[] {
  const rowMap = new Map<number, Record<string, any>>();
  
  for (const result of results) {
    if (!rowMap.has(result.row_index)) {
      rowMap.set(result.row_index, {});
    }
    rowMap.get(result.row_index)![result.field] = result.value;
  }
  
  return Array.from(rowMap.values());
}

function performMerge(
  slate1: Record<string, any>[],
  slate2: Record<string, any>[],
  strategy: string,
  mergeKeys: Array<{ slate1Field: string; slate2Field: string }>,
  fieldMappings: Array<{ slate1Field: string; slate2Field: string }>
): Record<string, any>[] {
  const merged: Record<string, any>[] = [];
  
  // Create a map for slate2 rows based on merge keys
  const slate2Map = new Map<string, Record<string, any>>();
  for (const row of slate2) {
    const keyValues = mergeKeys.map(mk => row[mk.slate2Field] || '').join('|');
    slate2Map.set(keyValues, row);
  }

  // Perform merge based on strategy
  for (const row1 of slate1) {
    const keyValues = mergeKeys.map(mk => row1[mk.slate1Field] || '').join('|');
    const row2 = slate2Map.get(keyValues);

    if (row2) {
      // Match found - merge the rows
      const mergedRow = { ...row1 };
      
      // Apply field mappings
      for (const mapping of fieldMappings) {
        if (row2[mapping.slate2Field]) {
          mergedRow[mapping.slate1Field] = row2[mapping.slate2Field];
        }
      }
      
      // Add unique fields from slate2
      for (const [key, value] of Object.entries(row2)) {
        const isMapped = fieldMappings.some(m => m.slate2Field === key);
        const isMergeKey = mergeKeys.some(mk => mk.slate2Field === key);
        if (!isMapped && !isMergeKey && value) {
          mergedRow[key] = value;
        }
      }
      
      merged.push(mergedRow);
      slate2Map.delete(keyValues); // Mark as processed
    } else if (strategy === 'LEFT_JOIN' || strategy === 'FULL_OUTER_JOIN') {
      // Include row1 even without match
      merged.push({ ...row1 });
    }
  }

  // For FULL_OUTER_JOIN and RIGHT_JOIN, include unmatched rows from slate2
  if (strategy === 'FULL_OUTER_JOIN' || strategy === 'RIGHT_JOIN') {
    for (const row2 of slate2Map.values()) {
      const mergedRow: Record<string, any> = {};
      
      // Reverse map slate2 fields to slate1 field names
      for (const [key, value] of Object.entries(row2)) {
        const mapping = fieldMappings.find(m => m.slate2Field === key);
        if (mapping) {
          mergedRow[mapping.slate1Field] = value;
        } else {
          mergedRow[key] = value;
        }
      }
      
      merged.push(mergedRow);
    }
  }

  return merged;
}
