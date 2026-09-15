export const config = { api: { bodyParser: { sizeLimit: "12mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ message: "A transcrição de arquivos precisa da variável OPENAI_API_KEY neste projeto Vercel." });
  }

  const { audio, filename = "audio.webm", mimeType = "audio/webm" } = req.body || {};
  if (!audio || typeof audio !== "string") return res.status(400).json({ message: "Envie um arquivo de áudio para transcrever." });

  try {
    const bytes = Buffer.from(audio, "base64");
    if (bytes.length > 8 * 1024 * 1024) return res.status(413).json({ message: "O áudio precisa ter até 8 MB." });
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mimeType }), filename);
    form.append("model", "gpt-4o-mini-transcribe");
    form.append("language", "pt");
    form.append("response_format", "json");

    const upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return res.status(upstream.status).json({ message: result?.error?.message || "Não foi possível transcrever o áudio." });
    if (!result?.text) return res.status(502).json({ message: "A transcrição voltou vazia." });
    res.status(200).json({ text: result.text });
  } catch {
    res.status(502).json({ message: "Falha ao enviar o áudio para transcrição." });
  }
}
