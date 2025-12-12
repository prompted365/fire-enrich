import { NextRequest, NextResponse } from 'next/server';
import { AnalysisAgent } from '@/lib/agents/analysis-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, columns, options } = body;

    if (!data || !Array.isArray(data) || !columns || !Array.isArray(columns)) {
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
    const result = await agent.analyzeSlate(data, columns, options);

    return NextResponse.json({
      success: true,
      analysis: result,
    });

  } catch (error) {
    console.error('Error analyzing slate:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze slate',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
