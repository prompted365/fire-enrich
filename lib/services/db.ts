import { Pool } from 'pg';
import { Client as CassandraClient } from 'cassandra-driver';
import type { EnrichmentSession, RowEnrichmentResult } from '../types';

let pgPool: Pool | null = null;
let cassandra: CassandraClient | null = null;

export async function initDB() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  if (url.startsWith('postgres')) {
    pgPool = new Pool({ connectionString: url });
  } else {
    const [contactPoints, keyspace] = url.replace('cassandra://', '').split('/');
    cassandra = new CassandraClient({ contactPoints: [contactPoints], localDataCenter: 'datacenter1', keyspace });
    await cassandra.connect();
  }
}

export async function createTablesIfNotExists() {
  if (pgPool) {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS enrichment_sessions (
        id TEXT PRIMARY KEY,
        total_rows INTEGER,
        processed_rows INTEGER,
        status TEXT,
        started_at TIMESTAMP
      );
    `);
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS enrichment_results (
        session_id TEXT,
        row_index INTEGER,
        data JSONB,
        PRIMARY KEY (session_id, row_index)
      );
    `);
  } else if (cassandra) {
    await cassandra.execute(
      `CREATE TABLE IF NOT EXISTS enrichment_sessions (
        id text PRIMARY KEY,
        total_rows int,
        processed_rows int,
        status text,
        started_at timestamp
      );`
    );
    await cassandra.execute(
      `CREATE TABLE IF NOT EXISTS enrichment_results (
        session_id text,
        row_index int,
        data text,
        PRIMARY KEY (session_id, row_index)
      );`
    );
  } else {
    throw new Error('Database not initialized');
  }
}

export async function saveEnrichmentSession(session: EnrichmentSession) {
  if (pgPool) {
    await pgPool.query(
      'INSERT INTO enrichment_sessions(id, total_rows, processed_rows, status, started_at) VALUES($1,$2,$3,$4,$5)',
      [session.id, session.totalRows, session.processedRows, session.status, session.startedAt]
    );
  } else if (cassandra) {
    await cassandra.execute(
      'INSERT INTO enrichment_sessions (id, total_rows, processed_rows, status, started_at) VALUES (?, ?, ?, ?, ?)',
      [session.id, session.totalRows, session.processedRows, session.status, session.startedAt],
      { prepare: true }
    );
  } else {
    throw new Error('Database not initialized');
  }
}

export async function saveRowResult(sessionId: string, result: RowEnrichmentResult) {
  if (pgPool) {
    await pgPool.query(
      'INSERT INTO enrichment_results(session_id, row_index, data) VALUES($1,$2,$3)',
      [sessionId, result.rowIndex, JSON.stringify(result)]
    );
  } else if (cassandra) {
    await cassandra.execute(
      'INSERT INTO enrichment_results (session_id, row_index, data) VALUES (?, ?, ?)',
      [sessionId, result.rowIndex, result],
      { prepare: true }
    );
  } else {
    throw new Error('Database not initialized');
  }
}

export async function incrementProcessedRows(sessionId: string) {
  if (pgPool) {
    await pgPool.query(
      'UPDATE enrichment_sessions SET processed_rows = processed_rows + 1 WHERE id = $1',
      [sessionId]
    );
  } else if (cassandra) {
    await cassandra.execute(
      'UPDATE enrichment_sessions SET processed_rows = processed_rows + 1 WHERE id = ?',
      [sessionId],
      { prepare: true }
    );
  } else {
    throw new Error('Database not initialized');
  }
}

export async function updateSessionStatus(sessionId: string, status: EnrichmentSession['status']) {
  if (pgPool) {
    await pgPool.query(
      'UPDATE enrichment_sessions SET status = $1 WHERE id = $2',
      [status, sessionId]
    );
  } else if (cassandra) {
    await cassandra.execute(
      'UPDATE enrichment_sessions SET status = ? WHERE id = ?',
      [status, sessionId],
      { prepare: true }
    );
  } else {
    throw new Error('Database not initialized');
  }
}

export async function getSessionResults(sessionId: string): Promise<RowEnrichmentResult[]> {
  if (pgPool) {
    const { rows } = await pgPool.query('SELECT data FROM enrichment_results WHERE session_id = $1 ORDER BY row_index', [sessionId]);
    return rows.map(r => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data));
  } else if (cassandra) {
    const result = await cassandra.execute(
      'SELECT data FROM enrichment_results WHERE session_id = ? ORDER BY row_index',
      [sessionId],
      { prepare: true }
    );
    return result.rows.map(r => (typeof r['data'] === 'string' ? JSON.parse(r['data']) : r['data']));
  } else {
    throw new Error('Database not initialized');
  }
// ------------------------------- Retrieval Helpers -------------------------------
// These helpers fetch session metadata and paginated row results. They mirror the
// save/update functions above but in reverse. In production a caching layer would
// likely sit in front; for now we directly query the database on each request.

export async function getSessionMetadata(sessionId: string): Promise<Omit<EnrichmentSession, 'results'> | null> {
  if (pgPool) {
    const res = await pgPool.query(
      'SELECT id, total_rows, processed_rows, status, started_at FROM enrichment_sessions WHERE id = $1',
      [sessionId]
    );
    if (res.rowCount === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      totalRows: row.total_rows,
      processedRows: row.processed_rows,
      status: row.status,
      startedAt: row.started_at,
    };
  } else if (cassandra) {
    const result = await cassandra.execute(
      'SELECT id, total_rows, processed_rows, status, started_at FROM enrichment_sessions WHERE id = ?',
      [sessionId],
      { prepare: true }
    );
    if (result.rowLength === 0) return null;
    const row = result.rows[0] as any;
    return {
      id: row.id,
      totalRows: row.total_rows,
      processedRows: row.processed_rows,
      status: row.status,
      startedAt: row.started_at,
    };
  }

  throw new Error('Database not initialized');
}

export async function getSessionResults(
  sessionId: string,
  offset: number = 0,
  limit: number = 50
): Promise<RowEnrichmentResult[]> {
  if (pgPool) {
    const res = await pgPool.query(
      'SELECT data FROM enrichment_results WHERE session_id = $1 ORDER BY row_index OFFSET $2 LIMIT $3',
      [sessionId, offset, limit]
    );
    return res.rows.map(r => r.data as RowEnrichmentResult);
  } else if (cassandra) {
    const result = await cassandra.execute(
      'SELECT data FROM enrichment_results WHERE session_id = ?',
      [sessionId],
      { prepare: true }
    );
    const all = result.rows.map(r => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data));
    return all.slice(offset, offset + limit) as RowEnrichmentResult[];
  }

  throw new Error('Database not initialized');
}
