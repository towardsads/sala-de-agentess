export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed", message: "método não permitido" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "missing_api_key",
      message: "a variável de ambiente ANTHROPIC_API_KEY não está configurada neste projeto Vercel",
    });
    return;
  }

  const { system, text, image, tier } = req.body || {};
  if (!system || !text) {
    res.status(400).json({ error: "bad_request", message: "faltou system ou text no pedido" });
    return;
  }

  const model = tier === "complex" ? "claude-opus-5" : "claude-sonnet-5";

  const content = image
    ? [
        { type: "image", source: { type: "base64", media_type: "image/png", data: image } },
        { type: "text", text },
      ]
    : text;

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content }],
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      }),
    });

    const data = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      const msg = (data && (data.error?.message || data.message)) || `a API da Anthropic respondeu com erro ${upstream.status}`;
      res.status(upstream.status).json({ error: "upstream_error", message: msg });
      return;
    }

    const out = (data?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    if (!out) {
      res.status(502).json({ error: "empty_completion", message: "a IA não gerou nenhum texto desta vez" });
      return;
    }
    res.status(200).json({ text: out });
  } catch (e) {
    res.status(502).json({ error: "network_error", message: "falha ao falar com a API da Anthropic" });
  }
}
