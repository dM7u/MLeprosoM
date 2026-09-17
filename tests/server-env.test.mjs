import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getSupabaseConfig } from "../src/server/env.ts";

const originalUrl = process.env.SUPABASE_URL;
const originalKey = process.env.SUPABASE_SECRET_KEY;
afterEach(() => {
  for (const [name, value] of [["SUPABASE_URL", originalUrl], ["SUPABASE_SECRET_KEY", originalKey]]) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test("importar la configuración sin credenciales funciona; usarla falla sin revelar valores", () => {
  delete process.env.SUPABASE_URL;
  process.env.SUPABASE_SECRET_KEY = "test-only-private-value";
  assert.throws(getSupabaseConfig, (error) => {
    assert.match(error.message, /Configuración de Supabase incompleta/);
    assert.ok(!error.message.includes("test-only-private-value"));
    return true;
  });
});

test("rechaza claves vacías y URLs inseguras o con credenciales", () => {
  process.env.SUPABASE_URL = "https://example.test";
  process.env.SUPABASE_SECRET_KEY = " ";
  assert.throws(getSupabaseConfig, /incompleta/);
  process.env.SUPABASE_SECRET_KEY = "test-only-private-value";
  for (const url of ["not-a-url", "http://example.test", "https://user:pass@example.test", "https://example.test/path", "https://example.test?key=private", "https://example.test#private"]) {
    process.env.SUPABASE_URL = url;
    assert.throws(getSupabaseConfig, (error) => {
      assert.match(error.message, /SUPABASE_URL/);
      assert.ok(!error.message.includes(url));
      return true;
    });
  }
});

test("acepta configuración explícita y normaliza el origen sin hacer requests", () => {
  process.env.SUPABASE_URL = " https://example.test/ ";
  process.env.SUPABASE_SECRET_KEY = " test-only-private-value ";
  assert.deepEqual(getSupabaseConfig(), {
    url: "https://example.test",
    secretKey: "test-only-private-value",
  });
});
