const WebSocket = require('ws');
const http = require('http');

// Create a basic HTTP server so Render health checks pass
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Xiaozhi MCP Bridge is running!\n');
});

// Attach WebSocket server
const wss = new WebSocket.Server({ server });

const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/tinwhmhhyctzfcjt3drh5a3wjf4yf891';

wss.on('connection', (ws) => {
  console.log('Client connected (Xiaozhi)');

  ws.on('message', async (message) => {
    try {
      const request = JSON.parse(message);
      console.log('Received method:', request.method, 'ID:', request.id);

      // 1. Handshake: Ping
      if (request.method === 'ping') {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: {}
        }));
      }

      // 2. Handshake: Initialize
      else if (request.method === 'initialize') {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'xiaozhi-app-launcher',
              version: '1.0.0'
            }
          }
        }));
      }

      // 3. Tool Discovery: tools/list (Registers the tool in Xiaozhi UI)
      else if (request.method === 'tools/list') {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: [
              {
                name: 'open_app',
                description: 'Launches an Android application or game on the user device by name (e.g., YouTube, WhatsApp, Bloodstrike, PUBG)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                      description: 'The exact name of the app or game to launch'
                    }
                  },
                  required: ['message']
                }
              }
            ]
          }
        }));
      }

      // 4. Execution: tools/call (Calls Make.com Webhook)
      else if (request.method === 'tools/call') {
        const appName = request.params?.arguments?.message || 'YouTube';
        console.log(`Triggering app launch for: ${appName}`);

        // Dispatch call to Make.com Webhook
        try {
          await fetch(`${MAKE_WEBHOOK_URL}?message=${encodeURIComponent(appName)}`);
          console.log(`Successfully dispatched ${appName} to Make.com`);
        } catch (fetchError) {
          console.error('Failed to dispatch to Make.com:', fetchError);
        }

        // Send confirmation back to Xiaozhi LLM
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: `Successfully launched ${appName} on your phone!`
              }
            ]
          }
        }));
      }

      // Fallback for unknown methods
      else {
        if (request.id !== undefined) {
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32601,
              message: 'Method not found'
            }
          }));
        }
      }

    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
