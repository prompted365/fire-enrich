import { NextRequest, NextResponse } from 'next/server';
import { PDFReportGenerator } from '@/lib/utils/pdf-report-generator';

export const dynamic = 'force-dynamic';

interface AnalysisInsight {
  id: string;
  type: 'pattern' | 'anomaly' | 'prediction' | 'correlation' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  actionable?: boolean;
}

interface AnalysisResult {
  insights: AnalysisInsight[];
  summary: string;
  statistics: {
    totalRows: number;
    totalFields: number;
    completeness: number;
    averageConfidence: number;
  };
  timestamp: string;
}

interface RequestBody {
  analysis: AnalysisResult;
  sessionId?: string;
  sessionName?: string;
  includeRawData?: boolean;
  data?: Record<string, any>[];
  columns?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { analysis, sessionId, sessionName, includeRawData, data, columns } = body;

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis data is required' },
        { status: 400 }
      );
    }

    // Generate PDF report
    const generator = new PDFReportGenerator();
    const pdfBlob = generator.generateReport(analysis, {
      sessionId,
      sessionName,
      includeRawData,
      data,
      columns
    });

    // Convert blob to buffer for Next.js response
    const buffer = Buffer.from(await pdfBlob.arrayBuffer());

    // Create filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = sessionName 
      ? `${sessionName.replace(/[^a-z0-9]/gi, '-')}-analysis-${timestamp}.pdf`
      : `analysis-report-${timestamp}.pdf`;

    // Return PDF as downloadable response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating PDF report:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF report' },
      { status: 500 }
    );
  }
}
