import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve, relative, isAbsolute} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createBetaApi102, isStudyStorageKey102} from './scripts/beta102-api.mjs';

const origin = 'http://127.0.0.1:4197';
const secret = 'correct horse 102';
const studyKey = 'kunilingo.practice84';

async function fixture(t) {
  const temporaryRoot = resolve(tmpdir());
  const directory = await mkdtemp(resolve(temporaryRoot, 'kunilingo-beta102-'));
  let time = 1900000000000;
  let api = createBetaApi102({dataDirectory: directory, origin, now: () => time});
  const identities = new Map();
  t.after(async () => {
    api.close();
    const part = relative(temporaryRoot, resolve(directory));
    assert.ok(part && part !== '..' && !part.startsWith('..') && !isAbsolute(part) && part.startsWith('kunilingo-beta102-'));
    await rm(directory, {recursive: true, force: true});
  });
  async function request(path, {method = 'GET', body, cookie, headers = {}, requestOrigin = origin, expectedUser = cookie ? identities.get(cookie) || 'guest' : 'guest'} = {}) {
    const sent = {...(method === 'GET' ? {} : {'Origin': origin}), ...(body !== undefined ? {'Content-Type': 'application/json'} : {}), ...(cookie ? {'Cookie': cookie} : {}), ...(expectedUser ? {'X-KuniLingo-User': expectedUser} : {}), ...headers};
    const response = await api.fetch(new Request(requestOrigin + '/api/beta/' + path, {method, headers: sent, ...(body !== undefined ? {body: JSON.stringify(body)} : {})}));
    if (!response) return null;
    const data = await response.json(), receivedCookie = response.headers.get('set-cookie')?.split(';')[0];
    if (receivedCookie && data.user?.id) identities.set(receivedCookie, data.user.id);
    return {response, status: response.status, data, cookie: receivedCookie};
  }
  return {directory, request, get api() { return api; }, advance(ms) { time += ms; }, reopen() { api.close(); api = createBetaApi102({dataDirectory: directory, origin, now: () => time}); }};
}

const register = (f, username, extra = {}) => f.request('register', {method: 'POST', body: {username, password: secret, ...extra}});

test('registration persists real users, hashed passwords and hashed session tokens across reopen', async t => {
  const f = await fixture(t), registered = await register(f, 'First_User', {displayName: 'Первый'});
  assert.equal(registered.status, 201);
  assert.deepEqual(Object.keys(registered.data.user).sort(), ['displayName', 'id', 'role', 'username']);
  assert.equal(registered.data.user.username, 'first_user');
  assert.equal(registered.data.user.role, 'owner');
  assert.match(registered.response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  assert.match(registered.response.headers.get('set-cookie'), /Path=\/api\/beta/);
  const inspection = new DatabaseSync(resolve(f.directory, 'beta102.sqlite'));
  const user = inspection.prepare('SELECT * FROM users').get();
  const session = inspection.prepare('SELECT * FROM sessions').get();
  inspection.close();
  assert.equal(user.password_hash.length, 128);
  assert.equal(user.password_salt.length, 32);
  assert.notEqual(session.token_hash, registered.cookie.split('=')[1]);
  assert.equal(session.token_hash.length, 64);
  assert.ok(!JSON.stringify(user).includes(secret));
  f.reopen();
  const current = await f.request('session', {cookie: registered.cookie});
  assert.deepEqual(current.data.user, registered.data.user);
  const second = await register(f, 'Second_User');
  assert.equal(second.data.user.role, 'learner');
  assert.equal((await register(f, 'FIRST_USER')).data.error.code, 'username_taken');
});

test('login verifies password, rotates the existing session and logout invalidates it', async t => {
  const f = await fixture(t), account = await register(f, 'Learner');
  const wrong = await f.request('login', {method: 'POST', body: {username: 'learner', password: 'wrong password'}});
  const unknown = await f.request('login', {method: 'POST', body: {username: 'unknown', password: 'wrong password'}});
  assert.equal(wrong.status, 401);
  assert.deepEqual(wrong.data, unknown.data);
  const login = await f.request('login', {method: 'POST', body: {username: 'LEARNER', password: secret}, cookie: account.cookie});
  assert.equal(login.status, 200);
  assert.notEqual(login.cookie, account.cookie);
  assert.equal((await f.request('session', {cookie: account.cookie})).data.user, null);
  assert.equal((await f.request('session', {cookie: login.cookie})).data.user.id, account.data.user.id);
  const logout = await f.request('logout', {method: 'POST', body: {}, cookie: login.cookie});
  assert.equal(logout.status, 200);
  assert.match(logout.response.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await f.request('progress', {cookie: login.cookie})).status, 401);
});

