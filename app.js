const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');

const app = express();
app.use(express.json());

// Make.com Webhook Endpoint
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || 'https://hook.eu1.make.com/tinwhmhhyctzfcjt3drh5a3wjf4yf891';

// Fresh Xiaozhi WebSocket Endpoint
const XIAOZHI_WSS_URL = process.env.XIAOZHI_WSS_URL || 'wss://api.xiaozhi.me/mcp/?token=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwNTM0MzgsImFnZW50SWQiOjI0MjgyNDYsImVuZHBvaW50SWQiOiJhZ2VudF8yNDI4MjQ2IiwicHVycG9zZSI6Im1jcC1lbmRwb2ludCIsImlhdCI6MTc5MDc5NTExMSwiZXhwIjoxODIyMzUyNzExfQ.M2wLSSUIcxdqUE9ynICOk_y0VPVTwHEictIhjfZQiHavyNrNESb_Von6UROixZaWDd8H-5sw3fLCGMujMOHStA';

// Health check route
app.get('/', (req, res) => {
  res.send('Xiaozhi MCP Server is Live & Connected!');
});

// Establish WebSocket Connection to Xiaozhi
function connectXiaozhi() {
  const ws = new WebSocket(XIAOZHI_WSS_URL);

  ws.on('open', () => {
    console.log('Connected directly to Xiaozhi WebSocket!');
    
    // Register tool manifest over WebSocket
    const manifest = {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        tools: [
          {
            name: 'open_app',
            description: 'Opens any requested application on the user\'s Android phone',
            parameters: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'The name of the application to open, e.g., YouTube, WhatsApp, Instagram, Spotify'
                }
              },
              required: ['message']
            }
          }
        ]
      }
    };
    ws.send(JSON.stringify(manifest));
  });

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      console.log('Received from Xiaozhi:', message);

      if (message.method === 'tools/call' || message.params?.name === 'open_app') {
        const appName = message.params?.arguments?.message || message.params?.message || 'WhatsApp';

        // Forward payload to Make.com
        await axios.post(MAKE_WEBHOOK_URL, { message: appName });

        if (message.id) {
          const response = {
            jsonrpc: '2.0',
            id: message.id,
            result: {
              content: [{ type: 'text', text: `Opening ${appName}...` }]
            }
          };
          ws.send(JSON.stringify(response));
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err.message);
    }
  });

  ws.on('close', () => {
    console.log('Xiaozhi WebSocket disconnected. Reconnecting in 5s...');
    setTimeout(connectXiaozhi, 5000);
  });

  ws.on('error', (err) => {
    console.error('WebSocket Error:', err.message);
  });
}

connectXiaozhi();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`HTTP Server listening on port ${PORT}`);
});
