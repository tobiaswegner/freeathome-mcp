#!/usr/bin/env node

import express, { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { FreeAtHomeService } from './freehome-service';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  isInitializeRequest,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'freehome-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let freeAtHomeService: FreeAtHomeService;

const tools: Tool[] = [
  {
    name: 'get_devices',
    description: 'Get all devices from the free@home system',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_device_info',
    description: 'Get detailed information about a specific device',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'The ID of the device to get information for',
        },
      },
      required: ['deviceId'],
    },
  },
  {
    name: 'set_device_state',
    description: 'Control a device by setting its state',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'The ID of the device to control',
        },
        channelId: {
          type: 'string',
          description: 'The channel ID of the device',
        },
        datapoint: {
          type: 'string',
          description: 'The datapoint to set (e.g., "odp0000" for switch)',
        },
        value: {
          type: 'string',
          description: 'The value to set',
        },
      },
      required: ['deviceId', 'channelId', 'datapoint', 'value'],
    },
  },
  {
    name: 'get_datapoints',
    description: 'Get all datapoints for a specific device and channel',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'The ID of the device',
        },
        channelId: {
          type: 'string',
          description: 'The channel ID',
        },
      },
      required: ['deviceId', 'channelId'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_devices':
        const devices = await freeAtHomeService.getDevices();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(devices, null, 2),
            },
          ],
        };

      case 'get_device_info':
        if (!args?.deviceId || typeof args.deviceId !== 'string') {
          throw new Error('deviceId is required and must be a string');
        }
        const deviceInfo = await freeAtHomeService.getDeviceInfo(args.deviceId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(deviceInfo, null, 2),
            },
          ],
        };

      case 'set_device_state':
        if (!args?.deviceId || typeof args.deviceId !== 'string' ||
            !args?.channelId || typeof args.channelId !== 'string' ||
            !args?.datapoint || typeof args.datapoint !== 'string' ||
            !args?.value || typeof args.value !== 'string') {
          throw new Error('deviceId, channelId, datapoint, and value are required and must be strings');
        }
        const result = await freeAtHomeService.setDeviceState(
          args.deviceId,
          args.channelId,
          args.datapoint,
          args.value
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: result }, null, 2),
            },
          ],
        };

      case 'get_datapoints':
        if (!args?.deviceId || typeof args.deviceId !== 'string' ||
            !args?.channelId || typeof args.channelId !== 'string') {
          throw new Error('deviceId and channelId are required and must be strings');
        }
        const datapoints = await freeAtHomeService.getDatapoints(
          args.deviceId,
          args.channelId
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(datapoints, null, 2),
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
});

async function main(): Promise<void> {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  freeAtHomeService = new FreeAtHomeService();
  await freeAtHomeService.connect();

  const app = express();
  
  app.use(express.json());
  
  const transports: Record<string, StreamableHTTPServerTransport> = {};
  
  app.all('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string;
    
    try {
      let transport: StreamableHTTPServerTransport;
      
      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            console.log(`Session initialized with ID: ${sessionId}`);
            transports[sessionId] = transport;
          }
        });
        
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            console.log(`Transport closed for session ${sid}`);
            delete transports[sid];
          }
        };
        
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
          id: null,
        });
        return;
      }
      
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });
  
  app.listen(port, () => {
    console.log(`Free@Home MCP server running on HTTP port ${port}`);
    console.log(`Connect to: http://localhost:${port}/mcp`);
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
}