test('expired and malformed sessions cannot read progress', async t => {
  const f = await fixture(t), account = await register(f, 'expiry');
  assert.equal((await f.request('progress', {cookie: 'kunilingo_beta102=bad'})).status, 401);
  f.advance(14 * 24 * 60 * 60 * 1000 + 1);
  assert.equal((await f.request('progress', {cookie: account.cookie})).status, 401);
  const session = await f.request('session', {cookie: account.cookie});
  assert.equal(session.data.user, null);
  assert.match(session.response.headers.get('set-cookie'), /Max-Age=0/);
});

test('progress is isolated, durable, and conflicting writes return the current snapshot without overwriting it', async t => {
  const f = await fixture(t), one = await register(f, 'first'), two = await register(f, 'second');
  const records = {[studyKey]: {drafts: {'D2027-4-1': '5421'}}, 'kunilingo.pencil98.445A48': {strokes: [{points: [1, 2]}]}, 'kunilingo.russian.2027.priorities': ['norms']};
  assert.deepEqual((await f.request('progress', {cookie: one.cookie})).data, {revision: 0, records: {}});
  const saved = await f.request('progress', {method: 'PUT', cookie: one.cookie, body: {revision: 0, records}});
  assert.deepEqual(saved.data, {revision: 1, records});
  const conflict = await f.request('progress', {method: 'PUT', cookie: one.cookie, body: {revision: 0, records: {}}});
  assert.equal(conflict.status, 409);
  assert.equal(conflict.data.error.code, 'progress_conflict');
  assert.equal(conflict.data.revision, 1);
  assert.deepEqual(conflict.data.records, records);
  assert.deepEqual((await f.request('progress', {cookie: two.cookie})).data, {revision: 0, records: {}});
  const impersonate = await f.request('progress', {method: 'PUT', cookie: two.cookie, body: {revision: 0, records, userId: one.data.user.id}});
  assert.equal(impersonate.status, 400);
  f.reopen();
  assert.deepEqual((await f.request('progress', {cookie: one.cookie})).data, {revision: 1, records});
  assert.deepEqual((await f.request('progress', {cookie: two.cookie})).data, {revision: 0, records: {}});
});

test('a shared cookie switched in another tab cannot mix equal-revision account outboxes or reveal its feedback', async t => {
  const f = await fixture(t), alice = await register(f, 'alice'), bob = await register(f, 'bob');
  const sharedBrowserCookie = bob.cookie;
  const aliceHeader = alice.data.user.id;
  for (const path of ['progress', 'feedback', 'admin/feedback']) {
    const read = await f.request(path, {cookie: sharedBrowserCookie, expectedUser: aliceHeader});
    assert.equal(read.status, 401);
    assert.equal(read.data.error.code, 'session_changed');
  }
  const oldTabWrite = await f.request('progress', {method: 'PUT', cookie: sharedBrowserCookie, expectedUser: aliceHeader, body: {revision: 0, records: {[studyKey]: {drafts: {one: 'Alice private answer'}}}}});
  assert.equal(oldTabWrite.status, 401);
  assert.equal(oldTabWrite.data.error.code, 'session_changed');
  assert.deepEqual((await f.request('progress', {cookie: bob.cookie})).data, {revision: 0, records: {}});
  assert.equal((await f.request('progress', {cookie: bob.cookie, expectedUser: null})).status, 401);
  assert.equal((await f.request('logout', {method: 'POST', body: {}, cookie: sharedBrowserCookie, expectedUser: aliceHeader})).status, 401);
  assert.equal((await f.request('session', {cookie: bob.cookie})).data.user.id, bob.data.user.id);
  const guestWrongIdentity = await f.request('feedback', {method: 'POST', cookie: sharedBrowserCookie, expectedUser: 'guest', body: {category: 'bug', message: 'Guest report', context: {section: 'general'}}});
  assert.equal(guestWrongIdentity.status, 401);
  const missingGuestIdentity = await f.request('feedback', {method: 'POST', expectedUser: null, body: {category: 'bug', message: 'Guest report', context: {section: 'general'}}});
  assert.equal(missingGuestIdentity.status, 401);
});

