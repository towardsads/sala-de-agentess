import { prepareStore, requireAuth, storeError } from "./_store.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    const store = await prepareStore();
    if (!requireAuth(req, res)) return;
    const { rows } = await store.query("select id, kind, data from sala_documents order by updated_at desc");
    const result = { clients: [], deliveries: [], agency: null };
    rows.forEach(({ id, kind, data }) => {
      if (kind === "client") result.clients.push({ id, ...data });
      if (kind === "delivery") result.deliveries.push({ id, ...data });
      if (kind === "agency") result.agency = { id, ...data };
    });
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(result);
  } catch (error) {
    if (storeError(res, error)) return;
    res.status(500).json({ message: "Não foi possível carregar a central." });
  }
}
