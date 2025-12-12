import { Client } from '@modelcontextprotocol/sdk/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { Implementation, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { EnrichmentField } from '@/lib/types';

export interface AgentMcpClientOptions {
  clientInfo?: Implementation;
}

export class AgentMcpClient {
  private readonly client: Client;
  private transport?: Transport;

  constructor(options: AgentMcpClientOptions = {}) {
    this.client = new Client(
      options.clientInfo ?? { name: 'fire-enrich/mcp-client', version: '0.1.0' },
      { capabilities: { tools: {}, logging: {} } },
    );
  }

  async connectToHttp(url: string) {
    const transport = new StreamableHTTPClientTransport(new URL(url));
    await this.client.connect(transport);
    this.transport = transport;
    return transport;
  }

  async connect(transport: Transport) {
    await this.client.connect(transport);
    this.transport = transport;
  }

  async disconnect() {
    await this.transport?.close?.();
  }

  async listTools() {
    return this.client.listTools();
  }

  async enrichRow(params: {
    row: Record<string, string>;
    fields: EnrichmentField[];
    emailColumn: string;
    nameColumn?: string;
    rowIndex?: number;
  }): Promise<CallToolResult> {
    return this.client.callTool({
      name: 'enrich-row',
      arguments: params,
    });
  }

  async planField(params: {
    row: Record<string, string>;
    field: EnrichmentField;
    rowIndex?: number;
  }): Promise<CallToolResult> {
    return this.client.callTool({
      name: 'plan-enrichment',
      arguments: params,
    });
  }

  get rawClient() {
    return this.client;
  }
}