test('same-origin and JSON checks reject cross-origin, missing-origin and non-JSON mutations', async t => {
  const f = await fixture(t);
  for (const headers of [{'Origin': 'https://attacker.test'}, {'Origin': ''}, {'Sec-Fetch-Site': 'cross-site'}]) {
    const result = await f.request('register', {method: 'POST', body: {username: 'owner', password: secret}, headers});
    assert.equal(result.status, 403);
  }
  const type = await f.request('register', {method: 'POST', body: {}, headers: {'Content-Type': 'text/plain'}});
  assert.equal(type.status, 415);
  const foreign = await f.request('session', {requestOrigin: 'http://localhost:4197'});
  assert.equal(foreign.status, 403);
  const crossRead = await f.request('session', {headers: {'Origin': 'https://attacker.test'}});
  assert.equal(crossRead.status, 403);
  const valid = await register(f, 'owner');
  assert.equal(valid.data.user.role, 'owner');
});

test('progress accepts normal pencil payloads above 512KB but rejects unknown keys, prototype keys and UTF-8 record overflow', async t => {
  const f = await fixture(t), account = await register(f, 'pencil');
  assert.ok(isStudyStorageKey102('kunilingo.pencil98.D2027-A12-1'));
  assert.ok(!isStudyStorageKey102('kunilingo.pencil98.secret.token'));
  assert.ok(!isStudyStorageKey102('atmosphere.enabled'));
  const ordinary = {'kunilingo.pencil98.445A48': {strokes: 'а'.repeat(300000)}};
  assert.equal((await f.request('progress', {method: 'PUT', cookie: account.cookie, body: {revision: 0, records: ordinary}})).status, 200);
  for (const records of [{'auth.token': 'bad'}, JSON.parse('{"kunilingo.practice84":{"__proto__":{"polluted":true}}}')]) {
    assert.equal((await f.request('progress', {method: 'PUT', cookie: account.cookie, body: {revision: 1, records}})).status, 400);
  }
  const oversized = {'kunilingo.pencil98.445A48': {strokes: 'я'.repeat(2 * 1024 * 1024)}};
  const rejected = await f.request('progress', {method: 'PUT', cookie: account.cookie, body: {revision: 1, records: oversized}});
  assert.equal(rejected.status, 413);
  assert.equal(rejected.data.error.code, 'record_too_large');
  assert.equal((await f.request('progress', {cookie: account.cookie})).data.revision, 1);
  const manyRecords = Object.fromEntries(Array.from({length: 3}, (_, i) => ['kunilingo.pencil98.D2027-4-' + i, {strokes: 'я'.repeat(1500000)}]));
  assert.equal((await f.request('progress', {method: 'PUT', cookie: account.cookie, body: {revision: 1, records: manyRecords}})).status, 413);
});

test('guest feedback receives a receipt; only the owner reads the complete queue and changes status', async t => {
  const f = await fixture(t), owner = await register(f, 'owner'), learner = await register(f, 'learner'), other = await register(f, 'other');
  const context = {section: 'practice', exerciseId: '445A48', version: '102', viewport: {width: 1280, height: 720}};
  const guest = await f.request('feedback', {method: 'POST', body: {category: 'bug', message: 'Не открывается условие.', context}});
  assert.equal(guest.status, 201);
  assert.equal(guest.data.feedback.status, 'new');
  assert.deepEqual(guest.data.feedback.context, context);
  assert.equal((await f.request('feedback')).status, 401);
  const report = await f.request('feedback', {method: 'POST', cookie: learner.cookie, body: {category: 'content', message: 'Опечатка в правиле.', context}});
  assert.equal((await f.request('feedback', {cookie: learner.cookie})).data.items.length, 1);
  assert.equal((await f.request('feedback', {cookie: other.cookie})).data.items.length, 0);
  assert.equal((await f.request('admin/feedback', {cookie: learner.cookie})).status, 403);
  assert.equal((await f.request('admin/feedback/' + report.data.feedback.id, {method: 'PATCH', cookie: learner.cookie, body: {status: 'resolved'}})).status, 403);
  const queue = await f.request('admin/feedback', {cookie: owner.cookie});
  assert.equal(queue.data.items.length, 2);
  assert.ok(queue.data.items.some(item => item.userId === null));
  const pageOne = await f.request('admin/feedback?limit=1', {cookie: owner.cookie});
  assert.equal(pageOne.data.items.length, 1);
  assert.ok(pageOne.data.nextCursor);
  const pageTwo = await f.request('admin/feedback?limit=1&cursor=' + pageOne.data.nextCursor, {cookie: owner.cookie});
  assert.equal(pageTwo.data.items.length, 1);
  assert.notEqual(pageOne.data.items[0].id, pageTwo.data.items[0].id);
  assert.equal(pageTwo.data.nextCursor, null);
  const patched = await f.request('admin/feedback/' + report.data.feedback.id, {method: 'PATCH', cookie: owner.cookie, body: {status: 'resolved'}});
  assert.equal(patched.data.feedback.status, 'resolved');
  assert.equal((await f.request('feedback', {cookie: learner.cookie})).data.items[0].status, 'resolved');
  assert.equal((await f.request('admin/feedback/' + report.data.feedback.id, {method: 'PATCH', cookie: owner.cookie, body: {status: 'invented'}})).status, 400);
  f.reopen();
  assert.equal((await f.request('admin/feedback', {cookie: owner.cookie})).data.items.length, 2);
});

