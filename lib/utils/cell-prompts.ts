import { CSVRow, EnrichmentField } from '@/lib/types';
import type { ContextConfig } from '@/lib/config/context-config';
import { formatDisplayName } from './field-utils';

export interface CellPromptPlan {
  field: EnrichmentField;
  rowIndex: number;
  systemDirective: string;
  missingDependencies: string[];
}

interface BuildCellPromptOptions {
  field: EnrichmentField;
  row: CSVRow;
  rowIndex: number;
  allRows: CSVRow[];
  existingEnrichments: Record<string, unknown>;
  contextConfig?: ContextConfig;
}

const MAX_CONTEXT_FIELDS = 12;

function formatRowContext(row: CSVRow, field: EnrichmentField, contextConfig?: ContextConfig) {
  const entries = Object.entries(row)
    .filter(([key]) => key !== field.name)
    .slice(0, MAX_CONTEXT_FIELDS)
    .map(([key, value]) => {
      const label = contextConfig?.rowContextMappings?.[key] || formatDisplayName(key);
      return `${label}: ${value || 'unknown'}`;
    });

  return entries.length > 0
    ? `Row context (other fields):\n${entries.join('\n')}`
    : 'Row context (other fields): No additional context available';
}

function formatNeighborPatterns(field: EnrichmentField, rowIndex: number, allRows: CSVRow[]) {
  const window = field.adjacentWindow ?? 1;
  const neighborEntries: string[] = [];

  for (let offset = -window; offset <= window; offset++) {
    if (offset === 0) continue;
    const neighborRow = allRows[rowIndex + offset];
    if (!neighborRow) continue;
    const neighborValue = neighborRow[field.name];
    const label = `Row ${rowIndex + offset + 1}`;
    if (neighborValue) {
      neighborEntries.push(`${label}: ${neighborValue}`);
    } else {
      neighborEntries.push(`${label}: (no value for ${field.name})`);
    }
  }

  return neighborEntries.length > 0
    ? `Neighbor pattern map for ${field.displayName}:\n${neighborEntries.join('\n')}`
    : 'Neighbor pattern map: No adjacent records available';
}

export function buildCellPromptPlan(options: BuildCellPromptOptions): CellPromptPlan {
  const { field, row, rowIndex, allRows, existingEnrichments, contextConfig } = options;
  const missingDependencies: string[] = [];
  const dependencyDetails: string[] = [];
  const deps = field.dependencies || [];

  deps.forEach(dep => {
    const rowValue = row[dep];
    const enrichedValue = (existingEnrichments[dep] as { value?: unknown } | undefined)?.value;
    const finalValue = rowValue ?? enrichedValue;

    if (finalValue === undefined || finalValue === null || finalValue === '') {
      missingDependencies.push(dep);
      dependencyDetails.push(`${dep}: <missing>`);
    } else {
      dependencyDetails.push(`${dep}: ${String(finalValue)}`);
    }
  });

  const dependencySection = deps.length > 0
    ? `Dependency map: ${dependencyDetails.join('; ') || 'none declared'}`
    : 'Dependency map: none declared';

  const rowContext = formatRowContext(row, field, contextConfig);
  const neighborPatterns = formatNeighborPatterns(field, rowIndex, allRows);
  const promptOverride = field.promptTemplate ? `Custom instructions for ${field.displayName}: ${field.promptTemplate}\n` : '';

  const systemDirective = [
    `You are enriching cell Row ${rowIndex + 1}, Column "${field.displayName}" (key: ${field.name}).`,
    promptOverride,
    rowContext,
    dependencySection,
    neighborPatterns,
    'Use the provided context when forming your answer. If a dependency is missing, return null.'
  ].filter(Boolean).join('\n\n');

  return {
    field,
    rowIndex,
    systemDirective,
    missingDependencies,
  };
}
