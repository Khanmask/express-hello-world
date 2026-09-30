const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || 'https://hook.eu1.make.com/4xz6cjhsqhkq7qycw1enr19hqk2vhbna';

// Root health check
app.get('/', (req, res) => {
  res.send('Xiaozhi MCP Server is Live & Running!');
});

// SSE / MCP Endpoint for Xiaozhi Manifest
app.get('/mcp', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const manifest = {
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
  };

  res.write(`event: endpoint\ndata: ${JSON.stringify(manifest)}\n\n`);
});

// Tool Execution Endpoint
app.post('/mcp', async (req, res) => {
  try {
    const { params } = req.body;
    const appName = params?.message || req.body?.message || 'WhatsApp';

    await axios.post(MAKE_WEBHOOK_URL, { message: appName });

    res.json({
      result: {
        content: [
          {
            type: 'text',
            text: `Opening ${appName} on your phone...`
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error forwarding to Make.com:', error.message);
    res.status(500).json({ error: 'Failed to trigger webhook' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
