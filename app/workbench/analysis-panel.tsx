'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  Lightbulb,
  Loader2,
  Sparkles,
  BarChart3,
  CheckCircle2,
  FileText,
  Download,
  FileCode,
  Table,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ReportTemplateSelector } from './report-template-selector';

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

interface AnalysisPanelProps {
  data: Record<string, any>[];
  columns: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InsightIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'pattern':
      return <TrendingUp className="h-5 w-5" />;
    case 'anomaly':
      return <AlertTriangle className="h-5 w-5" />;
    case 'prediction':
      return <Target className="h-5 w-5" />;
    case 'correlation':
      return <BarChart3 className="h-5 w-5" />;
    case 'recommendation':
      return <Lightbulb className="h-5 w-5" />;
    default:
      return <Sparkles className="h-5 w-5" />;
  }
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const colors = {
    high: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
    medium: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  };

  return (
    <Badge className={colors[priority as keyof typeof colors]}>
      {priority}
    </Badge>
  );
};

export function AnalysisPanel({ data, columns, open, onOpenChange }: AnalysisPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          columns,
          options: {
            includePatterns: true,
            includeAnomalies: true,
            includePredictions: true,
            includeCorrelations: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      setAnalysis(result.analysis);

      // Celebrate with confetti!
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#f97316', '#fb923c', '#fdba74'],
      });
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze slate. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportReport = async (format: 'pdf' | 'html' | 'excel' = 'pdf') => {
    if (!analysis) return;

    setIsExporting(true);
    try {
      const response = await fetch('/api/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis,
          includeRawData: true,
          data,
          columns,
          format,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Set filename based on format
      const extension = format === 'pdf' ? 'pdf' : format === 'html' ? 'html' : 'xlsx';
      a.download = `analysis-report-${Date.now()}.${extension}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Mini confetti for export
      confetti({
        particleCount: 30,
        spread: 40,
        origin: { y: 0.7 },
        colors: ['#f97316', '#fb923c'],
      });
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCustomExport = async (templateId: string, customOptions: any) => {
    if (!analysis) return;

    try {
      const response = await fetch('/api/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis,
          data,
          columns,
          ...customOptions,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateId}-report-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      throw err;
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-orange-500" />
            Agentic Analysis
          </DialogTitle>
          <DialogDescription>
            AI-powered insights and patterns from your data
          </DialogDescription>
        </DialogHeader>

        {!analysis && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-20 w-20 rounded-full bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center mb-4">
              <Brain className="h-10 w-10 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Ready to Analyze</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              Our analysis agent will examine {data.length} rows across {columns.length} columns
              to discover patterns, anomalies, and actionable insights.
            </p>
            <Button onClick={handleAnalyze} className="bg-orange-500 hover:bg-orange-600 gap-2">
              <Sparkles className="h-4 w-4" />
              Start Analysis
            </Button>
          </div>
        )}

        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mb-4" />
            <p className="text-sm text-muted-foreground">Analyzing your data...</p>
            <p className="text-xs text-muted-foreground mt-1">This may take 10-30 seconds</p>
          </div>
        )}

        {error && (
          <Card className="p-6 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </Card>
        )}

        {analysis && (
          <div className="space-y-6">
            {/* Statistics Overview */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-500" />
                Dataset Overview
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-2xl font-bold">{analysis.statistics.totalRows}</div>
                  <div className="text-xs text-muted-foreground">Total Rows</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{analysis.statistics.totalFields}</div>
                  <div className="text-xs text-muted-foreground">Fields</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{analysis.statistics.completeness}%</div>
                  <div className="text-xs text-muted-foreground">Completeness</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {Math.round(analysis.statistics.averageConfidence * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Confidence</div>
                </div>
              </div>
            </Card>

            {/* Summary */}
            <Card className="p-6 bg-orange-50 dark:bg-orange-950/20">
              <p className="text-sm leading-relaxed">{analysis.summary}</p>
            </Card>

            {/* Insights */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-orange-500" />
                Key Insights ({analysis.insights.length})
              </h3>
              <div className="space-y-3">
                {analysis.insights.map((insight) => (
                  <Card key={insight.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                          <InsightIcon type={insight.type} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{insight.title}</h4>
                          <PriorityBadge priority={insight.priority} />
                          {insight.actionable && (
                            <Badge variant="outline" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Actionable
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                          {insight.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {insight.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(insight.confidence * 100)}% confidence
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  onClick={handleAnalyze}
                  variant="outline"
                  className="gap-2"
                  disabled={isAnalyzing}
                >
                  <Sparkles className="h-4 w-4" />
                  Re-analyze
                </Button>
                <Button
                  onClick={() => setShowTemplateSelector(true)}
                  variant="default"
                  className="gap-2 bg-orange-500 hover:bg-orange-600"
                >
                  <FileText className="h-4 w-4" />
                  Custom Report
                </Button>
              </div>
              
              <div className="flex gap-2">
                <span className="text-xs text-muted-foreground self-center mr-2">Quick Export:</span>
                <Button
                  onClick={() => handleExportReport('pdf')}
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                  className="gap-2"
                >
                  {isExporting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  PDF
                </Button>
                <Button
                  onClick={() => handleExportReport('html')}
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                  className="gap-2"
                >
                  {isExporting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <FileCode className="h-3 w-3" />
                  )}
                  HTML
                </Button>
                <Button
                  onClick={() => handleExportReport('excel')}
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                  className="gap-2"
                >
                  {isExporting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Table className="h-3 w-3" />
                  )}
                  Excel
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Template Selector Modal */}
    {analysis && (
      <ReportTemplateSelector
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
        analysis={analysis}
        data={data}
        columns={columns}
        onExport={handleCustomExport}
      />
    )}
    </>
  );
}
