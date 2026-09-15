import crypto from "node:crypto";
import pg from "pg";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
let pool;

function db() {
  if (!connectionString) return null;
  if (!pool) pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 2 });
  return pool;
}

export async function prepareStore() {
  const client = db();
  if (!client) {
    const error = new Error("Banco de dados não conectado.");
    error.code = "NO_DATABASE";
    throw error;
  }
  await client.query(`create table if not exists sala_documents (
    id text primary key,
    kind text not null,
    data jsonb not null,
    updated_at timestamptz not null default now()
  )`);
  return client;
}

const secret = () => process.env.APP_SECRET || process.env.APP_SENHA || "";

export function hasPassword() { return Boolean(process.env.APP_SENHA); }

export function signSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 1000 * 60 * 60 * 24 * 30 })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function readCookie(req, name) {
  const pairs = (req.headers.cookie || "").split(";");
  const pair = pairs.find((item) => item.trim().startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(pair.indexOf("=") + 1).trim()) : "";
}

export function isAuthorized(req) {
  if (!hasPassword()) return false;
  const token = readCookie(req, "sala_session");
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(signature), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try { return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now(); } catch { return false; }
}

export function requireAuth(req, res) {
  if (isAuthorized(req)) return true;
  res.status(401).json({ error: "unauthorized", message: "Entre com a senha da agência para acessar a base." });
  return false;
}

export function storeError(res, error) {
  if (error?.code === "NO_DATABASE") {
    res.status(503).json({ error: "no_database", message: "A base central ainda não foi conectada à Vercel." });
    return true;
  }
  return false;
}
