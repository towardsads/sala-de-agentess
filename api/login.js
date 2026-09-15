import { hasPassword, signSession } from "./_store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!hasPassword()) return res.status(503).json({ message: "Defina APP_SENHA nas variáveis do projeto antes de liberar a central." });
  if ((req.body || {}).password !== process.env.APP_SENHA) return res.status(401).json({ message: "Senha incorreta." });
  const secure = process.env.VERCEL ? "; Secure" : "";
  res.setHeader("Set-Cookie", `sala_session=${encodeURIComponent(signSession())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`);
  res.status(200).json({ ok: true });
}
