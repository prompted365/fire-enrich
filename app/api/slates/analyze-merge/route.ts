import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slate1Fields, slate2Fields, slate1Sample, slate2Sample } = body;

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Use AI to suggest field mappings
    const prompt = `You are a data merging expert. Given two datasets with different column names, suggest intelligent field mappings.

Dataset 1 columns: ${slate1Fields.join(', ')}
Sample data from Dataset 1: ${JSON.stringify(slate1Sample)}

Dataset 2 columns: ${slate2Fields.join(', ')}
Sample data from Dataset 2: ${JSON.stringify(slate2Sample)}

Analyze the column names and sample data to suggest which fields should be mapped together when merging these datasets.
Also suggest which fields are unique to each dataset and how to handle them.
Suggest a merge strategy (e.g., LEFT JOIN, FULL OUTER JOIN, etc.) and which fields to use as merge keys.

Respond in JSON format:
{
  "mergeStrategy": "LEFT_JOIN" | "RIGHT_JOIN" | "FULL_OUTER_JOIN" | "INNER_JOIN",
  "mergeKeys": [
    { "slate1Field": "field_name", "slate2Field": "field_name", "confidence": 0.95, "reason": "explanation" }
  ],
  "fieldMappings": [
    { "slate1Field": "field_name", "slate2Field": "field_name", "confidence": 0.85, "reason": "explanation" }
  ],
  "uniqueFields": {
    "slate1Only": ["field1", "field2"],
    "slate2Only": ["field3", "field4"]
  },
  "recommendedName": "Suggested name for merged slate",
  "warnings": ["any potential issues or data loss warnings"]
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a data merging expert. Respond only with valid JSON, no markdown or code blocks.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API request failed');
    }

    const aiResult = await openaiResponse.json();
    const mergeAnalysis = JSON.parse(aiResult.choices[0].message.content);

    return NextResponse.json({
      success: true,
      analysis: mergeAnalysis
    });

  } catch (error) {
    console.error('Error analyzing merge:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze merge',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
