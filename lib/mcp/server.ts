import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { createAgentOrchestrator } from '@/lib/agent-architecture';
import { EnrichmentFieldSchema } from '@/lib/agent-architecture/core/types';
import type { ContextConfig } from '@/lib/config/context-config';
import type { EnrichmentField } from '@/lib/types';
import type { RowEnrichmentResult } from '@/lib/agent-architecture/core/types';
import { buildCellPromptPlan } from '@/lib/utils/cell-prompts';

const rowSchema = z.record(z.string(), z.string());

const enrichmentFieldListSchema = z.array(EnrichmentFieldSchema).min(1);

const enrichRowInputSchema = z.object({
  row: rowSchema.describe('Single CSV row to enrich'),
  fields: enrichmentFieldListSchema.describe('Fields to enrich for the provided row'),
  emailColumn: z.string().default('email').describe('Column containing the contact email'),
  nameColumn: z.string().optional().describe('Optional column containing a contact name'),
  rowIndex: z.number().default(0).describe('Index of the row inside the batch'),
});

const enrichmentPlanSchema = z.object({
  row: rowSchema.describe('Row to plan enrichment for'),
  field: EnrichmentFieldSchema.describe('Field definition to inspect'),
  rowIndex: z.number().default(0).describe('Row index for neighbor context'),
});

export interface AgentMcpServerOptions {
  firecrawlApiKey: string;
  openaiApiKey: string;
  contextConfig?: ContextConfig;
  serverInfo?: Implementation;
  instructions?: string;
}

function formatEnrichmentContent(result: RowEnrichmentResult) {
  return [{
    type: 'text' as const,
    text: JSON.stringify(result, null, 2),
  }];
}

export class AgentMcpServer {
  private readonly server: McpServer;

  constructor(private readonly options: AgentMcpServerOptions) {
    this.server = new McpServer(
      options.serverInfo ?? { name: 'fire-enrich/mcp-agent', version: '0.1.0' },
      {
        capabilities: { tools: {}, logging: {} },
        instructions: options.instructions ?? 'Call tools to enrich rows or preview prompt plans.',
      },
    );

    this.registerTools();
  }

  private registerTools() {
    this.server.registerTool('enrich-row', {
      title: 'Enrich Row',
      description: 'Run the agent orchestrator against a single row using the provided field definitions.',
      inputSchema: enrichRowInputSchema,
      annotations: { idempotentHint: true },
    }, async ({ row, fields, emailColumn, nameColumn, rowIndex }) => {
      const workingRow = { ...row };
      if (nameColumn && workingRow[nameColumn]) {
        workingRow._name = workingRow[nameColumn];
      }

      const orchestrator = createAgentOrchestrator(
        this.options.firecrawlApiKey,
        this.options.openaiApiKey,
        this.options.contextConfig,
      );

      const result = await orchestrator.enrichRow(
        workingRow,
        fields as unknown as EnrichmentField[],
        emailColumn,
        undefined,
        undefined,
        rowIndex,
        [workingRow],
      );

      return { content: formatEnrichmentContent(result) };
    });

    this.server.registerTool('plan-enrichment', {
      title: 'Plan Enrichment Prompt',
      description: 'Return the prompt plan for a specific field including dependency resolution notes.',
      inputSchema: enrichmentPlanSchema,
      annotations: { idempotentHint: true },
    }, async ({ field, row, rowIndex }) => {
      const plan = buildCellPromptPlan({
        field: field as unknown as EnrichmentField,
        row,
        rowIndex,
        allRows: [row],
        existingEnrichments: {},
        contextConfig: this.options.contextConfig,
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(plan, null, 2),
        }],
      };
    });

    this.server.registerTool('describe-mcp-agent', {
      title: 'Describe Agent MCP Server',
      description: 'Summarize available tools and any provided instructions.',
      inputSchema: z.object({}),
    }, async () => {
      const instructions = this.server.server.getInstructions?.() ?? this.options.instructions;
      const tools = await this.server.server.listTools();

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ instructions, tools: tools.tools }, null, 2),
        }],
      };
    });
  }

  async connect(transport: Transport) {
    await this.server.connect(transport);
  }

  async close() {
    await this.server.close();
  }
}
