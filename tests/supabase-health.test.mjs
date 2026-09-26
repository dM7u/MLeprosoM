import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkSupabaseHealth} from '../scripts/check-supabase-health.mjs';
const env = {SUPABASE_URL:'https://example.supabase.co', SUPABASE_SECRET_KEY:'sb_secret_private'};

test('health makes a single bounded GET without redirect or data leakage', async () => {
  let calls = 0;
  const result = await checkSupabaseHealth({env, fetchImpl:async (url, options) => {
    calls++;
    assert.equal(url.href, 'https://example.supabase.co/rest/v1/fixtures?select=id&limit=1');
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.apikey, env.SUPABASE_SECRET_KEY);
    assert.equal(options.headers.Authorization, undefined);
    assert.ok(options.signal instanceof AbortSignal);
    return new Response(JSON.stringify([{id:'00000000-0000-4000-8000-000000000001'}]));
  }});
  assert.equal(calls, 1);
  assert.deepEqual(result, {ok:true,code:'HEALTH_READ_OK'});
});

test('health fails closed and sanitizes configuration, HTTP, parsing and transport errors', async () => {
  for (const url of ['http://example.com','https://user:pass@example.com','https://example.com/path','https://example.com/?key=private']) {
    assert.equal((await checkSupabaseHealth({env:{...env,SUPABASE_URL:url},fetchImpl:()=>assert.fail('must not fetch')})).ok,false);
  }
  for (const fetchImpl of [async()=>{throw new Error(env.SUPABASE_SECRET_KEY);},
    async()=>new Response('private',{status:503}), async()=>new Response('private'),
    async()=>new Response('{}'), async()=>new Response('[{"id":"invalid"}]')]) {
    const result = await checkSupabaseHealth({env,fetchImpl});
    assert.equal(result.ok,false);
    assert.ok(!JSON.stringify(result).includes('private'));
  }
});

test('health accepts empty tables and authenticates legacy service-role keys', async () => {
  const result = await checkSupabaseHealth({env:{...env,SUPABASE_SECRET_KEY:'eyJlegacy'},fetchImpl:async(_url,opts)=>{
    assert.equal(opts.headers.Authorization,'Bearer eyJlegacy');
    return new Response('[]');
  }});
  assert.equal(result.ok,true);
});
