// --- funções auxiliares: armazenamento, backend e SVG ---
export function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
export function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

// --- Chamada ao backend (a chave da Anthropic mora só no servidor) ---

export async function callClaude(system, text, image, tier) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, text, image, tier }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `a API respondeu com erro ${res.status}`);
  if (!data.text) throw new Error("a resposta veio vazia");
  return data.text;
}

export async function centralRequest(url, options = {}) {
  const res = await fetch(url, { credentials: "same-origin", ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Não foi possível falar com a central da agência.");
    error.status = res.status;
    throw error;
  }
  return data;
}

export const saveCentralDocument = (id, kind, data, operation) => centralRequest("/api/save", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: String(id), kind, data, operation }),
});

export function extrairEntrega(raw) {
  let intro = "";
  let corpo = raw;
  const i = raw.search(/===(?:ENTREGA|COPY|PLANO)===/);
  if (i >= 0) {
    intro = raw.slice(0, i).trim();
    corpo = raw.slice(i).replace(/^===(?:ENTREGA|COPY|PLANO)===/, "");
  }
  corpo = corpo.replace(/===FIM===[\s\S]*$/, "");
  let svg = null;
  const s = corpo.indexOf("<svg");
  if (s >= 0) {
    const e = corpo.lastIndexOf("</svg>");
    svg = e > s ? corpo.slice(s, e + 6) : corpo.slice(s);
    corpo = corpo.slice(0, s) + (e > s ? corpo.slice(e + 6) : "");
  }
  corpo = corpo.replace(/```(?:svg|xml|html)?/g, "").trim();
  return { intro, entrega: corpo, svg };
}

export function normalizarSvg(svg, w, h) {
  const abre = svg.match(/<svg[^>]*>/);
  if (!abre) return svg;
  let tag = abre[0];
  if (!/xmlns=/.test(tag)) tag = tag.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  if (!/viewBox=/.test(tag)) tag = tag.replace("<svg", `<svg viewBox="0 0 ${w} ${h}"`);
  if (!/\swidth=/.test(tag)) tag = tag.replace("<svg", `<svg width="${w}" height="${h}"`);
  return svg.replace(abre[0], tag);
}

export function limparSvg(svg) {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
}

export function svgValido(svg) {
  if (!svg || !svg.includes("</svg>")) return false;
  try {
    const d = new DOMParser().parseFromString(svg, "image/svg+xml");
    return d.getElementsByTagName("parsererror").length === 0;
  } catch (e) {
    return false;
  }
}

export const svgDataUri = (svg) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

export function larguraSvg(svg) {
  const m = svg.match(/viewBox="\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/);
  return m ? parseFloat(m[1]) : 1080;
}

export function svgParaPng(svg, largura) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w0 = img.naturalWidth || larguraSvg(svg);
        const h0 = img.naturalHeight || w0;
        const esc = largura / w0;
        const c = document.createElement("canvas");
        c.width = Math.round(w0 * esc);
        c.height = Math.round(h0 * esc);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("svg inválido"));
    img.src = svgDataUri(svg);
  });
}

export function baixarArquivo(nome, href) {
  const a = document.createElement("a");
  a.href = href;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function baixarPdf(nome, titulo, texto) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  const tituloLinhas = doc.splitTextToSize(titulo, maxWidth);
  let y = margin;
  tituloLinhas.forEach((linha) => { doc.text(linha, margin, y); y += 20; });
  y += 10;

  const limpo = (texto || "").replace(/\*\*(.+?)\*\*/g, "$1");
  const paragrafos = limpo.split(/\n/);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lineHeight = 15;

  paragrafos.forEach((paragrafo) => {
    if (paragrafo.trim() === "") {
      y += lineHeight * 0.6;
      return;
    }
    const linhas = doc.splitTextToSize(paragrafo, maxWidth);
    linhas.forEach((linha) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(linha, margin, y);
      y += lineHeight;
    });
  });

  doc.save(nome);
}

export async function copiarTexto(t) {
  try {
    await navigator.clipboard.writeText(t);
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}
