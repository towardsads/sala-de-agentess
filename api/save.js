import { prepareStore, requireAuth, storeError } from "./_store.js";

const kinds = new Set(["client", "delivery", "agency"]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { id, kind, data, operation } = req.body || {};
  if (!id || !kinds.has(kind)) return res.status(400).json({ message: "Registro inválido." });
  try {
    const store = await prepareStore();
    if (!requireAuth(req, res)) return;
    if (operation === "delete") {
      await store.query("delete from sala_documents where id = $1", [id]);
    } else {
      await store.query(`insert into sala_documents (id, kind, data) values ($1, $2, $3::jsonb)
        on conflict (id) do update set kind = excluded.kind, data = excluded.data, updated_at = now()`, [id, kind, JSON.stringify(data)]);
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    if (storeError(res, error)) return;
    res.status(500).json({ message: "Não foi possível salvar na central." });
  }
}
