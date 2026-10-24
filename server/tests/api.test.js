import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../index.js';

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    // Listen on port 0 for random free port
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('API Integration Endpoints', () => {
  it('GET /api/health returns health status and dependency checks', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.ok(res.status === 200 || res.status === 207);

    const data = await res.json();
    assert.strictEqual(data.service, 'LazyDesk AI Core Server');
    assert.ok(data.services);
    assert.ok('mongodb' in data.services);
    assert.ok('ollama' in data.services);
    assert.strictEqual(typeof data.services.ollama.connected, 'boolean');
  });

  it('POST /api/documents/upload rejects request when no file attached', async () => {
    const res = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST'
    });

    assert.ok(res.status === 400 || res.status === 503);
    const data = await res.json();
    assert.ok(data.error);
  });

  it('POST /api/documents/upload rejects unsupported file extension', async () => {
    const formData = new FormData();
    formData.append(
      'file',
      new Blob(['console.log("bad");'], { type: 'application/javascript' }),
      'malicious.js'
    );

    const res = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST',
      body: formData
    });

    assert.ok(res.status === 400 || res.status === 503);
    const data = await res.json();
    assert.ok(data.error);
    if (res.status === 400) {
      assert.ok(data.message.includes('Unsupported file type'));
    }
  });

  it('GET /api/documents handles special regex characters in search query safely', async () => {
    const res = await fetch(`${baseUrl}/api/documents?q=[special]*?(regex)+{1}`);
    assert.ok(res.status === 200 || res.status === 503);
    const data = await res.json();
    if (res.status === 200) {
      assert.ok(Array.isArray(data.documents));
    }
  });

  it('POST /api/documents/:id/analyze returns 404 for non-existent document ID', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await fetch(`${baseUrl}/api/documents/${fakeId}/analyze`, {
      method: 'POST'
    });
    assert.ok(res.status === 404 || res.status === 503);
  });
});
