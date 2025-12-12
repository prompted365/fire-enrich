import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

interface ReportOptions {
  sessionId?: string;
  sessionName?: string;
  includeRawData?: boolean;
  data?: Record<string, any>[];
  columns?: string[];
}

export class PDFReportGenerator {
  private doc: jsPDF;
  private currentY: number = 20;
  private readonly pageWidth: number;
  private readonly pageHeight: number;
  private readonly marginLeft: number = 20;
  private readonly marginRight: number = 20;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  private checkPageBreak(heightNeeded: number): void {
    if (this.currentY + heightNeeded > this.pageHeight - 20) {
      this.doc.addPage();
      this.currentY = 20;
    }
  }

  private addHeader(): void {
    // Logo/Brand
    this.doc.setFontSize(24);
    this.doc.setTextColor(249, 115, 22); // Orange-500
    this.doc.text('slate', this.marginLeft, this.currentY);
    
    this.doc.setFontSize(10);
    this.doc.setTextColor(156, 163, 175); // Gray-400
    this.doc.text('agentMatriX', this.marginLeft + 35, this.currentY);
    
    // Date
    this.doc.setFontSize(10);
    this.doc.setTextColor(100, 100, 100);
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    this.doc.text(dateStr, this.pageWidth - this.marginRight, this.currentY, { align: 'right' });
    
    this.currentY += 15;
    
    // Separator line
    this.doc.setDrawColor(249, 115, 22);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.marginLeft, this.currentY, this.pageWidth - this.marginRight, this.currentY);
    this.currentY += 10;
  }

  private addTitle(title: string): void {
    this.checkPageBreak(20);
    this.doc.setFontSize(20);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(title, this.marginLeft, this.currentY);
    this.currentY += 15;
  }

  private addSubtitle(subtitle: string): void {
    this.checkPageBreak(15);
    this.doc.setFontSize(14);
    this.doc.setTextColor(60, 60, 60);
    this.doc.text(subtitle, this.marginLeft, this.currentY);
    this.currentY += 10;
  }

  private addText(text: string, fontSize: number = 11, color: [number, number, number] = [0, 0, 0]): void {
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(...color);
    
    const maxWidth = this.pageWidth - this.marginLeft - this.marginRight;
    const lines = this.doc.splitTextToSize(text, maxWidth);
    
    lines.forEach((line: string) => {
      this.checkPageBreak(8);
      this.doc.text(line, this.marginLeft, this.currentY);
      this.currentY += 7;
    });
    
    this.currentY += 3;
  }

  private addStatisticsBox(statistics: AnalysisResult['statistics']): void {
    this.checkPageBreak(60);
    
    this.addSubtitle('Dataset Overview');
    
    const stats = [
      ['Total Rows', statistics.totalRows.toString()],
      ['Total Fields', statistics.totalFields.toString()],
      ['Data Completeness', `${statistics.completeness}%`],
      ['Average Confidence', `${Math.round(statistics.averageConfidence * 100)}%`]
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: stats,
      theme: 'grid',
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: [255, 255, 255],
        fontSize: 11,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 10
      },
      alternateRowStyles: {
        fillColor: [253, 246, 235]
      },
      margin: { left: this.marginLeft, right: this.marginRight }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
  }

  private addSummary(summary: string): void {
    this.checkPageBreak(30);
    this.addSubtitle('Executive Summary');
    
    // Add summary box
    const boxPadding = 10;
    const boxWidth = this.pageWidth - this.marginLeft - this.marginRight;
    const lines = this.doc.splitTextToSize(summary, boxWidth - (boxPadding * 2));
    const boxHeight = (lines.length * 7) + (boxPadding * 2);
    
    this.checkPageBreak(boxHeight);
    
    // Draw box
    this.doc.setFillColor(253, 246, 235); // Orange-50
    this.doc.setDrawColor(249, 115, 22); // Orange-500
    this.doc.rect(this.marginLeft, this.currentY, boxWidth, boxHeight, 'FD');
    
    // Add text inside box
    this.doc.setFontSize(11);
    this.doc.setTextColor(0, 0, 0);
    let textY = this.currentY + boxPadding + 5;
    lines.forEach((line: string) => {
      this.doc.text(line, this.marginLeft + boxPadding, textY);
      textY += 7;
    });
    
    this.currentY += boxHeight + 15;
  }

  private getPriorityColor(priority: string): [number, number, number] {
    switch (priority) {
      case 'high':
        return [220, 38, 38]; // Red
      case 'medium':
        return [249, 115, 22]; // Orange
      case 'low':
        return [59, 130, 246]; // Blue
      default:
        return [100, 100, 100]; // Gray
    }
  }

  private getTypeIcon(type: string): string {
    switch (type) {
      case 'pattern':
        return '📈';
      case 'anomaly':
        return '⚠️';
      case 'prediction':
        return '🎯';
      case 'correlation':
        return '📊';
      case 'recommendation':
        return '💡';
      default:
        return '✨';
    }
  }

  private addInsights(insights: AnalysisInsight[]): void {
    this.checkPageBreak(20);
    this.addSubtitle(`Key Insights (${insights.length})`);
    
    insights.forEach((insight, index) => {
      const insightHeight = 50; // Approximate height per insight
      this.checkPageBreak(insightHeight);
      
      // Insight number and type
      this.doc.setFontSize(12);
      this.doc.setTextColor(0, 0, 0);
      this.doc.text(
        `${index + 1}. ${this.getTypeIcon(insight.type)} ${insight.title}`,
        this.marginLeft,
        this.currentY
      );
      this.currentY += 8;
      
      // Priority and confidence badges
      this.doc.setFontSize(9);
      const priorityColor = this.getPriorityColor(insight.priority);
      this.doc.setTextColor(...priorityColor);
      this.doc.text(
        `Priority: ${insight.priority.toUpperCase()}`,
        this.marginLeft + 5,
        this.currentY
      );
      
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(
        `| Confidence: ${Math.round(insight.confidence * 100)}%`,
        this.marginLeft + 45,
        this.currentY
      );
      
      if (insight.actionable) {
        this.doc.setTextColor(34, 197, 94); // Green
        this.doc.text('| Actionable', this.marginLeft + 95, this.currentY);
      }
      
      this.currentY += 7;
      
      // Description
      this.doc.setFontSize(10);
      this.doc.setTextColor(60, 60, 60);
      const maxWidth = this.pageWidth - this.marginLeft - this.marginRight - 10;
      const descLines = this.doc.splitTextToSize(insight.description, maxWidth);
      
      descLines.forEach((line: string) => {
        this.checkPageBreak(7);
        this.doc.text(line, this.marginLeft + 5, this.currentY);
        this.currentY += 6;
      });
      
      this.currentY += 10;
      
      // Separator
      if (index < insights.length - 1) {
        this.doc.setDrawColor(200, 200, 200);
        this.doc.setLineWidth(0.2);
        this.doc.line(
          this.marginLeft,
          this.currentY,
          this.pageWidth - this.marginRight,
          this.currentY
        );
        this.currentY += 8;
      }
    });
  }

  private addDataTable(data: Record<string, any>[], columns: string[]): void {
    this.checkPageBreak(30);
    this.addSubtitle('Data Sample (First 20 Rows)');
    
    const sampleData = data.slice(0, 20);
    const tableData = sampleData.map(row => 
      columns.map(col => {
        const cell = row[col];
        if (typeof cell === 'object' && cell !== null && 'value' in cell) {
          return String(cell.value ?? '');
        }
        return String(cell ?? '');
      })
    );

    autoTable(this.doc, {
      startY: this.currentY,
      head: [columns],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      margin: { left: this.marginLeft, right: this.marginRight },
      columnStyles: columns.reduce((acc, col, idx) => {
        acc[idx] = { cellWidth: 'auto' };
        return acc;
      }, {} as any)
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  private addFooter(sessionId?: string): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      this.doc.setFontSize(8);
      this.doc.setTextColor(150, 150, 150);
      
      // Page number
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      );
      
      // Session ID
      if (sessionId) {
        this.doc.text(
          `Session: ${sessionId}`,
          this.marginLeft,
          this.pageHeight - 10
        );
      }
      
      // Generated by
      this.doc.text(
        'Generated by slate agentMatriX',
        this.pageWidth - this.marginRight,
        this.pageHeight - 10,
        { align: 'right' }
      );
    }
  }

  public generateReport(
    analysis: AnalysisResult,
    options: ReportOptions = {}
  ): Blob {
    // Header
    this.addHeader();
    
    // Title
    this.addTitle('Agentic Analysis Report');
    
    if (options.sessionName) {
      this.addText(options.sessionName, 12, [100, 100, 100]);
      this.currentY += 5;
    }
    
    // Statistics
    this.addStatisticsBox(analysis.statistics);
    
    // Summary
    this.addSummary(analysis.summary);
    
    // Insights
    this.addInsights(analysis.insights);
    
    // Data table (if requested)
    if (options.includeRawData && options.data && options.columns) {
      this.doc.addPage();
      this.currentY = 20;
      this.addDataTable(options.data, options.columns);
    }
    
    // Footer
    this.addFooter(options.sessionId);
    
    // Generate blob
    return this.doc.output('blob');
  }

  public downloadReport(
    analysis: AnalysisResult,
    options: ReportOptions = {},
    filename?: string
  ): void {
    const blob = this.generateReport(analysis, options);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `analysis-report-${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
