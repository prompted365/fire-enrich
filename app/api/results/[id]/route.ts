import { NextResponse, NextRequest } from 'next/server';
import { initDB, createTablesIfNotExists, getSessionResults } from '@/lib/services/db';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await initDB();
    await createTablesIfNotExists();
    const results = await getSessionResults(params.id);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Failed to fetch session results:', error);
    return NextResponse.json({ error: 'Failed to fetch session results' }, { status: 500 });
  }
}
