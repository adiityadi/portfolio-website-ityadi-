import test from 'node:test';
import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';
import { createSession, verifySession, verifyPassword, validPasswordHash, SESSION_SECONDS } from '../app/lib/auth-core.ts';
const password='a test owner password';
const salt='12345678901234567890123456789012';
const hash=`scrypt$${salt}$${scryptSync(password,salt,64).toString('hex')}`;
const secret='a'.repeat(64);
test('owner password matches only the configured scrypt hash',async()=>{
  assert.equal(validPasswordHash(hash),true);
  assert.equal(await verifyPassword(password,hash),true);
  assert.equal(await verifyPassword('wrong owner password',hash),false);
  assert.equal(await verifyPassword(password,'scrypt$bad$bad'),false);
});
test('sessions reject tampering, expiry, rotation and weak secrets',()=>{
  const now=1000000000,token=createSession(secret,hash,now);
  assert.equal(verifySession(token,secret,hash,now+1000),true);
  assert.equal(verifySession(token+'tampered',secret,hash,now),false);
  assert.equal(verifySession(token,secret,hash,now+SESSION_SECONDS*1000),false);
  assert.equal(verifySession(token,'b'.repeat(64),hash,now),false);
  assert.equal(verifySession(token,'short',hash,now),false);
  const rotated=hash.slice(0,-1)+(hash.endsWith('0')?'1':'0');
  assert.equal(verifySession(token,secret,rotated,now),false);
});
