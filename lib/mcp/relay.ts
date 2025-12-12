import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { AgentMcpClient } from './client';

const proxyToolSchema = z.object({
  tool: z.string().describe('Name of the upstream MCP tool to call'),
  arguments: z.record(z.string(), z.any()).default({}).describe('Arguments to forward to the remote tool'),
});

export interface RelayMcpServerOptions {
  client: AgentMcpClient;
  serverInfo?: Implementation;
}

export class RelayMcpServer {
  private readonly server: McpServer;

  constructor(private readonly options: RelayMcpServerOptions) {
    this.server = new McpServer(
      options.serverInfo ?? { name: 'fire-enrich/mcp-relay', version: '0.1.0' },
      {
        capabilities: { tools: {}, logging: {} },
        instructions: 'Forwards tool calls to the configured MCP client connection.',
      },
    );

    this.registerTools();
  }

  private registerTools() {
    this.server.registerTool('proxy-remote-tool', {
      title: 'Proxy MCP Tool',
      description: 'Execute a tool on the upstream MCP server through the local client connection.',
      inputSchema: proxyToolSchema,
    }, async ({ tool, arguments: toolArguments }) => {
      const response = await this.options.client.rawClient.callTool({
        name: tool,
        arguments: toolArguments,
      });

      return { content: response.content };
    });

    this.server.registerTool('list-remote-tools', {
      title: 'List Remote Tools',
      description: 'Expose the upstream MCP tool surface for orchestration or discovery.',
      inputSchema: z.object({}),
    }, async () => {
      const tools = await this.options.client.listTools();
      const server = this.options.client.rawClient.getServerVersion();

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ server, tools: tools.tools }, null, 2),
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
