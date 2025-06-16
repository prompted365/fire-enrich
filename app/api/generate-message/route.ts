import { NextRequest, NextResponse } from 'next/server';
import { OpenAIService } from '@/lib/services/openai';
import type { MessageParams } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MessageParams;
    const templateName = request.nextUrl.searchParams.get('template') || body.templateName;
    const params: MessageParams = { ...body, templateName };

    if (!params.goal || !params.representative || !params.organization) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY || request.headers.get('X-OpenAI-API-Key');
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const openai = new OpenAIService(apiKey);
    const message = await openai.generateMessage(params);

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Message generation error:', error);
    return NextResponse.json({ error: 'Failed to generate message' }, { status: 500 });
  }
}
