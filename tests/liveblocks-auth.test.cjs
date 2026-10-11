/* eslint-disable @typescript-eslint/no-require-imports -- Mock external auth and collaboration services. */
const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');
const { Module } = require('node:module');
let userId, access, calls, failure;
function stub(name, exports) {
  const path = require.resolve(name);
  const mod = new Module(path);
  mod.exports = exports;
  mod.loaded = true;
  require.cache[path] = mod;
}
stub('server-only', {});
stub('@clerk/nextjs/server', {
  auth: async () => ({ userId }),
  currentUser: async () => ({ id: userId, fullName: 'Test User', imageUrl: 'https://example.com/avatar.png' }),
});
stub('../lib/project-access.ts', { getProjectAccess: async (room) => {
  calls.push(['access', room]);
  return access ? { id: room } : null;
} });
stub('../lib/liveblocks.ts', { getLiveblocks: () => ({
  getOrCreateRoom: async (...args) => { calls.push(['room', ...args]); if (failure) throw new Error('Service failed'); },
  prepareSession: (...args) => {
    calls.push(['session', ...args]);
    return { FULL_ACCESS: ['*:write'], allow: (...args) => calls.push(['allow', ...args]),
      authorize: async () => ({ body: JSON.stringify({ token: 'test-token' }), status: 200 }) };
  },
}) });
const { POST } = require('../app/api/liveblocks-auth/route.ts');
const { getCursorColor, CURSOR_COLORS } = require('../lib/cursor-color.ts');
const request = (body = { room: 'project' }) => new Request('http://localhost/api/liveblocks-auth', {
  method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body),
});
beforeEach(() => { userId = 'owner'; access = true; calls = []; failure = false; });
test('signed-out requests cannot access rooms', async () => {
  userId = null;
  assert.equal((await POST(request())).status, 401);
  assert.deepEqual(calls, []);
});
test('missing or inaccessible project returns 403 before Liveblocks calls', async () => {
  access = false;
  assert.equal((await POST(request())).status, 403);
  assert.deepEqual(calls, [['access', 'project']]);
});
test('invalid room and malformed JSON never authorize', async () => {
  for (const body of ['{', {}, { room: '*' }, { room: 1 }, { room: '' }, { room: 'a'.repeat(257) }]) {
    assert.equal((await POST(request(body))).status, 400);
  }
  assert.deepEqual(calls, []);
});
test('authorized sessions use a private project room and server-derived metadata', async () => {
  const response = await POST(request({ room: 'project', userId: 'forged', userInfo: { name: 'Forged' } }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { token: 'test-token' });
  assert.deepEqual(calls, [
    ['access', 'project'], ['room', 'project', { defaultAccesses: [] }],
    ['session', 'owner', { userInfo: { name: 'Test User', avatar: 'https://example.com/avatar.png', color: getCursorColor('owner') } }],
    ['allow', 'project', ['*:write']],
  ]);
});
test('service failure returns 503 without issuing a session', async () => {
  failure = true;
  assert.equal((await POST(request())).status, 503);
  assert.equal(calls.some(([name]) => name === 'session'), false);
});
test('cursor colors are stable palette members even for long and unicode IDs', () => {
  for (const id of ['owner', 'collaborator', '', '??', 'x'.repeat(10000)]) {
    assert.equal(getCursorColor(id), getCursorColor(id));
    assert.ok(CURSOR_COLORS.includes(getCursorColor(id)));
  }
  assert.ok(new Set(Array.from({ length: 50 }, (_, i) => getCursorColor(`user${i}`))).size > 1);
});

test('server client initializes lazily and survives module reload', () => {
  const clientPath = require.resolve('../lib/liveblocks.ts');
  const oldSecret = process.env.LIVEBLOCKS_SECRET_KEY;
  let constructions = 0;
  stub('@liveblocks/node', { Liveblocks: class {
    constructor(options) { constructions++; assert.equal(options.secret, 'sk_test_fake'); }
  } });
  delete require.cache[clientPath];
  delete globalThis.liveblocks;
  try {
    delete process.env.LIVEBLOCKS_SECRET_KEY;
    const first = require('../lib/liveblocks.ts');
    assert.equal(constructions, 0);
    assert.throws(() => first.getLiveblocks(), /LIVEBLOCKS_SECRET_KEY/);
    process.env.LIVEBLOCKS_SECRET_KEY = 'sk_test_fake';
    const client = first.getLiveblocks();
    assert.equal(first.getLiveblocks(), client);
    delete require.cache[clientPath];
    assert.equal(require('../lib/liveblocks.ts').getLiveblocks(), client);
    assert.equal(constructions, 1);
  } finally {
    delete globalThis.liveblocks;
    if (oldSecret === undefined) delete process.env.LIVEBLOCKS_SECRET_KEY;
    else process.env.LIVEBLOCKS_SECRET_KEY = oldSecret;
  }
});
