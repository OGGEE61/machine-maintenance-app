// A throwaway in-memory Postgres for end-to-end tests. It speaks just enough of Neon's
// SQL-over-HTTP protocol for the app's driver, and records emails instead of sending them.
import http from 'node:http';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const emails = [];

const toText = (value, oid) => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return oid === 1082 ? value.toISOString().slice(0, 10) : value.toISOString().replace('T', ' ').replace('Z', '+00');
  }
  if (typeof value === 'boolean') return value ? 't' : 'f';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

const run = async (executor, { query, params }) => {
  const result = await executor.query(query, params ?? [], { rowMode: 'array' });
  return {
    command: 'OK',
    rowCount: result.affectedRows || result.rows.length,
    rowAsArray: true,
    fields: (result.fields ?? []).map(({ name, dataTypeID }) => ({ name, dataTypeID })),
    rows: result.rows.map((row) => row.map((value, i) => toText(value, result.fields[i]?.dataTypeID))),
  };
};

const respond = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

http.createServer((req, res) => {
  if (req.url === '/health') return respond(res, 200, { ok: true });
  if (req.method === 'GET' && req.url === '/emails') return respond(res, 200, emails);

  let raw = '';
  req.on('data', (chunk) => { raw += chunk; });
  req.on('end', async () => {
    try {
      const body = JSON.parse(raw);
      if (req.url === '/emails') {
        emails.push(body);
        return respond(res, 200, { id: 'test' });
      }
      if (!body.queries) return respond(res, 200, await run(db, body));
      const results = [];
      await db.transaction(async (tx) => {
        for (const query of body.queries) results.push(await run(tx, query));
      });
      respond(res, 200, { results });
    } catch (err) {
      console.error('SQL error:', err.message);
      respond(res, 400, { message: err.message, code: err.code });
    }
  });
}).listen(5499, () => console.log('Test database ready'));
