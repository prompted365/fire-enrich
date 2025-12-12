import { NextRequest, NextResponse } from 'next/server';
import { AnalysisAgent } from '@/lib/agents/analysis-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, column } = body;

    if (!data || !Array.isArray(data) || !column) {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      );
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const agent = new AnalysisAgent(OPENAI_API_KEY);
    const stats = await agent.calculateDescriptiveStats(data, column);

    if (!stats) {
      return NextResponse.json(
        { error: 'Unable to calculate statistics for this column' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error('Error calculating statistics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