test('feedback validation excludes arbitrary browser dumps and persistent rate limits survive reopen', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('feedback', {method: 'POST', body: {category: 'bug', message: 'There is an error', context: {section: 'practice', cookies: 'secret'}}})).status, 400);
  for (let i = 0; i < 39; i++) {
    const result = await f.request('feedback', {method: 'POST', body: {category: 'bug', message: 'Проверка ограничения ' + i, context: {section: 'general'}}});
    assert.equal(result.status, 201);
  }
  f.reopen();
  const limited = await f.request('feedback', {method: 'POST', body: {category: 'bug', message: 'Повтор сверх лимита', context: {section: 'general'}}});
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.response.headers.get('retry-after')) > 0);
  f.advance(60 * 60 * 1000 + 1);
  assert.equal((await f.request('feedback', {method: 'POST', body: {category: 'bug', message: 'После ожидания', context: {section: 'general'}}})).status, 201);
});

test('parallel registration grants a single owner and bounds expensive password work', async t => {
  const f = await fixture(t);
  const attempts = await Promise.all(Array.from({length: 6}, (_, i) => register(f, 'parallel_' + i)));
  assert.equal(attempts.filter(result => result.status === 201).length, 4);
  assert.equal(attempts.filter(result => result.status === 503 && result.data.error.code === 'busy').length, 2);
  assert.equal(attempts.filter(result => result.data.user?.role === 'owner').length, 1);
  assert.equal(attempts.filter(result => result.data.user?.role === 'learner').length, 3);
});

test('registration and username login limits persist without creating users from invalid requests', async t => {
  const f = await fixture(t);
  for (let i = 0; i < 20; i++) {
    assert.equal((await register(f, 'invalid_' + i, {password: 'short'})).status, 400);
  }
  f.reopen();
  assert.equal((await register(f, 'after_limit')).status, 429);
  f.advance(60 * 60 * 1000 + 1);
  const firstValid = await register(f, 'valid_owner');
  assert.equal(firstValid.data.user.role, 'owner');
  for (let i = 0; i < 12; i++) {
    assert.equal((await f.request('login', {method: 'POST', body: {username: 'valid_owner', password: 'wrong password'}})).status, 401);
  }
  f.reopen();
  const blocked = await f.request('login', {method: 'POST', body: {username: 'valid_owner', password: secret}});
  assert.equal(blocked.status, 429);
  f.advance(15 * 60 * 1000 + 1);
  assert.equal((await f.request('login', {method: 'POST', body: {username: 'valid_owner', password: secret}})).status, 200);
});

test('unrelated requests return null, malformed JSON is safe and closed factories stop serving', async t => {
  const f = await fixture(t);
  assert.equal(await f.api.fetch(new Request(origin + '/api/fipi/catalog')), null);
  const malformed = await f.api.fetch(new Request(origin + '/api/beta/register', {method: 'POST', headers: {'Origin': origin, 'Content-Type': 'application/json'}, body: '{invalid'}));
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, 'invalid_input');
  f.api.close();
  assert.equal((await f.request('session')).status, 503);
});
