import { OpenAI } from 'openai';

export interface AnalysisInsight {
  id: string;
  type: 'pattern' | 'anomaly' | 'prediction' | 'correlation' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  data?: any;
  visualizationType?: 'chart' | 'table' | 'metric' | 'heatmap';
  actionable?: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface AnalysisResult {
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

export class AnalysisAgent {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async analyzeSlate(
    data: Record<string, any>[],
    columns: string[],
    options: {
      includePatterns?: boolean;
      includeAnomalies?: boolean;
      includePredictions?: boolean;
      includeCorrelations?: boolean;
    } = {}
  ): Promise<AnalysisResult> {
    const {
      includePatterns = true,
      includeAnomalies = true,
      includePredictions = true,
      includeCorrelations = true,
    } = options;

    // Generate statistics
    const statistics = this.generateStatistics(data, columns);

    // Sample data for analysis (to avoid token limits)
    const sampleSize = Math.min(data.length, 50);
    const sample = data.slice(0, sampleSize);

    // Build analysis prompt
    const prompt = this.buildAnalysisPrompt(sample, columns, {
      includePatterns,
      includeAnomalies,
      includePredictions,
      includeCorrelations,
    });

    // Call OpenAI for analysis
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert data analyst. Analyze the provided dataset and generate actionable insights. 
Focus on patterns, anomalies, correlations, and predictions. Be specific and data-driven.
Respond in JSON format only.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const analysisData = JSON.parse(response.choices[0].message.content || '{}');

    // Parse insights from AI response
    const insights = this.parseInsights(analysisData);

    return {
      insights,
      summary: analysisData.summary || 'Analysis complete',
      statistics,
      timestamp: new Date().toISOString(),
    };
  }

  private generateStatistics(
    data: Record<string, any>[],
    columns: string[]
  ): AnalysisResult['statistics'] {
    const totalRows = data.length;
    const totalFields = columns.length;

    // Calculate completeness
    let totalCells = 0;
    let filledCells = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;

    data.forEach((row) => {
      columns.forEach((col) => {
        totalCells++;
        const value = row[col];
        
        if (value !== null && value !== undefined && value !== '') {
          filledCells++;
          
          // Check for confidence scores
          if (typeof value === 'object' && value.confidence) {
            totalConfidence += value.confidence;
            confidenceCount++;
          }
        }
      });
    });

    const completeness = totalCells > 0 ? (filledCells / totalCells) * 100 : 0;
    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

    return {
      totalRows,
      totalFields,
      completeness: Math.round(completeness * 100) / 100,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
    };
  }

  private buildAnalysisPrompt(
    data: Record<string, any>[],
    columns: string[],
    options: Record<string, boolean>
  ): string {
    const columnSummary = columns.map((col) => {
      const values = data.map((row) => row[col]).filter((v) => v != null && v !== '');
      const uniqueValues = new Set(values);
      return {
        name: col,
        type: this.inferColumnType(values),
        uniqueCount: uniqueValues.size,
        sampleValues: Array.from(uniqueValues).slice(0, 5),
      };
    });

    return `Analyze this dataset with ${data.length} rows and ${columns.length} columns.

Column Information:
${JSON.stringify(columnSummary, null, 2)}

Sample Data (first 10 rows):
${JSON.stringify(data.slice(0, 10), null, 2)}

Please provide analysis in the following JSON format:
{
  "summary": "Brief overview of the dataset and key findings",
  "insights": [
    {
      "type": "pattern|anomaly|prediction|correlation|recommendation",
      "title": "Short insight title",
      "description": "Detailed explanation",
      "confidence": 0.85,
      "priority": "high|medium|low",
      "actionable": true|false
    }
  ]
}

Analysis Focus:
${options.includePatterns ? '- Identify patterns and trends' : ''}
${options.includeAnomalies ? '- Detect anomalies and outliers' : ''}
${options.includePredictions ? '- Make predictions based on data' : ''}
${options.includeCorrelations ? '- Find correlations between fields' : ''}

Provide 5-10 specific, actionable insights.`;
  }

  private inferColumnType(values: any[]): string {
    if (values.length === 0) return 'unknown';

    const sample = values[0];
    
    if (typeof sample === 'number') return 'numeric';
    if (typeof sample === 'boolean') return 'boolean';
    
    // Check for dates
    if (typeof sample === 'string') {
      if (!isNaN(Date.parse(sample))) return 'date';
      if (sample.includes('@')) return 'email';
      if (sample.match(/^https?:\/\//)) return 'url';
    }

    return 'text';
  }

  private parseInsights(analysisData: any): AnalysisInsight[] {
    const insights: AnalysisInsight[] = [];

    if (analysisData.insights && Array.isArray(analysisData.insights)) {
      analysisData.insights.forEach((insight: any, index: number) => {
        insights.push({
          id: `insight-${Date.now()}-${index}`,
          type: insight.type || 'pattern',
          title: insight.title || 'Insight',
          description: insight.description || '',
          confidence: insight.confidence || 0.5,
          priority: insight.priority || 'medium',
          actionable: insight.actionable !== false,
        });
      });
    }

    return insights;
  }

  // Descriptive statistics for numeric columns
  async calculateDescriptiveStats(
    data: Record<string, any>[],
    column: string
  ): Promise<{
    count: number;
    mean: number;
    median: number;
    mode: number | string;
    stdDev: number;
    min: number;
    max: number;
    q1: number;
    q3: number;
  } | null> {
    const values = data
      .map((row) => {
        const val = row[column];
        return typeof val === 'object' && val?.value ? val.value : val;
      })
      .filter((v) => v != null && v !== '' && !isNaN(Number(v)))
      .map(Number);

    if (values.length === 0) return null;

    values.sort((a, b) => a - b);

    const count = values.length;
    const mean = values.reduce((sum, val) => sum + val, 0) / count;
    const median = this.calculateMedian(values);
    const mode = this.calculateMode(values);
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count
    );
    const min = values[0];
    const max = values[values.length - 1];
    const q1 = this.calculatePercentile(values, 25);
    const q3 = this.calculatePercentile(values, 75);

    return {
      count,
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      mode,
      stdDev: Math.round(stdDev * 100) / 100,
      min,
      max,
      q1,
      q3,
    };
  }

  private calculateMedian(sortedValues: number[]): number {
    const mid = Math.floor(sortedValues.length / 2);
    return sortedValues.length % 2 === 0
      ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
      : sortedValues[mid];
  }

  private calculateMode(values: number[]): number | string {
    const frequency: Record<number, number> = {};
    let maxFreq = 0;
    let mode: number | null = null;

    values.forEach((val) => {
      frequency[val] = (frequency[val] || 0) + 1;
      if (frequency[val] > maxFreq) {
        maxFreq = frequency[val];
        mode = val;
      }
    });

    return mode !== null ? mode : 'N/A';
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }
}
