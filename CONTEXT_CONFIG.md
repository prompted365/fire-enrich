# Context Configuration

ReconnAIssance supports different enrichment scenarios through a small configuration object.

```ts
import { createAgentOrchestrator } from './lib/agent-architecture';
import { DEFAULT_CONTEXT_CONFIG } from './lib/config/context-config';

const orchestrator = createAgentOrchestrator(
  process.env.FIRECRAWL_API_KEY!,
  process.env.OPENAI_API_KEY!,
  DEFAULT_CONTEXT_CONFIG
);
```

`DEFAULT_CONTEXT_CONFIG` targets lead enrichment and maps the `email` and optional `name` columns to the prompt context. You can override any value to adapt the system for other domains. For instance:

```ts
import { ContextConfig } from './lib/config/context-config';

const customConfig: ContextConfig = {
  globalInstructions: 'Research academic publications for {{EXAMPLE_COMPANY_NAME}} authors.',
  rowContextMappings: {
    email: 'Contact Email',
    institution: 'University'
  },
  columnInstructions: {
    citationCount: 'Total citations across all papers'
  }
};
```

Pass `customConfig` to `createAgentOrchestrator` to change how global, column and row context is supplied to the agents.

