import { useState, useRef, useEffect } from "react";
import { LIMITE_MATERIAIS, MAX_RODADAS, C, AGENTS, PERFIS_BASE, SALAS, CAMPOS_CLIENTE, SKILLS_SEED, briefInicial, juntar, slug } from "./agencyData.js";
import { lsGet, lsSet, callClaude, centralRequest, saveCentralDocument, extrairEntrega, normalizarSvg, limparSvg, svgValido, svgParaPng } from "./helpers.js";
import { CampoComVoz, Mesa, EntregaCard, Mensagem, Digitando, inputStyle, painelStyle, botaoSec } from "./uiParts.jsx";
import Sidebar from "./Sidebar.jsx";
import Painel from "./Painel.jsx";
import Cerebro from "./Cerebro.jsx";

export default function SalaDeAgentes() {
  const [salaId, setSalaId] = useState("estrategia");
  const sala = SALAS[salaId];
  const [fase, setFase] = useState("briefing");
  const [briefs, setBriefs] = useState(() => {
    const b = {};
    Object.values(SALAS).forEach((s) => { b[s.id] = briefInicial(s); });
    return b;
  });
  const brief = briefs[salaId];
  const setCampo = (k, v) => setBriefs((b) => ({ ...b, [salaId]: { ...b[salaId], [k]: v } }));

  const [cfg, setCfg] = useState(() => lsGet("sala-config", { agencia: "Towards", tom: "" }));
  const [perfis, setPerfis] = useState(() => lsGet("perfis-agentes", PERFIS_BASE));
  const [skills, setSkills] = useState(() => lsGet("skills-cerebro", SKILLS_SEED));
  const [agenteEditando, setAgenteEditando] = useState(null);
  const [cfgSalva, setCfgSalva] = useState(false);
  const [salvas, setSalvas] = useState(() => lsGet("entregas-aprovadas", []));
  const [clientes, setClientes] = useState(() => lsGet("clientes", []));
  const [clienteSel, setClienteSel] = useState("");
  const [editando, setEditando] = useState(null);
  const [novoAprendizado, setNovoAprendizado] = useState("");
  const [arquivoStatus, setArquivoStatus] = useState("");
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [senha, setSenha] = useState("");
  const [autenticado, setAutenticado] = useState(true);
  const [carregandoCentral, setCarregandoCentral] = useState(true);
  const [erroCentral, setErroCentral] = useState("");

  const [view, setView] = useState("painel");
  const [sidebarAberta, setSidebarAberta] = useState(() => lsGet("sala-sidebar", true));
  const [filtroEntregas, setFiltroEntregas] = useState("todas");

  const [msgs, setMsgs] = useState([]);
  const [falando, setFalando] = useState(null);
  const [alvos, setAlvos] = useState([]);
  const [arestas, setArestas] = useState({});
  const [online, setOnline] = useState([]);
  const [etapa, setEtapa] = useState(0);
  const [mesaAberta, setMesaAberta] = useState(true);
  const [ajusteAberto, setAjusteAberto] = useState(false);
  const [ajuste, setAjuste] = useState("");
  const [ultimaAprovada, setUltimaAprovada] = useState(null);

  const msgsRef = useRef([]);
  const entregaRef = useRef("");
  const svgRef = useRef(null);
  const versaoRef = useRef(0);
  const stopRef = useRef(false);
  const fimRef = useRef(null);

  const clienteAtual = sala.interna ? null : clientes.find((c) => c.id === clienteSel) || null;
  const briefEfetivo = sala.interna ? brief : { ...brief, cliente: clienteAtual ? clienteAtual.nome : brief.cliente };

  useEffect(() => { lsSet("sala-sidebar", sidebarAberta); }, [sidebarAberta]);

  useEffect(() => {
    if (!clienteAtual) return;
    setBriefs((prev) => {
      const nx = { ...prev };
      Object.values(SALAS).forEach((s) => {
        const b = { ...nx[s.id] };
        let mudou = false;
        s.campos.forEach((c) => {
          if (!b[c.key] && clienteAtual[c.key]) { b[c.key] = clienteAtual[c.key]; mudou = true; }
        });
        if (s.id === "trafego" && !b.orcamento && clienteAtual.recursos) {
          b.orcamento = clienteAtual.recursos;
          mudou = true;
        }
        if (mudou) nx[s.id] = b;
      });
      return nx;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteSel]);

  const carregarCentral = async () => {
    setCarregandoCentral(true);
    setErroCentral("");
    try {
      const data = await centralRequest("/api/data");
      setClientes(data.clients || []);
      setSalvas(data.deliveries || []);
      if (data.agency?.config) setCfg(data.agency.config);
      if (data.agency?.agentProfiles) setPerfis({ ...PERFIS_BASE, ...data.agency.agentProfiles });
      if (data.agency?.skills) setSkills(data.agency.skills);
      setAutenticado(true);
    } catch (error) {
      if (error.status === 401) setAutenticado(false);
      else setErroCentral(error.message);
    } finally {
      setCarregandoCentral(false);
    }
  };

  useEffect(() => { carregarCentral(); }, []);

  useEffect(() => {
    if (view === "sala" && fase !== "briefing") fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, falando, fase, view]);

  const persistirClientes = (lista) => lsSet("clientes", lista);
  const salvarAgenciaCentral = async (config = cfg, agentProfiles = perfis, skillsAtuais = skills) => {
    lsSet("sala-config", config);
    lsSet("perfis-agentes", agentProfiles);
    lsSet("skills-cerebro", skillsAtuais);
    try { await saveCentralDocument("agency", "agency", { config, agentProfiles, skills: skillsAtuais }); }
    catch (error) { setErroCentral(error.message); }
  };

  const addMsg = (m) => {
    msgsRef.current = [...msgsRef.current, { ...m, id: Date.now() + Math.random() }];
    setMsgs(msgsRef.current);
  };

  const conectar = (id, lista) => {
    setArestas((prev) => {
      const nx = { ...prev };
      lista.forEach((b) => {
        if (b === id) return;
        const k = [id, b].sort().join("|");
        nx[k] = (nx[k] || 0) + 1;
      });
      return nx;
    });
    setOnline((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const baseCliente = () => {
    const c = clienteAtual;
    if (!c) return "";
    const linhas = CAMPOS_CLIENTE.filter((f) => (c[f.key] || "").trim()).map((f) => `${f.label}: ${c[f.key].trim()}`);
    let t = `BASE DE CONHECIMENTO DO CLIENTE\n${linhas.join("\n")}`;
    if (c.aprendizados && c.aprendizados.length) {
      t += `\n\nAprendizados registrados pelo diretor (siga sempre):\n${c.aprendizados.map((a) => `- ${a}`).join("\n")}`;
    }
    const anteriores = salvas.filter((s) => s.clienteId === c.id && s.tipo === sala.id).slice(0, 2);
    if (anteriores.length) {
      t += `\n\nEntregas aprovadas antes para este cliente nesta área (referência de estilo, não copie):\n${anteriores.map((s) => `[${s.data}] ${(s.texto || "").slice(0, 700)}`).join("\n\n")}`;
    }
    return t;
  };

  const referencia = () => {
    const r = salvas.find((s) => String(s.id) === String(brief.refId));
    return r ? `MATERIAL DE REFERÊNCIA APROVADO (${SALAS[r.tipo] ? SALAS[r.tipo].aba : "Entrega"}, ${r.rotulo}), use como base desta entrega:\n${r.texto}` : "";
  };

  const contexto = () => {
    const linhas = sala.campos.map((c) => `${c.label}: ${briefEfetivo[c.key] || "não informado"}`);
    linhas.push(`${sala.chips.label}: ${brief[sala.chips.key]}`);
    linhas.push(`${sala.detalhes.label}: ${brief.detalhes || "nenhum"}`);
    return [
      `Agência: ${cfg.agencia || "nossa agência"}\nTom de voz da agência: ${cfg.tom || "não definido"}`,
      `MANUAL DA EQUIPE (diretrizes definidas pela agência)\n${sala.mesa.filter((id) => id !== "voce").map((id) => {
        const p = perfis[id] || PERFIS_BASE[id];
        return `${AGENTS[id].nome}: Método: ${p.metodo}\nCritérios: ${p.criterios}\nEvitar: ${p.evitar}`;
      }).join("\n\n")}`,
      (() => {
        const ativas = skills.filter((sk) => sk.salas.includes(sala.id));
        return ativas.length
          ? `CÉREBRO DA EQUIPE (padrões e frameworks ativos nesta sala)\n${ativas.map((sk) => `${sk.nome}: ${sk.conteudo}`).join("\n\n")}`
          : "";
      })(),
      baseCliente(),
      referencia(),
      `BRIEFING\n${linhas.join("\n")}`,
    ].filter(Boolean).join("\n\n");
  };

  const entrarNaCentral = async () => {
    if (!senha.trim()) return;
    setCarregandoCentral(true);
    setErroCentral("");
    try {
      await centralRequest("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: senha }) });
      setSenha("");
      await carregarCentral();
    } catch (error) {
      setErroCentral(error.message);
      setCarregandoCentral(false);
    }
  };

  const transcript = () =>
    msgsRef.current
      .filter((m) => m.agent !== "sistema")
      .map((m) => {
        const a = AGENTS[m.agent];
        const extra = m.versao ? ` [entregou a versão ${m.versao}]` : "";
        const quebrado = m.svg !== undefined && m.svg !== null && !svgValido(m.svg) ? " [o arquivo visual veio incompleto]" : "";
        const selo = m.selo ? ` [${m.selo}]` : "";
        return `${a.nome} (${a.papel}): ${m.texto || ""}${extra}${quebrado}${selo}`;
      })
      .join("\n\n");

  const alvosDe = (id, modo) => {
    const ms = msgsRef.current.filter((m) => m.agent !== "sistema");
    if (id === sala.lider) {
      if (modo === "criar") return ["voce"];
      const idx = ms.map((m) => m.agent).lastIndexOf(sala.lider);
      const depois = [...new Set(ms.slice(idx + 1).map((m) => m.agent).filter((a) => a !== sala.lider))];
      return depois.length ? depois : ["voce"];
    }
    if (sala.rede.includes(id)) {
      const ult = ms.length ? ms[ms.length - 1].agent : null;
      return [...new Set([sala.lider, ult].filter((a) => a && a !== id))];
    }
    if (id === sala.revisor) return [sala.lider];
    if (id === sala.gerente) return [sala.lider, sala.revisor];
    return [];
  };

  const checkStop = () => {
    if (stopRef.current) throw new Error("parado");
  };

  const falar = async (id, system, lista, opcoes = {}) => {
    checkStop();
    setFalando(id);
    setAlvos(lista);
    let atual = entregaRef.current || "(ainda não existe)";
    if (sala.visual && svgRef.current) {
      atual += `\n\nCódigo SVG da versão atual:\n${svgRef.current}`;
      if (!svgValido(svgRef.current)) atual += "\n(atenção: este SVG está incompleto ou inválido e precisa ser refeito)";
    }
    const texto = `${contexto()}

CONVERSA ATÉ AGORA:
${transcript() || "(ninguém falou ainda)"}

VERSÃO ATUAL ${sala.entregaRotulo}:
${atual}

Agora é a sua vez de falar.`;
    let image;
    if (sala.visual && svgRef.current && svgValido(svgRef.current)) {
      try {
        const dataUrl = await svgParaPng(svgRef.current, 900);
        image = dataUrl.split(",")[1];
      } catch (e) {}
    }
    try {
      const t = await callClaude(system, texto, image, opcoes.tier);
      checkStop();
      conectar(id, lista);
      return t;
    } finally {
      setFalando(null);
      setAlvos([]);
    }
  };

  const turnoLider = async (modo) => {
    const lista = alvosDe(sala.lider, modo);
    const base = modo === "criar" ? sala.prompts.criar : sala.prompts.revisar;
    const system = typeof base === "function" ? base(briefEfetivo) : base;
    let raw = await falar(sala.lider, system, lista, { tier: "complex" });
    let { intro, entrega, svg } = extrairEntrega(raw);
    if (sala.visual) {
      const [w, h] = sala.dims(briefEfetivo);
      if (svg) svg = limparSvg(normalizarSvg(svg, w, h));
      if (!svgValido(svg)) {
        raw = await falar(sala.lider, `${system}\n\nATENÇÃO: sua resposta anterior passou do limite e o SVG ficou incompleto. Refaça com um SVG ainda mais enxuto, com até 1.600 caracteres.`, lista, { tier: "complex" });
        ({ intro, entrega, svg } = extrairEntrega(raw));
        if (svg) svg = limparSvg(normalizarSvg(svg, w, h));
      }
      svgRef.current = svg;
    }
    versaoRef.current += 1;
    entregaRef.current = entrega;
    addMsg({ agent: sala.lider, texto: intro, entrega, svg: sala.visual ? svg : null, versao: versaoRef.current, alvos: lista });
  };

  const turnoRede = async (id) => {
    const lista = alvosDe(id);
    const raw = await falar(id, sala.prompts[id], lista);
    addMsg({ agent: id, texto: raw.trim(), alvos: lista });
  };

  const turnoRevisor = async () => {
    const lista = alvosDe(sala.revisor);
    const raw = await falar(sala.revisor, sala.prompts.revisor, lista);
    const ok = !/VEREDITO:\s*AJUSTAR/i.test(raw);
    const texto = raw.replace(/^.*VEREDITO:.*$/im, "").trim();
    addMsg({ agent: sala.revisor, texto, selo: ok ? "Aprovou" : "Pediu ajuste", seloTipo: ok ? "ok" : "alerta", alvos: lista });
    return ok;
  };

  const turnoGerente = async () => {
    const lista = alvosDe(sala.gerente);
    const raw = await falar(sala.gerente, sala.prompts.gerente, lista);
    const ok = !/DECIS[ÃA]O:\s*DEVOLVER/i.test(raw);
    const texto = raw.replace(/^.*DECIS[ÃA]O:.*$/im, "").trim();
    addMsg({
      agent: sala.gerente, texto, alvos: lista,
      selo: ok ? "Aprovado" : `Devolveu para ${AGENTS[sala.lider].nome}`, seloTipo: ok ? "ok" : "alerta",
    });
    return ok;
  };

  const cicloAprovacao = async () => {
    const etapaRevisor = sala.rede.length ? 2 : 1;
    const etapaGerente = sala.rede.length ? 3 : 2;
    const etapaFinal = sala.rede.length ? 4 : 3;
    let rodadas = 0;
    while (true) {
      setEtapa(etapaRevisor);
      const okRev = await turnoRevisor();
      if (!okRev && rodadas < MAX_RODADAS) { rodadas++; setEtapa(0); await turnoLider("revisar"); continue; }
      setEtapa(etapaGerente);
      const okGer = await turnoGerente();
      if (!okGer && rodadas < MAX_RODADAS) { rodadas++; setEtapa(0); await turnoLider("revisar"); continue; }
      if (!okGer || !okRev) addMsg({ agent: "sistema", texto: `Limite de ${MAX_RODADAS} rodadas de correção atingido. A decisão final fica com você.` });
      break;
    }
    setEtapa(etapaFinal);
    setFase("aprovacao");
  };

  const tratarErro = (e) => {
    setFalando(null);
    setAlvos([]);
    addMsg({ agent: "sistema", texto: e.message === "parado" ? "Reunião encerrada por você." : `A reunião parou porque ${e.message}. Volte ao briefing e comece de novo.` });
    setFase("parado");
  };

  const iniciar = async () => {
    msgsRef.current = [];
    setMsgs([]);
    setArestas({});
    setOnline(["voce"]);
    entregaRef.current = "";
    svgRef.current = null;
    versaoRef.current = 0;
    stopRef.current = false;
    setAjusteAberto(false);
    setAjuste("");
    setUltimaAprovada(null);
    setMesaAberta(true);
    setFase("rodando");
    const extras = [clienteAtual ? `com a base de ${clienteAtual.nome}` : "", brief.refId ? "usando uma entrega aprovada como base" : ""].filter(Boolean);
    const abertura = sala.interna
      ? `Reunião aberta: ${brief[sala.chips.key]}`
      : `Reunião aberta: ${brief[sala.chips.key]} para ${briefEfetivo.cliente}${extras.length ? `, ${juntar(extras)}` : ""}`;
    addMsg({ agent: "sistema", texto: abertura });
    try {
      setEtapa(0);
      await turnoLider("criar");
      if (sala.rede.length) {
        setEtapa(1);
        for (const id of sala.rede) await turnoRede(id);
        setEtapa(0);
        await turnoLider("revisar");
      }
      await cicloAprovacao();
    } catch (e) {
      tratarErro(e);
    }
  };

  const enviarAjuste = async () => {
    const pedido = ajuste.trim();
    if (!pedido) return;
    addMsg({ agent: "voce", texto: pedido, alvos: [sala.lider] });
    conectar("voce", [sala.lider]);
    if (clienteAtual) {
      const idCli = clienteAtual.id;
      setClientes((prev) => {
        const nx = prev.map((c) => (c.id === idCli ? { ...c, aprendizados: [...(c.aprendizados || []), `${sala.aba}: ${pedido}`].slice(-20) } : c));
        persistirClientes(nx);
        const atualizado = nx.find((c) => c.id === idCli);
        if (atualizado) saveCentralDocument(idCli, "client", atualizado).catch((error) => setErroCentral(error.message));
        return nx;
      });
      addMsg({ agent: "sistema", texto: `Aprendizado salvo no perfil de ${clienteAtual.nome}. As próximas reuniões já seguem esse pedido.` });
    }
    setAjuste("");
    setAjusteAberto(false);
    stopRef.current = false;
    setFase("rodando");
    try {
      setEtapa(0);
      await turnoLider("revisar");
      await cicloAprovacao();
    } catch (e) {
      tratarErro(e);
    }
  };

  const aprovar = () => {
    const item = {
      id: Date.now(), tipo: sala.id, data: new Date().toLocaleDateString("pt-BR"),
      cliente: sala.interna ? (cfg.agencia || "Towards") : briefEfetivo.cliente,
      clienteId: sala.interna ? null : (clienteSel || null),
      rotulo: brief[sala.chips.key],
      texto: entregaRef.current, svg: sala.visual ? svgRef.current : null,
    };
    const novas = [item, ...salvas].slice(0, 80);
    setSalvas(novas);
    setUltimaAprovada(item.id);
    lsSet("entregas-aprovadas", novas);
    saveCentralDocument(item.id, "delivery", item).catch((error) => setErroCentral(error.message));
    addMsg({ agent: "voce", texto: "Aprovado.", alvos: [sala.gerente] });
    addMsg({ agent: "sistema", texto: "Entrega aprovada e salva em Entregas aprovadas." });
    setFase("finalizado");
  };

  const levarPara = (destino) => {
    if (!ultimaAprovada) return;
    setBriefs((b) => ({ ...b, [destino]: { ...b[destino], refId: String(ultimaAprovada) } }));
    setSalaId(destino);
    setFase("briefing");
    window.scrollTo(0, 0);
  };

  const salvarCfg = () => {
    salvarAgenciaCentral();
    setCfgSalva(true);
    setTimeout(() => setCfgSalva(false), 1500);
  };

  const excluirSalva = (id) => {
    const novas = salvas.filter((s) => s.id !== id);
    setSalvas(novas);
    lsSet("entregas-aprovadas", novas);
    saveCentralDocument(id, "delivery", {}, "delete").catch((error) => setErroCentral(error.message));
  };

  const salvarCliente = () => {
    if (!editando || !(editando.nome || "").trim()) return;
    const existe = clientes.some((c) => c.id === editando.id);
    const nx = existe ? clientes.map((c) => (c.id === editando.id ? editando : c)) : [...clientes, editando];
    setClientes(nx);
    persistirClientes(nx);
    saveCentralDocument(editando.id, "client", editando).catch((error) => setErroCentral(error.message));
    setClienteSel(editando.id);
    setEditando(null);
    setView("clientes");
  };

  const excluirCliente = () => {
    if (!editando) return;
    const nx = clientes.filter((c) => c.id !== editando.id);
    setClientes(nx);
    persistirClientes(nx);
    saveCentralDocument(editando.id, "client", {}, "delete").catch((error) => setErroCentral(error.message));
    if (clienteSel === editando.id) setClienteSel("");
    setEditando(null);
  };

  const transcreverAudio = async (f) => {
    if (f.size > 8 * 1024 * 1024) {
      setArquivoStatus("Esse áudio passa de 8 MB. Envie um arquivo menor.");
      return;
    }
    setTranscrevendo(true);
    setArquivoStatus(`Transcrevendo ${f.name}…`);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
      const result = await centralRequest("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64, filename: f.name, mimeType: f.type || "audio/webm" }),
      });
      setEditando((d) => ({ ...d, materiais: `${d.materiais || ""}\n\n[Transcrição: ${f.name}]\n${result.text}`.trim().slice(0, LIMITE_MATERIAIS) }));
      setArquivoStatus(`Transcrição de ${f.name} adicionada à base do cliente.`);
    } catch (error) {
      setArquivoStatus(error.message || "Não foi possível transcrever este áudio.");
    } finally {
      setTranscrevendo(false);
    }
  };

  const anexarArquivo = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.type.startsWith("audio/") || /\.(mp3|m4a|wav|webm|ogg|mp4)$/i.test(f.name)) {
      await transcreverAudio(f);
      e.target.value = "";
      return;
    }
    try {
      const t = await f.text();
      setEditando((d) => ({ ...d, materiais: `${d.materiais || ""}\n\n[${f.name}]\n${t}`.trim().slice(0, LIMITE_MATERIAIS) }));
      setArquivoStatus(`${f.name} foi adicionado à base do cliente.`);
    } catch (err) { setArquivoStatus("Não foi possível ler este arquivo. Use texto, CSV, JSON ou um áudio compatível."); }
    e.target.value = "";
  };

  const navegar = (v, sid) => {
    if (v === "sala" && sid) {
      if (sid !== salaId) { setSalaId(sid); setFase("briefing"); }
    }
    setView(v);
    window.scrollTo(0, 0);
  };

  const onNovoCliente = () => {
    setEditando({ id: "c" + Date.now(), aprendizados: [] });
  };

  const podeIniciar = sala.campos.filter((c) => c.obrig).every((c) => (briefEfetivo[c.key] || "").trim());
  const nConexoes = Object.keys(arestas).length;
  const arquivoBase = sala.interna ? `${slug(brief.tema || sala.id)}-${sala.id}` : `${slug(briefEfetivo.cliente)}-${sala.id}`;
  const opcoesRef = sala.interna ? [] : salvas.filter((s) => !clienteSel || s.clienteId === clienteSel);

  const fundo = {
    background: C.bg,
    backgroundImage:
      "radial-gradient(ellipse at 50% -10%, rgba(255,59,63,0.16), transparent 55%), linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
    backgroundSize: "100% 100%, 32px 32px, 32px 32px",
    color: C.texto,
  };

  if (carregandoCentral) {
    return <div className="sala min-h-screen flex items-center justify-center px-6 text-center" style={fundo}>
      <div><div className="display text-lg font-bold">Sala de Agentes</div><p className="mt-3 text-sm" style={{ color: C.mudo }}>Abrindo a central da agência…</p></div>
    </div>;
  }

  if (!autenticado) {
    return (
      <div className="sala min-h-screen flex items-center justify-center px-5" style={fundo}>
        <div className="w-full max-w-sm rounded-3xl p-6" style={painelStyle}>
          <div className="display text-xl font-bold">Central da agência</div>
          <p className="mt-3 text-sm" style={{ color: C.mudo, lineHeight: 1.6 }}>A base de clientes, os aprendizados e os manuais da equipe ficam protegidos aqui.</p>
          <label className="block mt-5">
            <span className="block text-sm font-semibold mb-2">Senha da agência</span>
            <input type="password" className="w-full rounded-xl px-3 py-3 text-sm" style={inputStyle} value={senha}
              onChange={(e) => setSenha(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrarNaCentral()} placeholder="Digite a senha" />
          </label>
          {erroCentral && <p className="mt-3 text-sm" style={{ color: "#FF9AAC" }}>{erroCentral}</p>}
          <button onClick={entrarNaCentral} className="w-full mt-5 rounded-2xl py-3 text-sm font-bold" style={{ background: C.brilho, color: "#fff" }}>Entrar na central</button>
          <p className="mt-4 text-xs" style={{ color: C.mudo, lineHeight: 1.5 }}>Se for a primeira configuração, conecte o banco e defina APP_SENHA no projeto Vercel.</p>
        </div>
      </div>
    );
  }

  if (editando) {
    const novo = !clientes.some((c) => c.id === editando.id);
    return (
      <div className="sala min-h-screen" style={fundo}>
        <div className="max-w-xl mx-auto px-5 pt-6 pb-12">
          <button onClick={() => setEditando(null)} className="text-sm font-semibold mb-4" style={{ color: C.mudo }}>Voltar</button>
          <div className="rounded-3xl p-5 mb-4 overflow-hidden" style={{ background: "linear-gradient(135deg, #2A1013, #0A0506)", border: "1px solid #6B2226", boxShadow: "0 20px 45px rgba(0,0,0,.24)" }}>
            <div className="text-xs font-semibold tracking-widest" style={{ color: "#FF9A9C" }}>{novo ? "NOVO DOSSIÊ" : "DOSSIÊ DO CLIENTE"}</div>
            <h1 className="display font-bold mt-2" style={{ fontSize: 26, lineHeight: 1.1 }}>{novo ? "Vamos conhecer o cliente" : editando.nome || "Cliente"}</h1>
            <div className="flex gap-2 mt-4 text-xs" style={{ color: "#F0D8D9" }}><span className="rounded-full px-2 py-1" style={{ background: "#FFFFFF16" }}>1. Essencial</span><span className="rounded-full px-2 py-1" style={{ background: "#FFFFFF0D" }}>2. Contexto</span><span className="rounded-full px-2 py-1" style={{ background: "#FFFFFF0D" }}>3. Materiais</span></div>
          </div>
          <p className="mt-2 mb-6 text-sm" style={{ color: C.mudo, lineHeight: 1.6 }}>
            Comece pelo essencial. Você pode digitar, usar o microfone ou enviar um áudio para transcrever.
          </p>
          <div className="rounded-3xl p-5" style={painelStyle}>
            <div className="flex items-center gap-2 mb-4"><span className="flex items-center justify-center rounded-full text-xs font-bold" style={{ width: 24, height: 24, background: C.brilho, color: "#fff" }}>1</span><h2 className="display font-bold text-sm">Quem é este cliente?</h2></div>
            {CAMPOS_CLIENTE.filter((f) => ["nome", "segmento"].includes(f.key)).map((f) => (
              <label key={f.key} className="block mb-4">
                <span className="block text-sm font-semibold mb-1">{f.label}</span>
                <CampoComVoz
                  linhas={f.linhas}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                  style={inputStyle}
                  value={editando[f.key] || ""}
                  onChange={(v) => setEditando({ ...editando, [f.key]: f.key === "materiais" ? v.slice(0, LIMITE_MATERIAIS) : v })}
                  placeholder={f.ph}
                />
              </label>
            ))}
          </div>

          <div className="rounded-3xl p-5 mt-4" style={painelStyle}>
            <div className="flex items-center gap-2 mb-4"><span className="flex items-center justify-center rounded-full text-xs font-bold" style={{ width: 24, height: 24, background: C.painel2, color: C.texto, border: `1px solid ${C.linha}` }}>2</span><h2 className="display font-bold text-sm">O que a equipe precisa saber?</h2></div>
            {CAMPOS_CLIENTE.filter((f) => !["nome", "segmento", "materiais"].includes(f.key)).map((f) => (
              <label key={f.key} className="block mb-4">
                <span className="block text-sm font-semibold mb-1">{f.label}</span>
                <CampoComVoz linhas={f.linhas} className="w-full rounded-xl px-3 py-2 text-sm" style={inputStyle} value={editando[f.key] || ""}
                  onChange={(v) => setEditando({ ...editando, [f.key]: v })} placeholder={f.ph} />
              </label>
            ))}
          </div>

          <div className="rounded-3xl p-5 mt-4" style={painelStyle}>
            <div className="flex items-center gap-2 mb-2"><span className="flex items-center justify-center rounded-full text-xs font-bold" style={{ width: 24, height: 24, background: C.painel2, color: C.texto, border: `1px solid ${C.linha}` }}>3</span><h2 className="display font-bold text-sm">Materiais e áudio</h2></div>
            <p className="text-xs mb-4" style={{ color: C.mudo, lineHeight: 1.5 }}>Envie briefing, site, CSV, anotações ou áudio. O áudio vira texto e entra na memória deste cliente.</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <label className="rounded-2xl px-3 py-4 text-center cursor-pointer" style={{ background: C.painel2, border: `1px solid ${C.linha}` }}>
                <span className="block text-lg">📄</span><span className="block text-xs font-semibold mt-1">Enviar material</span><span className="block text-[10px] mt-1" style={{ color: C.mudo }}>TXT, MD, CSV ou JSON</span>
                <input type="file" accept=".txt,.md,.csv,.json" className="hidden" onChange={anexarArquivo} />
              </label>
              <label className="rounded-2xl px-3 py-4 text-center cursor-pointer" style={{ background: "#FF3B3F18", border: "1px solid #FF3B3F77" }}>
                <span className="block text-lg">🎙️</span><span className="block text-xs font-semibold mt-1">Transcrever áudio</span><span className="block text-[10px] mt-1" style={{ color: C.mudo }}>MP3, M4A, WAV, WEBM</span>
                <input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/webm,audio/ogg,.mp3,.m4a,.wav,.webm,.ogg" className="hidden" onChange={anexarArquivo} disabled={transcrevendo} />
              </label>
            </div>
            {arquivoStatus && <div className="rounded-xl px-3 py-2 text-xs mb-3" style={{ background: transcrevendo ? "#FF3B3F18" : "#0A0607", color: transcrevendo ? "#FFB3B5" : C.mudo }}>{arquivoStatus}</div>}
            <label className="block"><span className="block text-sm font-semibold mb-1">Notas e transcrições</span><CampoComVoz linhas={6} className="w-full rounded-xl px-3 py-2 text-sm" style={inputStyle} value={editando.materiais || ""} onChange={(v) => setEditando({ ...editando, materiais: v.slice(0, LIMITE_MATERIAIS) })} placeholder="Cole ou registre informações que a equipe precisa reter." /></label>
            <span className="block text-xs mt-2" style={{ color: C.mudo }}>{(editando.materiais || "").length.toLocaleString("pt-BR")} de {LIMITE_MATERIAIS.toLocaleString("pt-BR")} caracteres</span>
          </div>

          <div className="rounded-3xl p-5 mt-4" style={painelStyle}>
            <h2 className="display font-bold text-base">Aprendizados</h2>
            <p className="text-xs mt-1 mb-3" style={{ color: C.mudo, lineHeight: 1.5 }}>
              Cada ajuste que você pede numa reunião entra aqui automaticamente. A equipe segue estes pontos em todas as salas.
            </p>
            {(editando.aprendizados || []).length === 0 && <p className="text-sm mb-3" style={{ color: C.mudo }}>Nenhum aprendizado ainda.</p>}
            {(editando.aprendizados || []).map((a, i) => (
              <div key={i} className="flex justify-between items-start gap-3 py-2" style={{ borderBottom: `1px solid ${C.linha}` }}>
                <span className="text-sm" style={{ lineHeight: 1.5 }}>{a}</span>
                <button className="text-xs flex-shrink-0" style={{ color: C.mudo }}
                  onClick={() => setEditando({ ...editando, aprendizados: editando.aprendizados.filter((_, j) => j !== i) })}>
                  Remover
                </button>
              </div>
            ))}
            <div className="flex gap-2 mt-3">
              <CampoComVoz
                wrapperClassName="flex-1 min-w-0"
                className="w-full rounded-xl px-3 py-2 text-sm"
                style={inputStyle}
                value={novoAprendizado}
                onChange={setNovoAprendizado}
                placeholder="Ex.: nunca usar a palavra barato"
              />
              <button className="rounded-xl px-3 py-2 text-sm font-semibold" style={botaoSec}
                onClick={() => {
                  if (!novoAprendizado.trim()) return;
                  setEditando({ ...editando, aprendizados: [...(editando.aprendizados || []), novoAprendizado.trim()] });
                  setNovoAprendizado("");
                }}>
                Adicionar
              </button>
            </div>
          </div>

          <button onClick={salvarCliente} disabled={!(editando.nome || "").trim()} className="w-full mt-5 rounded-2xl py-3 text-base font-bold"
            style={(editando.nome || "").trim() ? { background: C.brilho, color: "#fff", boxShadow: `0 0 28px ${C.brilho}55` } : { background: "#231416", color: C.mudo }}>
            Salvar cliente
          </button>
          {!novo && (
            <button onClick={excluirCliente} className="w-full mt-3 rounded-2xl py-3 text-sm font-semibold" style={{ color: "#FF9AAC" }}>
              Excluir cliente
            </button>
          )}
        </div>
      </div>
    );
  }

  const conteudoSalaBriefing = () => (
    <div className="max-w-xl mx-auto px-5 pt-8 pb-14">
      {erroCentral && <div className="mb-4 rounded-2xl px-4 py-3 text-sm" style={{ background: "#FF3B3F1A", border: "1px solid #FF3B3F55", color: "#FFB0BF" }}>{erroCentral}</div>}
      <div className="text-xs font-bold tracking-widest" style={{ color: "#FF3B3F" }}>SALA</div>
      <h1 className="display font-bold" style={{ fontSize: 28, lineHeight: 1.08, letterSpacing: "-0.01em" }}>{sala.titulo}</h1>
      <p className="mt-3 text-sm" style={{ color: C.mudo, lineHeight: 1.6 }}>{sala.subtitulo}</p>

      {!sala.interna && (
        <div className="rounded-3xl p-5 mb-4 mt-6" style={painelStyle}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="display font-bold text-base">Cliente</h2>
            <button onClick={onNovoCliente} className="rounded-full px-3 py-1.5 text-xs font-semibold" style={botaoSec}>
              Novo cliente
            </button>
          </div>
          {clientes.length === 0 ? (
            <p className="text-sm" style={{ color: C.mudo, lineHeight: 1.6 }}>
              Cadastre um cliente para a equipe trabalhar com as informações reais da empresa: produtos, público, marca, concorrentes e materiais.
            </p>
          ) : (
            <>
              <div className="flex gap-2">
                <select className="flex-1 min-w-0 rounded-xl px-3 py-2 text-sm" style={inputStyle} value={clienteSel} onChange={(e) => setClienteSel(e.target.value)}>
                  <option value="">Sem cliente cadastrado</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                {clienteAtual && (
                  <button onClick={() => setEditando({ ...clienteAtual })} className="rounded-xl px-3 py-2 text-xs font-semibold flex-shrink-0" style={botaoSec}>
                    Editar
                  </button>
                )}
              </div>
              {clienteAtual && (
                <>
                  <p className="text-xs mt-2" style={{ color: C.mudo }}>
                    A equipe vai ler {CAMPOS_CLIENTE.filter((f) => (clienteAtual[f.key] || "").trim()).length} campos da base e {(clienteAtual.aprendizados || []).length} aprendizados de {clienteAtual.nome}. Objetivo, prazo/verba e público já vêm preenchidos em todas as salas.
                  </p>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {Object.values(SALAS).filter((s) => !s.interna).map((s) => (
                      <button key={s.id} onClick={() => { setSalaId(s.id); setFase("briefing"); }} className="rounded-xl py-2 text-xs font-semibold"
                        style={salaId === s.id ? { background: C.brilho, color: "#fff" } : botaoSec}>
                        {s.aba}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      <div className="rounded-3xl p-5" style={painelStyle}>
        <h2 className="display font-bold text-base mb-4">Briefing</h2>
        {sala.campos.filter((c) => !(c.key === "cliente" && clienteAtual)).map((c) => (
          <label key={c.key} className="block mb-4">
            <span className="block text-sm font-semibold mb-1">{c.label}</span>
            <CampoComVoz
              linhas={c.linhas}
              className="w-full rounded-xl px-3 py-2 text-sm"
              style={inputStyle}
              value={brief[c.key]}
              onChange={(v) => setCampo(c.key, v)}
              placeholder={c.ph}
            />
          </label>
        ))}
        <div className="mb-4">
          <span className="block text-sm font-semibold mb-2">{sala.chips.label}</span>
          <div className="flex flex-wrap gap-2">
            {sala.chips.valores.map((v) => (
              <button key={v} onClick={() => setCampo(sala.chips.key, v)} className="rounded-full px-3 py-1.5 text-sm font-medium"
                style={brief[sala.chips.key] === v ? { background: "#FFFFFF", color: C.bg } : { background: C.painel2, color: C.texto, border: `1px solid ${C.linha}` }}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <label className="block mb-4">
          <span className="block text-sm font-semibold mb-1">{sala.detalhes.label}</span>
          <CampoComVoz
            linhas={3}
            className="w-full rounded-xl px-3 py-2 text-sm"
            style={inputStyle}
            value={brief.detalhes}
            onChange={(v) => setCampo("detalhes", v)}
            placeholder={sala.detalhes.ph}
          />
        </label>
        {opcoesRef.length > 0 && (
          <label className="block mb-5">
            <span className="block text-sm font-semibold mb-1">Usar entrega aprovada como base</span>
            <select className="w-full rounded-xl px-3 py-2 text-sm" style={inputStyle} value={brief.refId || ""} onChange={(e) => setCampo("refId", e.target.value)}>
              <option value="">Nenhuma</option>
              {opcoesRef.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {(SALAS[s.tipo] ? SALAS[s.tipo].aba : "Entrega")}: {s.rotulo}, {s.cliente}, {s.data}
                </option>
              ))}
            </select>
          </label>
        )}
        <button onClick={iniciar} disabled={!podeIniciar} className="w-full rounded-2xl py-3 text-base font-bold"
          style={podeIniciar
            ? { background: C.brilho, color: "#fff", boxShadow: `0 0 28px ${C.brilho}55` }
            : { background: "#231416", color: C.mudo, cursor: "not-allowed" }}>
          Reunir a equipe
        </button>
        {!podeIniciar && (
          <p className="text-xs mt-2 text-center" style={{ color: C.mudo }}>
            Preencha {juntar(sala.campos.filter((c) => c.obrig && !(briefEfetivo[c.key] || "").trim()).map((c) => c.label.toLowerCase()))} para começar.
          </p>
        )}
      </div>
    </div>
  );

  const conteudoSalaReuniao = () => {
    const centroMesa = fase === "aprovacao" ? "Sua vez" : fase === "finalizado" ? "Aprovado" : fase === "parado" ? "Encerrada" : sala.etapas[etapa];
    const status = falando
      ? `${AGENTS[falando].nome} ${AGENTS[falando].acao}${alvos.length ? `, conectado a ${juntar(alvos.map((x) => AGENTS[x].nome))}` : ""}`
      : fase === "aprovacao" ? "A equipe terminou. Falta a sua decisão."
      : fase === "finalizado" ? "Entrega aprovada."
      : fase === "parado" ? "Reunião encerrada."
      : "Conectando a equipe...";

    return (
      <div>
        <div className="sticky top-0 z-10" style={{ background: "rgba(10,7,8,0.92)", borderBottom: `1px solid ${C.linha}`, backdropFilter: "blur(8px)" }}>
          <div className="max-w-xl mx-auto px-4 pt-3 pb-3">
            <div className="flex justify-between items-center gap-2">
              <div className="min-w-0">
                <div className="display font-bold text-sm truncate">{sala.titulo}</div>
                <div className="text-xs truncate" style={{ color: C.mudo }}>{briefEfetivo.cliente}, {brief[sala.chips.key]}</div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setMesaAberta(!mesaAberta)} className="rounded-full px-3 py-1.5 text-xs font-semibold" style={botaoSec}>
                  {mesaAberta ? "Recolher mesa" : "Ver mesa"}
                </button>
                {fase === "rodando" ? (
                  <button onClick={() => { stopRef.current = true; }} className="rounded-full px-3 py-1.5 text-xs font-semibold"
                    style={{ background: "#FF3B3F22", border: "1px solid #FF3B3F66", color: "#FF9AAC" }}>
                    Encerrar
                  </button>
                ) : (
                  <button onClick={() => setFase("briefing")} className="rounded-full px-3 py-1.5 text-xs font-semibold" style={botaoSec}>
                    Novo briefing
                  </button>
                )}
              </div>
            </div>

            {mesaAberta && (
              <div style={{ maxWidth: 440, margin: "4px auto 0" }}>
                <Mesa sala={sala} falando={falando} alvos={alvos} arestas={arestas} online={online} centro={centroMesa} sub={`${nConexoes} ${nConexoes === 1 ? "conexão" : "conexões"}`} />
              </div>
            )}

            <div className="text-xs text-center mt-1 truncate" style={{ color: falando ? AGENTS[falando].cor : C.mudo }}>{status}</div>

            <div className="flex items-center mt-2 overflow-x-auto">
              {sala.etapas.map((e, i) => (
                <div key={e} className="flex items-center flex-shrink-0" style={{ flex: i < sala.etapas.length - 1 ? "1 0 auto" : "0 0 auto" }}>
                  <span className="rounded-full px-2 py-0.5 font-semibold whitespace-nowrap" style={{
                    fontSize: 11,
                    ...(i === etapa ? { background: C.brilho, color: "#fff" } : { color: i < etapa ? C.texto : C.mudo }),
                  }}>
                    {e}
                  </span>
                  {i < sala.etapas.length - 1 && <span className="mx-1" style={{ height: 1, flex: "1 0 8px", background: C.linha }} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 pb-10" role="log" aria-live="polite">
          {(() => {
            let contador = 0;
            return msgs.map((m) => {
              const indice = m.agent !== "voce" && m.agent !== "sistema" ? contador++ : null;
              return <Mensagem key={m.id} m={m} entregaNome={sala.entregaNome} arquivo={arquivoBase} indice={indice} />;
            });
          })()}
          {falando && <Digitando id={falando} alvos={alvos} />}

          {fase === "aprovacao" && (
            <div className="mt-6 rounded-3xl p-5" style={{ background: C.painel, border: `1px solid ${C.brilho}`, boxShadow: `0 0 40px ${C.brilho}22` }}>
              <h2 className="display font-bold text-base">Sua vez de decidir</h2>
              <p className="text-sm mt-1" style={{ color: C.mudo }}>Esta é a versão que passou por toda a equipe.</p>
              <EntregaCard rotulo={`${sala.entregaNome}, versão ${versaoRef.current}`} texto={entregaRef.current} svg={sala.visual ? svgRef.current : null}
                arquivo={`${arquivoBase}-v${versaoRef.current}`} destaque />
              {!ajusteAberto ? (
                <div className="flex gap-2 mt-4">
                  <button onClick={aprovar} className="flex-1 rounded-2xl py-3 text-sm font-bold"
                    style={{ background: C.brilho, color: "#fff", boxShadow: `0 0 24px ${C.brilho}55` }}>
                    Aprovar e salvar
                  </button>
                  <button onClick={() => setAjusteAberto(true)} className="flex-1 rounded-2xl py-3 text-sm font-bold" style={botaoSec}>
                    Pedir ajuste
                  </button>
                </div>
              ) : (
                <div className="mt-4">
                  <CampoComVoz
                    linhas={3}
                    className="w-full rounded-xl px-3 py-2 text-sm"
                    style={inputStyle}
                    value={ajuste}
                    onChange={setAjuste}
                    placeholder={`O que você quer mudar? ${AGENTS[sala.lider].nome} refaz e a entrega passa de novo por ${AGENTS[sala.revisor].nome} e ${AGENTS[sala.gerente].nome}.`}
                  />
                  {clienteAtual && <p className="text-xs mt-1" style={{ color: C.mudo }}>Este pedido também fica salvo como aprendizado de {clienteAtual.nome}.</p>}
                  <div className="flex gap-2 mt-2">
                    <button onClick={enviarAjuste} disabled={!ajuste.trim()} className="flex-1 rounded-2xl py-3 text-sm font-bold"
                      style={ajuste.trim() ? { background: "#FFFFFF", color: C.bg } : { background: "#231416", color: C.mudo }}>
                      Enviar para {AGENTS[sala.lider].nome}
                    </button>
                    <button onClick={() => setAjusteAberto(false)} className="rounded-2xl px-4 py-3 text-sm font-semibold" style={{ color: C.mudo }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {fase === "finalizado" && ultimaAprovada && !sala.interna && (
            <div className="mt-6 rounded-3xl p-5" style={painelStyle}>
              <h2 className="display font-bold text-sm">Levar para outra sala</h2>
              <p className="text-xs mt-1 mb-3" style={{ color: C.mudo }}>A próxima equipe recebe esta entrega como base do trabalho.</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(SALAS).filter((s) => s.id !== sala.id && !s.interna).map((s) => (
                  <button key={s.id} onClick={() => levarPara(s.id)} className="rounded-2xl py-3 text-xs font-semibold" style={botaoSec}>
                    {s.aba}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(fase === "finalizado" || fase === "parado") && (
            <button onClick={() => setFase("briefing")} className="w-full mt-4 rounded-2xl py-3 text-sm font-bold" style={{ background: "#FFFFFF", color: C.bg }}>
              Voltar ao briefing
            </button>
          )}
          <div ref={fimRef} style={{ height: 1 }} />
        </div>
      </div>
    );
  };

  const ClientesView = () => (
    <div className="max-w-5xl mx-auto px-6 pt-8 pb-14">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <div>
          <div className="text-xs font-bold tracking-widest" style={{ color: "#FF3B3F" }}>BASE DE CLIENTES</div>
          <h1 className="display font-bold" style={{ fontSize: 28, color: C.texto }}>Clientes</h1>
        </div>
        <button onClick={onNovoCliente} className="rounded-xl px-4 py-2 text-sm font-bold" style={{ background: "#FF3B3F", color: "#fff" }}>+ Novo cliente</button>
      </div>
      <p className="text-sm mb-6" style={{ color: C.mudo }}>Cada cliente carrega sua própria base de conhecimento, usada por todas as salas.</p>

      {clientes.length === 0 ? (
        <div className="rounded-3xl p-8 text-center" style={painelStyle}>
          <p className="text-sm" style={{ color: C.mudo }}>Nenhum cliente cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientes.map((c) => {
            const entregasCliente = salvas.filter((s) => s.clienteId === c.id).length;
            return (
              <div key={c.id} className="rounded-2xl p-4" style={painelStyle}>
                <div className="text-sm font-bold truncate">{c.nome}</div>
                <div className="text-xs mt-0.5 truncate" style={{ color: C.mudo }}>{c.segmento || "Segmento não informado"}</div>
                <div className="flex gap-3 mt-3 text-xs" style={{ color: "#9C7476" }}>
                  <span>{entregasCliente} entrega{entregasCliente === 1 ? "" : "s"}</span>
                  <span>{(c.aprendizados || []).length} aprendizado{(c.aprendizados || []).length === 1 ? "" : "s"}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setClienteSel(c.id); navegar("sala", salaId); }} className="flex-1 rounded-xl py-2 text-xs font-semibold" style={{ background: "#FF3B3F", color: "#fff" }}>
                    Abrir sala
                  </button>
                  <button onClick={() => setEditando({ ...c })} className="rounded-xl px-3 py-2 text-xs font-semibold" style={botaoSec}>Editar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const EntregasView = () => {
    const filtradas = salvas.filter((s) => filtroEntregas === "todas" || s.tipo === filtroEntregas);
    return (
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-14">
        <div className="text-xs font-bold tracking-widest" style={{ color: "#FF3B3F" }}>BIBLIOTECA</div>
        <h1 className="display font-bold mb-4" style={{ fontSize: 28, color: C.texto }}>Entregas aprovadas ({salvas.length})</h1>
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setFiltroEntregas("todas")} className="rounded-full px-3 py-1.5 text-xs font-semibold" style={filtroEntregas === "todas" ? { background: "#FF3B3F", color: "#fff" } : botaoSec}>Todas</button>
          {Object.values(SALAS).map((s) => (
            <button key={s.id} onClick={() => setFiltroEntregas(s.id)} className="rounded-full px-3 py-1.5 text-xs font-semibold" style={filtroEntregas === s.id ? { background: "#FF3B3F", color: "#fff" } : botaoSec}>{s.aba}</button>
          ))}
        </div>
        {filtradas.length === 0 && <p className="text-sm" style={{ color: C.mudo }}>Nenhuma entrega aqui ainda.</p>}
        {filtradas.map((s) => (
          <div key={s.id} className="mb-5">
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-sm font-semibold truncate">{s.cliente}</span>
              <button className="text-xs flex-shrink-0" style={{ color: C.mudo }} onClick={() => excluirSalva(s.id)}>Excluir</button>
            </div>
            <div className="text-xs mb-1" style={{ color: C.mudo }}>{SALAS[s.tipo] ? SALAS[s.tipo].aba : "Copy"}, {s.rotulo}, {s.data}</div>
            <EntregaCard rotulo="Versão final" texto={s.texto} svg={s.svg} arquivo={`${slug(s.cliente)}-${s.tipo}-final`} />
          </div>
        ))}
      </div>
    );
  };

  const AgenciaView = () => (
    <div className="max-w-xl mx-auto px-6 pt-8 pb-14">
      <div className="text-xs font-bold tracking-widest" style={{ color: "#FF3B3F" }}>CONFIGURAÇÃO</div>
      <h1 className="display font-bold mb-4" style={{ fontSize: 28, color: C.texto }}>Agência</h1>
      <div className="rounded-3xl p-5" style={painelStyle}>
        <h2 className="display font-bold text-sm mb-4">Identidade</h2>
        <label className="block mb-4">
          <span className="block text-sm font-semibold mb-1">Nome da agência</span>
          <CampoComVoz className="w-full rounded-xl px-3 py-2 text-sm" style={inputStyle} value={cfg.agencia} onChange={(v) => setCfg({ ...cfg, agencia: v })} />
        </label>
        <label className="block mb-4">
          <span className="block text-sm font-semibold mb-1">Jeito de trabalhar da agência</span>
          <CampoComVoz linhas={3} className="w-full rounded-xl px-3 py-2 text-sm" style={inputStyle} value={cfg.tom} onChange={(v) => setCfg({ ...cfg, tom: v })}
            placeholder="Ex.: foco em resultado, linguagem próxima, nada de promessas milagrosas" />
        </label>
        <button onClick={salvarCfg} className="rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: "#FFFFFF", color: C.bg }}>
          {cfgSalva ? "Salvo" : "Salvar identidade"}
        </button>
      </div>

      <div className="rounded-3xl p-5 mt-4" style={painelStyle}>
        <h2 className="display font-bold text-sm mb-2">Manual da equipe</h2>
        <p className="text-xs mb-3" style={{ color: C.mudo, lineHeight: 1.5 }}>Defina como cada papel deve pensar e trabalhar. Essas diretrizes entram em todas as reuniões.</p>
        <div className="flex flex-wrap gap-1 mb-4">
          {Object.keys(PERFIS_BASE).map((id) => <button key={id} onClick={() => setAgenteEditando(id)} className="rounded-full px-2 py-1 text-xs font-semibold"
            style={agenteEditando === id ? { background: AGENTS[id].cor, color: "#000" } : botaoSec}>{AGENTS[id].nome}</button>)}
        </div>
        {agenteEditando && (
          <>
            {[["metodo", "Método de trabalho"], ["criterios", "O que esse agente precisa avaliar"], ["evitar", "O que ele deve evitar"]].map(([key, label]) => (
              <label key={key} className="block mb-3">
                <span className="block text-xs font-semibold mb-1">{label}</span>
                <CampoComVoz linhas={3} className="w-full rounded-xl px-3 py-2 text-sm" style={inputStyle}
                  value={(perfis[agenteEditando] || PERFIS_BASE[agenteEditando])[key]}
                  onChange={(value) => setPerfis((prev) => ({ ...prev, [agenteEditando]: { ...(prev[agenteEditando] || PERFIS_BASE[agenteEditando]), [key]: value } }))} />
              </label>
            ))}
            <button onClick={() => { salvarAgenciaCentral(cfg, perfis); setCfgSalva(true); }} className="rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: "#FFFFFF", color: C.bg }}>Salvar treinamento de {AGENTS[agenteEditando].nome}</button>
          </>
        )}
      </div>
    </div>
  );

  const conteudoPrincipal = () => {
    if (view === "clientes") return <ClientesView />;
    if (view === "entregas") return <EntregasView />;
    if (view === "cerebro") return <Cerebro skills={skills} setSkills={setSkills} onSalvar={() => salvarAgenciaCentral(cfg, perfis, skills)} />;
    if (view === "agencia") return <AgenciaView />;
    if (view === "sala") return fase === "briefing" ? conteudoSalaBriefing() : conteudoSalaReuniao();
    return (
      <Painel
        clientes={clientes}
        salvas={salvas}
        cfg={cfg}
        onNavigate={setView}
        onNovoCliente={onNovoCliente}
        onNovaReuniao={(sid) => navegar("sala", sid)}
      />
    );
  };

  return (
    <div className="sala min-h-screen flex" style={fundo}>
      <Sidebar
        view={view}
        salaId={salaId}
        aberto={sidebarAberta}
        onToggle={() => setSidebarAberta((v) => !v)}
        onNavigate={navegar}
        clientesCount={clientes.length}
        entregasCount={salvas.length}
      />
      <main className="flex-1 min-w-0">{conteudoPrincipal()}</main>
    </div>
  );
}
