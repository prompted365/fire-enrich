export interface EnrichmentMetrics {
  averageConfidence: number;
  missingFields: Record<string, number>;
  errorCount: number;
}

import type { RowEnrichmentResult } from '../types';

export function aggregateMetrics(results: RowEnrichmentResult[]): EnrichmentMetrics {
  let totalConfidence = 0;
  let confidenceCount = 0;
  const missingFields: Record<string, number> = {};
  let errorCount = 0;

  for (const result of results) {
    if (result.status === 'error') {
      errorCount++;
    }
    for (const [field, enrichment] of Object.entries(result.enrichments)) {
      const value = (enrichment as any)?.value;
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        missingFields[field] = (missingFields[field] || 0) + 1;
      }
      if (typeof enrichment.confidence === 'number') {
        totalConfidence += enrichment.confidence;
        confidenceCount++;
      }
    }
  }

  const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
  return { averageConfidence, missingFields, errorCount };
}
