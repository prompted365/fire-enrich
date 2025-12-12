import { NextRequest, NextResponse } from 'next/server';
import { PDFReportGenerator } from '@/lib/utils/pdf-report-generator';
import { getReportTemplates, filterInsights, type ReportTemplate, type ReportOptions as TemplateOptions } from '@/lib/utils/report-templates';
import * as XLSX from 'xlsx';

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
  format?: 'pdf' | 'html' | 'excel';
  templateId?: string;
  customOptions?: TemplateOptions;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { 
      analysis, 
      sessionId,
      sessionName,
      includeRawData,
      data, 
      columns,
      format = 'pdf',
      templateId,
      customOptions 
    } = body;

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis data is required' },
        { status: 400 }
      );
    }

    // Handle different export formats
    switch (format) {
      case 'pdf':
        return await handlePDFExport(analysis, data, columns, templateId, customOptions, sessionName, includeRawData);
      
      case 'html':
        return await handleHTMLExport(analysis, data, columns, templateId, customOptions);
      
      case 'excel':
        return await handleExcelExport(analysis, data, columns);
      
      default:
        return NextResponse.json(
          { error: `Unsupported export format: ${format}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate export' },
      { status: 500 }
    );
  }
}

async function handlePDFExport(
  analysis: AnalysisResult,
  data: Record<string, any>[] | undefined,
  columns: string[] | undefined,
  templateId: string | undefined,
  customOptions: TemplateOptions | undefined,
  sessionName?: string,
  includeRawData?: boolean
): Promise<NextResponse> {
  const generator = new PDFReportGenerator();

  if (templateId && customOptions) {
    // Template-based export
    const templates = getReportTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
      return NextResponse.json(
        { error: `Template not found: ${templateId}` },
        { status: 404 }
      );
    }

    // Filter insights based on template sections
    const filteredInsights = filterInsights(
      analysis.insights,
      template.sections.filter(s => customOptions.enabledSections?.includes(s.id))
    );

    // Generate PDF with template options
    const pdfBlob = generator.generateReport(
      { ...analysis, insights: filteredInsights },
      {
        sessionName: template.name,
        includeRawData: customOptions.enabledSections?.includes('data'),
        data: data?.slice(0, customOptions.maxDataRows),
        columns,
      }
    );

    const buffer = Buffer.from(await pdfBlob.arrayBuffer());
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `slate-${templateId}-report-${timestamp}.pdf`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } else {
    // Quick export (default)
    const pdfBlob = generator.generateReport(analysis, {
      sessionName,
      includeRawData: includeRawData || !!data,
      data,
      columns,
    });

    const buffer = Buffer.from(await pdfBlob.arrayBuffer());
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = sessionName 
      ? `${sessionName.replace(/[^a-z0-9]/gi, '-')}-analysis-${timestamp}.pdf`
      : `analysis-report-${timestamp}.pdf`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  }
}

async function handleHTMLExport(
  analysis: AnalysisResult,
  data: Record<string, any>[] | undefined,
  columns: string[] | undefined,
  templateId: string | undefined,
  customOptions: TemplateOptions | undefined
): Promise<NextResponse> {
  const templates = getReportTemplates();
  const template = templateId ? templates.find(t => t.id === templateId) : null;
  const colorScheme = customOptions?.colorScheme || 'slate';

  // Color schemes
  const colors = {
    slate: { primary: '#f97316', secondary: '#64748b', accent: '#f59e0b' },
    professional: { primary: '#1e40af', secondary: '#475569', accent: '#3b82f6' },
    corporate: { primary: '#059669', secondary: '#6b7280', accent: '#10b981' },
  };

  const scheme = colors[colorScheme as keyof typeof colors] || colors.slate;

  // Filter insights if template is used
  const insights = template && customOptions
    ? filterInsights(
        analysis.insights,
        template.sections.filter(s => customOptions.enabledSections?.includes(s.id))
      )
    : analysis.insights;

  // Generate HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template?.name || 'Analysis Report'} - slate agentMatriX</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: #f8fafc;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 3rem;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 3px solid ${scheme.primary};
    }
    .brand { display: flex; align-items: baseline; gap: 0.5rem; }
    .brand-name { font-size: 2rem; font-weight: 700; color: ${scheme.primary}; }
    .brand-sub { font-size: 0.875rem; color: ${scheme.secondary}; font-weight: 500; }
    .date { color: ${scheme.secondary}; font-size: 0.875rem; }
    h1 { font-size: 2rem; color: #0f172a; margin-bottom: 1.5rem; font-weight: 700; }
    h2 { font-size: 1.5rem; color: #334155; margin-top: 2rem; margin-bottom: 1rem; font-weight: 600; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin: 2rem 0;
    }
    .stat-card {
      background: linear-gradient(135deg, ${scheme.primary}15, ${scheme.accent}15);
      padding: 1.5rem;
      border-radius: 8px;
      border-left: 4px solid ${scheme.primary};
    }
    .stat-label { font-size: 0.875rem; color: ${scheme.secondary}; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 2rem; font-weight: 700; color: ${scheme.primary}; margin-top: 0.5rem; }
    .summary {
      background: #f8fafc;
      padding: 1.5rem;
      border-radius: 8px;
      border-left: 4px solid ${scheme.accent};
      margin: 2rem 0;
      color: #475569;
      line-height: 1.8;
    }
    .insights { margin: 2rem 0; }
    .insight {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      transition: all 0.2s;
    }
    .insight:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: ${scheme.primary}; }
    .insight-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }
    .insight-icon { font-size: 1.5rem; }
    .insight-title { font-size: 1.125rem; font-weight: 600; color: #1e293b; flex: 1; }
    .insight-badges {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 0.75rem;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-high { background: #fee2e2; color: #991b1b; }
    .badge-medium { background: #fef3c7; color: #92400e; }
    .badge-low { background: #dbeafe; color: #1e40af; }
    .badge-confidence { background: #f0fdf4; color: #166534; }
    .badge-actionable { background: #dcfce7; color: #15803d; }
    .insight-description { color: #64748b; line-height: 1.7; }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 2rem 0;
      font-size: 0.875rem;
      overflow: hidden;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .data-table thead {
      background: ${scheme.primary};
      color: white;
    }
    .data-table th, .data-table td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-table tbody tr:hover { background: #f8fafc; }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .footer {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: ${scheme.secondary};
      font-size: 0.875rem;
    }
    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; }
      .insight { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">
        <span class="brand-name">slate</span>
        <span class="brand-sub">agentMatriX</span>
      </div>
      <div class="date">${new Date(analysis.timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}</div>
    </div>

    <h1>${template?.name || 'Analysis Report'}</h1>
    ${template?.description ? `<p style="color: #64748b; margin-bottom: 2rem;">${template.description}</p>` : ''}

    ${customOptions?.enabledSections?.includes('statistics') !== false ? `
    <h2>Key Statistics</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Rows</div>
        <div class="stat-value">${analysis.statistics.totalRows.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Fields</div>
        <div class="stat-value">${analysis.statistics.totalFields}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Completeness</div>
        <div class="stat-value">${Math.round(analysis.statistics.completeness * 100)}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Confidence</div>
        <div class="stat-value">${Math.round(analysis.statistics.averageConfidence * 100)}%</div>
      </div>
    </div>
    ` : ''}

    ${customOptions?.enabledSections?.includes('summary') !== false ? `
    <h2>Executive Summary</h2>
    <div class="summary">${analysis.summary}</div>
    ` : ''}

    ${insights.length > 0 && customOptions?.enabledSections?.includes('insights') !== false ? `
    <h2>Key Insights (${insights.length})</h2>
    <div class="insights">
      ${insights.map((insight, i) => {
        const icon = {
          pattern: '📈',
          anomaly: '⚠️',
          prediction: '🎯',
          correlation: '📊',
          recommendation: '💡'
        }[insight.type] || '✨';

        return `
          <div class="insight">
            <div class="insight-header">
              <span class="insight-icon">${icon}</span>
              <span class="insight-title">${i + 1}. ${insight.title}</span>
            </div>
            <div class="insight-badges">
              <span class="badge badge-${insight.priority}">Priority: ${insight.priority}</span>
              <span class="badge badge-confidence">Confidence: ${Math.round(insight.confidence * 100)}%</span>
              ${insight.actionable ? '<span class="badge badge-actionable">Actionable</span>' : ''}
            </div>
            <div class="insight-description">${insight.description}</div>
          </div>
        `;
      }).join('')}
    </div>
    ` : ''}

    ${data && columns && customOptions?.enabledSections?.includes('data') !== false ? `
    <h2>Data Sample</h2>
    <table class="data-table">
      <thead>
        <tr>
          ${columns.map(col => `<th>${col}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data.slice(0, customOptions?.maxDataRows || 100).map(row => `
          <tr>
            ${columns.map(col => `<td>${String(row[col] || '').substring(0, 100)}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    <div class="footer">
      <p>Generated by slate agentMatriX • ${new Date().toLocaleString()}</p>
      <p style="margin-top: 0.5rem; font-size: 0.75rem;">Powered by AI-driven enrichment and analysis</p>
    </div>
  </div>
</body>
</html>`;

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `slate-${templateId || 'analysis'}-report-${timestamp}.html`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

async function handleExcelExport(
  analysis: AnalysisResult,
  data: Record<string, any>[] | undefined,
  columns: string[] | undefined
): Promise<NextResponse> {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['slate agentMatriX - Analysis Report'],
    ['Generated:', new Date().toLocaleString()],
    [],
    ['Statistics'],
    ['Total Rows', analysis.statistics.totalRows],
    ['Total Fields', analysis.statistics.totalFields],
    ['Completeness', `${Math.round(analysis.statistics.completeness * 100)}%`],
    ['Average Confidence', `${Math.round(analysis.statistics.averageConfidence * 100)}%`],
    [],
    ['Summary'],
    [analysis.summary],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Insights sheet
  const insightsData = [
    ['Type', 'Title', 'Description', 'Priority', 'Confidence', 'Actionable'],
    ...analysis.insights.map(insight => [
      insight.type,
      insight.title,
      insight.description,
      insight.priority,
      Math.round(insight.confidence * 100) + '%',
      insight.actionable ? 'Yes' : 'No',
    ]),
  ];

  const insightsSheet = XLSX.utils.aoa_to_sheet(insightsData);
  XLSX.utils.book_append_sheet(workbook, insightsSheet, 'Insights');

  // Data sheet (if provided)
  if (data && columns) {
    const dataSheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');
  }

  // Generate buffer
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `slate-analysis-report-${timestamp}.xlsx`;

  return new NextResponse(excelBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
