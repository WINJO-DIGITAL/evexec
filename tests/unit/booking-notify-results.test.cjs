'use strict';

// A booking whose emails all send must return a clean result list. Before this fix,
// successful sends came back as null and the response reported "Cannot read properties of null".
// Run: npm run test:unit

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-unit';
process.env.SUPABASE_URL = 'https://db.test';
process.env.OPERATOR_EMAIL = 'ops@evexec.test';
process.env.RESEND_API_KEY = 're_unit';
delete process.env.SITE_URL;
delete process.env.TENANT_ID;

const brand = require('../../lib/brand');
const pricing = require('../../lib/pricing');

const EV = '00000000-0000-0000-0000-000000000001';
const inserts = [];
const emails = [];
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  const method = (opts.method || 'GET').toUpperCase();
  const body = opts.body && typeof opts.body === 'string' && opts.body.startsWith('{') ? JSON.parse(opts.body) : null;
  const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) });
  if (u.includes('/rest/v1/bookings') && method === 'POST') { inserts.push(body); return ok([{ id: `id-${inserts.length}`, ...body }]); }
  if (u.includes('api.resend.com') && method === 'POST') { emails.push(body); return ok({ id: 'em1' }); }
  return ok([]);
};

test.beforeEach(() => {
  inserts.length = 0; emails.length = 0;
  brand._setBrands({ [EV]: { name: 'EV Exec', contact_email: 'book@evexec.test', brand: { site_url: 'https://www.evexec.co.uk' }, ref_prefix: 'EVX' } });
  pricing._setPricing({ airports: [{ name: 'Manchester Airport', code: 'MAN', oneWay: 90, ret: 160 }], extraStop: 5 }, EV);
});
test.afterEach(() => { pricing._setPricing(null); brand._setBrands({}); });

function create(body) {
  const handler = require('../../api/booking/index.js');
  const chunks = [Buffer.from(JSON.stringify(body))];
  const req = { method: 'POST', url: '/api/booking/create', headers: { host: 'www.evexec.co.uk', 'content-type': 'application/json', 'x-forwarded-for': `8.8.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}` }, socket: { remoteAddress: '8.8.8.8' }, [Symbol.asyncIterator]: async function* () { yield* chunks; } };
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } };
  return handler(req, res).then(() => ({ status: res.statusCode, body: res.body ? JSON.parse(res.body) : null }));
}

test('a booking whose emails all send returns a clean notification list', async () => {
  const r = await create({
    customer_name: 'Sam Test', customer_phone: '07700 900123', customer_email: 'sam@example.org',
    travel_date: '2099-01-01', travel_time: '09:00', pickup_location: '1 High Street', passengers: 2,
    journey_type: 'To Airport', airport: 'Manchester Airport', terms_accepted: true, contact_method: 'WhatsApp',
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.success, true);
  assert.ok(!r.body.notifications.some((n) => n && n.label === 'notification_batch'), 'no batch-level crash');
  assert.ok(r.body.notifications.every((n) => n && typeof n === 'object'), 'no null entries');
  assert.ok(emails.length >= 1, 'emails were still sent');
});
