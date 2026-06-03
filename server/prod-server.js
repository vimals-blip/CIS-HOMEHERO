import express from 'express';
import path from 'node:path';
import server from '../dist/server/server.js';

const app = express();
const clientDist = path.resolve(process.cwd(), 'dist/client');

app.use(express.static(clientDist, { index: false, extensions: ['html'] }));

app.get('*', async (req, res) => {
  try {
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req,
    });

    const response = await server.fetch(request);
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (response.body) {
      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    } else {
      res.end();
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

const port = Number(process.env.PORT || 4174);
app.listen(port, () => {
  console.log(`Frontend production server listening on http://localhost:${port}`);
});
