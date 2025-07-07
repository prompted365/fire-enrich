export interface ContextConfig {
  /** Instructions prepended to each AI prompt */
  globalInstructions?: string;
  /** Mapping of row column names to context labels */
  rowContextMappings?: Record<string, string>;
  /** Field-specific instruction overrides */
  columnInstructions?: Record<string, string>;
}

export const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  globalInstructions: 'Extract lead enrichment details using email as the primary identifier.',
  rowContextMappings: {
    email: 'Email',
    _name: 'Person Name'
  },
  columnInstructions: {}
};

