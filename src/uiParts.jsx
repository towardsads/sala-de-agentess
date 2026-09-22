import { useState, useRef, useEffect } from "react";
import { C, AGENTS, juntar } from "./agencyData.js";
import { svgValido, svgDataUri, larguraSvg, svgParaPng, baixarArquivo, baixarPdf, copiarTexto } from "./helpers.js";

// --- Ditado por voz (Web Speech API) ---

export function reconhecimentoDisponivel() {
  return typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function CampoComVoz({ linhas, value, onChange, placeholder, className, style, wrapperClassName }) {
  const [ouvindo, setOuvindo] = useState(false);
  const recRef = useRef(null);
  const valorRef = useRef(value);
  valorRef.current = value;
  const suportado = reconhecimentoDisponivel();

  useEffect(() => () => { try { recRef.current && recRef.current.stop(); } catch (e) {} }, []);

  const alternar = () => {
    if (!suportado) return;
    if (ouvindo) {
      try { recRef.current && recRef.current.stop(); } catch (e) {}
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e) => {
      let texto = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) texto += e.results[i][0].transcript;
      }
      texto = texto.trim();
      if (texto) {
        const atual = valorRef.current || "";
        onChange(atual ? `${atual} ${texto}` : texto);
      }
    };
    rec.onerror = () => setOuvindo(false);
    rec.onend = () => setOuvindo(false);
    recRef.current = rec;
    try {
      rec.start();
      setOuvindo(true);
    } catch (e) {}
  };

  const Tag = linhas > 1 ? "textarea" : "input";
  return (
    <div className={`relative ${wrapperClassName || ""}`}>
      <Tag
        rows={linhas > 1 ? linhas : undefined}
        className={className}
        style={{ ...style, paddingRight: 40 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {suportado && (
        <button
          type="button"
          onClick={alternar}
          title={ouvindo ? "Parar ditado" : "Ditar por voz"}
          aria-label={ouvindo ? "Parar ditado por voz" : "Ditar por voz"}
          className={ouvindo ? "ditando absolute rounded-full flex items-center justify-center" : "absolute rounded-full flex items-center justify-center"}
          style={{
            right: 7,
            top: linhas > 1 ? 7 : "50%",
            transform: linhas > 1 ? "none" : "translateY(-50%)",
            width: 26,
            height: 26,
            fontSize: 12,
            background: ouvindo ? "#FF5F7A" : C.painel2,
            border: `1px solid ${ouvindo ? "#FF5F7A" : C.linha}`,
          }}
        >
          🎤
        </button>
      )}
    </div>
  );
}

export function Mesa({ sala, falando = null, alvos = [], arestas = {}, online = [], centro = "", sub = "" }) {
  const ids = sala.mesa;
  const n = ids.length;
  const escala = n > 7 ? 1 + (n - 7) * 0.09 : 1;
  const W = 560 * escala, H = 355 * escala, cx = W / 2, cy = H / 2, srx = 225 * escala, sry = 125 * escala, trx = 158 * escala, try_ = 75 * escala;
  const fonteRotulo = n > 12 ? 8.5 : 9.5;
  const larguraRotulo = n > 12 ? 62 : 72;
  const pos = {};
  ids.forEach((id, i) => {
    const a = Math.PI / 2 + (i * 2 * Math.PI) / n;
    pos[id] = { x: cx + srx * Math.cos(a), y: cy + sry * Math.sin(a) };
  });
  const curva = (a, b) => {
    const p = pos[a], q = pos[b];
    if (!p || !q) return null;
    const qx = ((p.x + q.x) / 2) * 0.4 + cx * 0.6;
    const qy = ((p.y + q.y) / 2) * 0.4 + cy * 0.6;
    return `M${p.x.toFixed(1)} ${p.y.toFixed(1)} Q${qx.toFixed(1)} ${qy.toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  };
  const reduz = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const envolvidos = falando ? [falando, ...alvos] : null;
  const corAtiva = falando ? AGENTS[falando].cor : C.brilho;

  const anel = ids.map((id, i) => [id, ids[(i + 1) % n]]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full block command-table mesa-floating" role="img" aria-label="Mesa da equipe de agentes">
      <defs>
        <radialGradient id="mesaGrad" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#3A1417" />
          <stop offset="52%" stopColor="#200D0F" />
          <stop offset="100%" stopColor="#0A0506" />
        </radialGradient>
        <radialGradient id="holoGrad"><stop stopColor="#FFFFFF" stopOpacity=".55"/><stop offset="1" stopColor="#FF3B3F" stopOpacity="0"/></radialGradient>
        <filter id="brilhoLinha" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse cx={cx} cy={cy + 24} rx={trx + 43} ry={try_ + 30} fill="#050303" opacity=".8" />
      <ellipse cx={cx} cy={cy} rx={trx + 14} ry={try_ + 14} fill="none" stroke="#7A3438" strokeOpacity=".35" strokeWidth="1" strokeDasharray="3 10" className="orbita" />
      <ellipse cx={cx} cy={cy} rx={trx} ry={try_} fill="url(#mesaGrad)" stroke={corAtiva} strokeOpacity=".75" strokeWidth="2" style={{ transition: "stroke .4s" }} />
      <ellipse cx={cx} cy={cy - 7} rx={trx - 26} ry={try_ - 24} fill="url(#holoGrad)" opacity=".55" />
      <path d={`M${cx - 70} ${cy - 23} L${cx + 70} ${cy - 23} M${cx - 105} ${cy} L${cx + 105} ${cy} M${cx - 70} ${cy + 23} L${cx + 70} ${cy + 23}`} stroke="#FF3B3F" strokeOpacity=".2" />
      <circle cx={cx} cy={cy} r="27" fill="#160B0C" stroke={corAtiva} strokeOpacity=".8" />
      <circle cx={cx} cy={cy} r="20" fill="none" stroke={corAtiva} strokeOpacity=".5" strokeDasharray="3 4" className="orbita" />
      <text x={cx} y={cy - 1} textAnchor="middle" className="display" fontSize="11" fontWeight="700" fill={C.texto}>{centro}</text>
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize="8.5" fill={C.mudo}>{sub}</text>

      {!reduz && anel.map(([a, b], i) => {
        const d = curva(a, b);
        if (!d) return null;
        return (
          <g key={"anel-" + a + b}>
            <path d={d} fill="none" stroke="#FF3B3F" strokeOpacity="0.16" strokeWidth="1" strokeDasharray="2 8" />
            <circle r="2" fill="#FFFFFF" opacity="0.8" filter="url(#brilhoLinha)">
              <animateMotion dur={`${3.2 + (i % 4) * 0.6}s`} repeatCount="indefinite" path={d} begin={`${i * 0.35}s`} />
            </circle>
          </g>
        );
      })}

      {Object.entries(arestas).map(([k, cnt]) => {
        const [a, b] = k.split("|");
        const d = curva(a, b);
        return d ? <path key={k} d={d} fill="none" stroke={C.brilho} strokeOpacity={Math.min(0.12 + cnt * 0.08, 0.45)} strokeWidth="1" /> : null;
      })}

      {falando &&
        alvos.map((al) => {
          const d = curva(falando, al);
          if (!d) return null;
          return (
            <g key={"ativo-" + falando + al}>
              <path d={d} fill="none" stroke={corAtiva} strokeWidth="2" strokeDasharray="5 6" className="fluxo" filter="url(#brilhoLinha)" />
              {!reduz && (
                <circle r="3.2" fill={corAtiva} filter="url(#brilhoLinha)">
                  <animateMotion dur="1.3s" repeatCount="indefinite" path={d} />
                </circle>
              )}
            </g>
          );
        })}

      {ids.map((id) => {
        const a = AGENTS[id];
        const p = pos[id];
        const on = online.includes(id);
        const ativo = falando === id;
        const apagado = envolvidos && !envolvidos.includes(id);
        const acima = p.y < cy;
        const labelY = acima ? p.y - 42 * escala : p.y + 45 * escala;
        return (
          <g key={id} style={{ opacity: apagado ? 0.35 : on || ativo ? 1 : 0.6, transition: "opacity .3s" }}>
            {ativo && (
              <circle cx={p.x} cy={p.y - 7} r="29" fill="none" stroke={a.cor} strokeWidth="2" className="pulso" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
            )}
            <rect x={p.x - 21} y={p.y + 6} width="42" height="24" rx="9" fill="#0F0708" stroke={a.cor} strokeOpacity=".35" />
            <path d={`M${p.x - 13} ${p.y + 9} Q${p.x} ${p.y + 26} ${p.x + 13} ${p.y + 9}`} fill={a.cor} fillOpacity=".17" stroke={a.cor} strokeWidth="1.3" />
            <path d={`M${p.x - 15} ${p.y - 2} Q${p.x} ${p.y + 6} ${p.x + 15} ${p.y - 2}`} fill="none" stroke={a.cor} strokeOpacity=".8" strokeWidth="2" />
            <circle cx={p.x} cy={p.y - 10} r="12" fill="#1A0E10" stroke={a.cor} strokeWidth={ativo ? "2.4" : "1.5"} filter={ativo ? "url(#brilhoLinha)" : undefined} />
            <path d={`M${p.x - 9} ${p.y - 14} Q${p.x} ${p.y - 22} ${p.x + 9} ${p.y - 14}`} fill={a.cor} fillOpacity=".35" />
            <text x={p.x} y={p.y - 6.5} textAnchor="middle" className="display" fontSize="8" fontWeight="700" fill={a.cor}>{a.nome[0]}</text>
            <g transform={`translate(${p.x - larguraRotulo / 2}, ${labelY - 10})`}>
              <rect width={larguraRotulo} height="19" rx="9.5" fill="#0B0607" stroke={ativo ? a.cor : "#3A2124"} strokeOpacity=".8"/>
              <text x={larguraRotulo / 2} y="12.5" textAnchor="middle" fontSize={fonteRotulo} fontWeight="600" fill={ativo ? a.cor : C.texto}>{a.nome}</text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

export function AvatarChat({ id }) {
  const a = AGENTS[id];
  return (
    <div className="flex items-center justify-center rounded-full flex-shrink-0 display font-bold"
      style={{ width: 30, height: 30, background: C.painel, border: `1.5px solid ${a.cor}`, color: a.cor, fontSize: 12, boxShadow: `0 0 12px ${a.cor}33` }}
      aria-hidden="true">
      {a.nome[0]}
    </div>
  );
}

export function Selo({ texto, tipo, cor }) {
  const estilos = {
    ok: { background: "#FFFFFF14", color: "#FFFFFF", border: "1px solid #FFFFFF55" },
    alerta: { background: "#FF3B3F1F", color: "#FF9A9C", border: "1px solid #FF3B3F55" },
    nota: { background: "transparent", color: cor, border: `1px solid ${cor}66` },
  };
  return <span className="inline-block mt-2 rounded-full px-2 py-0.5 text-xs font-semibold" style={estilos[tipo]}>{texto}</span>;
}

export function EntregaCard({ rotulo, texto, svg, destaque, arquivo = "entrega" }) {
  const [aviso, setAviso] = useState("");
  const avisar = (t) => { setAviso(t); setTimeout(() => setAviso(""), 1800); };
  const temSvg = !!svg;
  const valido = temSvg && svgValido(svg);
  const botao = { color: C.brilho };

  const baixarTexto = () => {
    try {
      baixarArquivo(`${arquivo}.txt`, URL.createObjectURL(new Blob([texto || ""], { type: "text/plain;charset=utf-8" })));
      avisar("Baixado");
    } catch (e) { avisar("Use Copiar"); }
  };
  const baixarPng = async () => {
    try {
      const png = await svgParaPng(svg, larguraSvg(svg));
      baixarArquivo(`${arquivo}.png`, png);
      avisar("Baixado");
    } catch (e) { avisar("Tente o SVG"); }
  };
  const baixarSvg = () => {
    try {
      baixarArquivo(`${arquivo}.svg`, URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })));
      avisar("Baixado");
    } catch (e) { avisar("Não deu para baixar"); }
  };
  const baixarPdfTexto = async () => {
    try {
      await baixarPdf(`${arquivo}.pdf`, rotulo, texto);
      avisar("Baixado");
    } catch (e) { avisar("Não deu para gerar o PDF"); }
  };

  return (
    <div className="mt-2 rounded-2xl overflow-hidden"
      style={{ background: C.painel, border: `1px solid ${destaque ? C.brilho : C.linha}`, boxShadow: destaque ? `0 0 28px ${C.brilho}33` : "none" }}>
      <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${C.linha}` }}>
        <span className="text-xs font-semibold truncate" style={{ color: C.mudo }}>{aviso || rotulo}</span>
        <div className="flex gap-3 flex-shrink-0">
          {texto && (
            <button className="text-xs font-semibold" style={botao} onClick={async () => { await copiarTexto(texto); avisar("Copiado"); }}>
              Copiar
            </button>
          )}
          {!temSvg && texto && <button className="text-xs font-semibold" style={botao} onClick={baixarTexto}>Baixar</button>}
          {texto && <button className="text-xs font-semibold" style={botao} onClick={baixarPdfTexto}>PDF</button>}
          {valido && <button className="text-xs font-semibold" style={botao} onClick={baixarPng}>PNG</button>}
          {valido && <button className="text-xs font-semibold" style={botao} onClick={baixarSvg}>SVG</button>}
        </div>
      </div>
      {temSvg && (valido ? (
        <div className="p-3" style={{ background: "#05071A" }}>
          <img src={svgDataUri(svg)} alt="Prévia da peça criada pela equipe" className="w-full block rounded-lg" style={{ background: "#FFFFFF" }} />
        </div>
      ) : (
        <div className="px-3 py-3 text-xs" style={{ color: "#FFD37A" }}>O arquivo visual desta versão veio incompleto. A equipe refaz na próxima rodada.</div>
      ))}
      {texto && <div className="px-3 py-3 text-sm" style={{ color: C.texto, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{texto}</div>}
    </div>
  );
}

export function Mensagem({ m, entregaNome, arquivo }) {
  if (m.agent === "sistema") {
    return <div className="text-center text-xs my-5 px-6" style={{ color: C.mudo }}>{m.texto}</div>;
  }
  const a = AGENTS[m.agent];
  const voce = m.agent === "voce";
  const para = (m.alvos || []).filter((x) => x !== m.agent).map((x) => AGENTS[x].nome);
  return (
    <div className={`flex gap-2 my-4 ${voce ? "flex-row-reverse" : ""}`}>
      <AvatarChat id={m.agent} />
      <div className="min-w-0" style={{ maxWidth: "86%" }}>
        <div className={`flex items-baseline gap-x-2 mb-1 flex-wrap ${voce ? "justify-end" : ""}`}>
          <span className="text-sm font-semibold" style={{ color: a.cor }}>{a.nome}</span>
          <span className="text-xs" style={{ color: C.mudo }}>{para.length ? `para ${juntar(para)}` : a.papel}</span>
        </div>
        {(m.texto || m.selo) && (
          <div className="px-3 py-2 text-sm"
            style={{
              background: voce ? "#FFFFFF" : a.cor + "1C", color: voce ? C.bg : C.texto,
              border: voce ? "none" : `1px solid ${a.cor}44`,
              borderRadius: 16, borderTopLeftRadius: voce ? 16 : 4, borderTopRightRadius: voce ? 4 : 16,
              whiteSpace: "pre-wrap", lineHeight: 1.55,
            }}>
            {m.texto}
            {m.selo && <div><Selo texto={m.selo} tipo={m.seloTipo} cor={a.cor} /></div>}
          </div>
        )}
        {(m.entrega || m.svg) && (
          <EntregaCard rotulo={`${entregaNome}, versão ${m.versao}`} texto={m.entrega} svg={m.svg} arquivo={`${arquivo}-v${m.versao}`} />
        )}
      </div>
    </div>
  );
}

export function Digitando({ id, alvos }) {
  const a = AGENTS[id];
  const para = alvos.map((x) => AGENTS[x].nome);
  return (
    <div className="flex gap-2 my-4 items-end">
      <AvatarChat id={id} />
      <div>
        <div className="text-xs mb-1" style={{ color: C.mudo }}>{a.nome} {a.acao}{para.length ? `, conectado a ${juntar(para)}` : ""}</div>
        <div className="px-4 py-3 flex gap-1" style={{ background: a.cor + "1C", border: `1px solid ${a.cor}44`, borderRadius: 16, borderTopLeftRadius: 4 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="dot rounded-full" style={{ width: 7, height: 7, background: a.cor, animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export const inputStyle = { background: C.painel2, border: `1px solid ${C.linha}`, color: C.texto };
export const painelStyle = { background: C.painel + "E6", border: `1px solid ${C.linha}` };
export const botaoSec = { background: C.painel2, border: `1px solid ${C.linha}`, color: C.texto };
