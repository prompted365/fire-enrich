export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'executive' | 'deep-dive' | 'competitive' | 'investment';
  icon: string;
  sections: ReportSection[];
  defaultOptions: ReportOptions;
}

export interface ReportSection {
  id: string;
  name: string;
  type: 'summary' | 'statistics' | 'insights' | 'data' | 'charts' | 'recommendations';
  required: boolean;
  enabled: boolean;
  options?: Record<string, any>;
}

export interface ReportOptions {
  includeRawData: boolean;
  includeCharts: boolean;
  includeInsights: boolean;
  includeStatistics: boolean;
  includeRecommendations: boolean;
  maxDataRows: number;
  colorScheme: 'slate' | 'professional' | 'corporate';
  logoUrl?: string;
  companyName?: string;
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'executive',
    name: 'Executive Summary',
    description: 'Concise 1-page overview with key insights and metrics',
    type: 'executive',
    icon: '📊',
    sections: [
      {
        id: 'overview',
        name: 'Dataset Overview',
        type: 'statistics',
        required: true,
        enabled: true,
      },
      {
        id: 'summary',
        name: 'Executive Summary',
        type: 'summary',
        required: true,
        enabled: true,
      },
      {
        id: 'top-insights',
        name: 'Top 5 Insights',
        type: 'insights',
        required: true,
        enabled: true,
        options: { limit: 5, highPriorityOnly: true },
      },
      {
        id: 'recommendations',
        name: 'Key Recommendations',
        type: 'recommendations',
        required: false,
        enabled: true,
      },
    ],
    defaultOptions: {
      includeRawData: false,
      includeCharts: false,
      includeInsights: true,
      includeStatistics: true,
      includeRecommendations: true,
      maxDataRows: 0,
      colorScheme: 'slate',
    },
  },
  {
    id: 'deep-dive',
    name: 'Deep Dive Analysis',
    description: 'Comprehensive multi-page report with detailed analysis',
    type: 'deep-dive',
    icon: '🔬',
    sections: [
      {
        id: 'overview',
        name: 'Dataset Overview',
        type: 'statistics',
        required: true,
        enabled: true,
      },
      {
        id: 'summary',
        name: 'Executive Summary',
        type: 'summary',
        required: true,
        enabled: true,
      },
      {
        id: 'all-insights',
        name: 'All Insights',
        type: 'insights',
        required: true,
        enabled: true,
        options: { limit: 999 },
      },
      {
        id: 'charts',
        name: 'Data Visualizations',
        type: 'charts',
        required: false,
        enabled: true,
      },
      {
        id: 'data',
        name: 'Raw Data Sample',
        type: 'data',
        required: false,
        enabled: true,
      },
      {
        id: 'recommendations',
        name: 'Detailed Recommendations',
        type: 'recommendations',
        required: false,
        enabled: true,
      },
    ],
    defaultOptions: {
      includeRawData: true,
      includeCharts: true,
      includeInsights: true,
      includeStatistics: true,
      includeRecommendations: true,
      maxDataRows: 50,
      colorScheme: 'professional',
    },
  },
  {
    id: 'competitive',
    name: 'Competitive Intelligence',
    description: 'Market landscape analysis with company comparisons',
    type: 'competitive',
    icon: '🎯',
    sections: [
      {
        id: 'market-overview',
        name: 'Market Overview',
        type: 'summary',
        required: true,
        enabled: true,
      },
      {
        id: 'statistics',
        name: 'Competitive Metrics',
        type: 'statistics',
        required: true,
        enabled: true,
      },
      {
        id: 'patterns',
        name: 'Market Patterns',
        type: 'insights',
        required: true,
        enabled: true,
        options: { typeFilter: ['pattern', 'correlation'] },
      },
      {
        id: 'positioning',
        name: 'Positioning Analysis',
        type: 'charts',
        required: false,
        enabled: true,
      },
      {
        id: 'companies',
        name: 'Company Profiles',
        type: 'data',
        required: false,
        enabled: true,
      },
    ],
    defaultOptions: {
      includeRawData: true,
      includeCharts: true,
      includeInsights: true,
      includeStatistics: true,
      includeRecommendations: false,
      maxDataRows: 20,
      colorScheme: 'corporate',
    },
  },
  {
    id: 'investment',
    name: 'Investment Memo',
    description: 'Due diligence report with risk assessment',
    type: 'investment',
    icon: '💼',
    sections: [
      {
        id: 'summary',
        name: 'Investment Summary',
        type: 'summary',
        required: true,
        enabled: true,
      },
      {
        id: 'metrics',
        name: 'Key Metrics',
        type: 'statistics',
        required: true,
        enabled: true,
      },
      {
        id: 'opportunities',
        name: 'Opportunities',
        type: 'insights',
        required: true,
        enabled: true,
        options: { typeFilter: ['prediction', 'recommendation'], sentiment: 'positive' },
      },
      {
        id: 'risks',
        name: 'Risk Assessment',
        type: 'insights',
        required: true,
        enabled: true,
        options: { typeFilter: ['anomaly'], priorityFilter: ['high', 'medium'] },
      },
      {
        id: 'company-data',
        name: 'Company Data',
        type: 'data',
        required: false,
        enabled: true,
      },
    ],
    defaultOptions: {
      includeRawData: true,
      includeCharts: false,
      includeInsights: true,
      includeStatistics: true,
      includeRecommendations: true,
      maxDataRows: 10,
      colorScheme: 'professional',
    },
  },
];

export function getTemplate(id: string): ReportTemplate | undefined {
  return REPORT_TEMPLATES.find((t) => t.id === id);
}

export function getReportTemplates(): ReportTemplate[] {
  return REPORT_TEMPLATES;
}

export function getTemplatesByType(type: ReportTemplate['type']): ReportTemplate[] {
  return REPORT_TEMPLATES.filter((t) => t.type === type);
}

export function filterInsights(
  insights: any[],
  options?: Record<string, any>
): any[] {
  let filtered = [...insights];

  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  if (options?.highPriorityOnly) {
    filtered = filtered.filter((i) => i.priority === 'high');
  }

  if (options?.typeFilter && Array.isArray(options.typeFilter)) {
    filtered = filtered.filter((i) => options.typeFilter.includes(i.type));
  }

  if (options?.priorityFilter && Array.isArray(options.priorityFilter)) {
    filtered = filtered.filter((i) => options.priorityFilter.includes(i.priority));
  }

  return filtered;
}
