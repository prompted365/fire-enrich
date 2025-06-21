import { Pool } from 'pg';
import { Client as CassandraClient } from 'cassandra-driver';
import type { EnrichmentSession, RowEnrichmentResult } from '../types';
import type { EnrichmentMetrics } from './feedback';
import fs from 'fs/promises';
import path from 'path';

let pgPool: Pool | null = null;
let cassandra: CassandraClient | null = null;

// P&C Platform Types
export interface Agency {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface AgencySettingsData {
  agency_id: string;
  new_business_comp_pct?: number;
  first_renewal_comp_pct?: number;
  renewal_comp_pct?: number;
  retention_rate_pct?: number;
}

export interface AgencySettings extends AgencySettingsData {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export interface DailyActivityData {
  agency_id: string;
  activity_date: string; // YYYY-MM-DD
  dials?: number;
  contacts?: number;
  transfers?: number;
  quoted_transfers?: number;
  failed_transfers?: number;
  sales_qty?: number;
  premium_sold?: number;
  marketing_spend?: number;
  lead_cost?: number;
}

export interface DailyActivity extends DailyActivityData {
  id: string;
  created_at: Date;
  updated_at: Date;
}


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
    // Standard Enrichment Tables
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
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS enrichment_metrics (
        session_id TEXT PRIMARY KEY,
        average_confidence REAL,
        missing_fields JSONB,
        error_count INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // P&C Platform Tables
    try {
      const pandcSchemaPath = path.join(process.cwd(), 'sql', 'pandc_schema.sql');
      const pandcSchemaSQL = await fs.readFile(pandcSchemaPath, 'utf-8');
      await pgPool.query(pandcSchemaSQL);
      console.log('P&C tables created/verified successfully.');
    } catch (error) {
      console.error('Error creating P&C tables:', error);
      throw error; // Re-throw to indicate a problem with setup
    }

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
    await cassandra.execute(
      `CREATE TABLE IF NOT EXISTS enrichment_metrics (
        session_id text PRIMARY KEY,
        average_confidence double,
        missing_fields text,
        error_count int,
        created_at timestamp
      );`
    );
  } else {
    throw new Error('Database not initialized');
  }
}

// --- P&C Platform Database Functions ---

export async function createAgency(name: string): Promise<Agency> {
  if (!pgPool) throw new Error('PostgreSQL pool not initialized.');
  const res = await pgPool.query(
    'INSERT INTO agencies (name) VALUES ($1) RETURNING *',
    [name]
  );
  return res.rows[0] as Agency;
}

export async function getAgencyById(id: string): Promise<Agency | null> {
  if (!pgPool) throw new Error('PostgreSQL pool not initialized.');
  const res = await pgPool.query('SELECT * FROM agencies WHERE id = $1', [id]);
  return res.rowCount ? res.rows[0] as Agency : null;
}

export async function getAllAgencies(): Promise<Agency[]> {
  if (!pgPool) throw new Error('PostgreSQL pool not initialized.');
  const res = await pgPool.query('SELECT * FROM agencies ORDER BY name');
  return res.rows as Agency[];
}

export async function createOrUpdateAgencySettings(settingsData: AgencySettingsData): Promise<AgencySettings> {
  if (!pgPool) throw new Error('PostgreSQL pool not initialized.');
  const {
    agency_id,
    new_business_comp_pct = 15.00,
    first_renewal_comp_pct = 10.00,
    renewal_comp_pct = 8.00,
    retention_rate_pct = 75.00,
  } = settingsData;

  const res = await pgPool.query(
    `INSERT INTO agency_settings (agency_id, new_business_comp_pct, first_renewal_comp_pct, renewal_comp_pct, retention_rate_pct)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (agency_id) DO UPDATE SET
       new_business_comp_pct = EXCLUDED.new_business_comp_pct,
       first_renewal_comp_pct = EXCLUDED.first_renewal_comp_pct,
       renewal_comp_pct = EXCLUDED.renewal_comp_pct,
       retention_rate_pct = EXCLUDED.retention_rate_pct,
       updated_at = NOW()
     RETURNING *`,
    [agency_id, new_business_comp_pct, first_renewal_comp_pct, renewal_comp_pct, retention_rate_pct]
  );
  return res.rows[0] as AgencySettings;
}

export async function getAgencySettings(agencyId: string): Promise<AgencySettings | null> {
  if (!pgPool) throw new Error('PostgreSQL pool not initialized.');
  const res = await pgPool.query('SELECT * FROM agency_settings WHERE agency_id = $1', [agencyId]);
  return res.rowCount ? res.rows[0] as AgencySettings : null;
}

export async function logDailyActivity(activityData: DailyActivityData): Promise<DailyActivity> {
  if (!pgPool) throw new Error('PostgreSQL pool not initialized.');
  const {
    agency_id,
    activity_date,
    dials = 0,
    contacts = 0,
    transfers = 0,
    quoted_transfers = 0,
    failed_transfers = 0,
    sales_qty = 0,
    premium_sold = 0,
    marketing_spend = 0,
    lead_cost = 0,
  } = activityData;

  const res = await pgPool.query(
    `INSERT INTO daily_activities (
       agency_id, activity_date, dials, contacts, transfers, quoted_transfers,
       failed_transfers, sales_qty, premium_sold, marketing_spend, lead_cost
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (agency_id, activity_date) DO UPDATE SET
       dials = EXCLUDED.dials,
       contacts = EXCLUDED.contacts,
       transfers = EXCLUDED.transfers,
       quoted_transfers = EXCLUDED.quoted_transfers,
       failed_transfers = EXCLUDED.failed_transfers,
       sales_qty = EXCLUDED.sales_qty,
       premium_sold = EXCLUDED.premium_sold,
       marketing_spend = EXCLUDED.marketing_spend,
       lead_cost = EXCLUDED.lead_cost,
       updated_at = NOW()
     RETURNING *`,
    [
      agency_id, activity_date, dials, contacts, transfers, quoted_transfers,
      failed_transfers, sales_qty, premium_sold, marketing_spend, lead_cost
    ]
  );
  return res.rows[0] as DailyActivity;
}

export async function getDailyActivitiesForAgency(
  agencyId: string,
  startDate?: string,
  endDate?: string
): Promise<DailyActivity[]> {
  if (!pgPool) throw new Error('PostgreSQL pool not initialized.');

  let query = 'SELECT * FROM daily_activities WHERE agency_id = $1';
  const params: any[] = [agencyId];

  if (startDate && endDate) {
    query += ' AND activity_date BETWEEN $2 AND $3';
    params.push(startDate, endDate);
  } else if (startDate) {
    query += ' AND activity_date >= $2';
    params.push(startDate);
  } else if (endDate) {
    query += ' AND activity_date <= $2';
    params.push(endDate);
  }

  query += ' ORDER BY activity_date DESC';

  const res = await pgPool.query(query, params);
  return res.rows as DailyActivity[];
}

// --- End P&C Platform Database Functions ---


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

export async function saveEnrichmentMetrics(sessionId: string, metrics: EnrichmentMetrics) {
  if (pgPool) {
    await pgPool.query(
      'INSERT INTO enrichment_metrics(session_id, average_confidence, missing_fields, error_count) VALUES($1,$2,$3,$4) ON CONFLICT (session_id) DO UPDATE SET average_confidence = EXCLUDED.average_confidence, missing_fields = EXCLUDED.missing_fields, error_count = EXCLUDED.error_count',
      [sessionId, metrics.averageConfidence, JSON.stringify(metrics.missingFields), metrics.errorCount]
    );
  } else if (cassandra) {
    await cassandra.execute(
      'INSERT INTO enrichment_metrics (session_id, average_confidence, missing_fields, error_count, created_at) VALUES (?, ?, ?, ?, toTimestamp(now()))',
      [sessionId, metrics.averageConfidence, JSON.stringify(metrics.missingFields), metrics.errorCount],
      { prepare: true }
    );
  } else {
    throw new Error('Database not initialized');
  }
}

export async function getEnrichmentMetrics(sessionId: string): Promise<EnrichmentMetrics | null> {
  if (pgPool) {
    const res = await pgPool.query(
      'SELECT average_confidence, missing_fields, error_count FROM enrichment_metrics WHERE session_id = $1',
      [sessionId]
    );
    if (res.rowCount === 0) return null;
    return {
      averageConfidence: res.rows[0].average_confidence,
      missingFields: res.rows[0].missing_fields,
      errorCount: res.rows[0].error_count,
    };
  } else if (cassandra) {
    const result = await cassandra.execute(
      'SELECT average_confidence, missing_fields, error_count FROM enrichment_metrics WHERE session_id = ?',
      [sessionId],
      { prepare: true }
    );
    if (result.rowLength === 0) return null;
    const row = result.rows[0] as any;
    return {
      averageConfidence: row['average_confidence'],
      missingFields: JSON.parse(row['missing_fields'] || '{}'),
      errorCount: row['error_count'],
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
