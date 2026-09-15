import { C, AGENTS, SALAS } from "./agencyData.js";
import { Mesa } from "./uiParts.jsx";
import { botaoSec, painelStyle } from "./uiParts.jsx";

const SALA_GLOBAL = { mesa: Object.keys(AGENTS) };

function Kpi({ label, valor, nota }) {
  return (
    <div className="kpi-card corner-brackets rounded-2xl px-4 py-4" style={{ background: C.painel, border: `1px solid ${C.linha}` }}>
      <div className="text-[10px] font-bold tracking-widest" style={{ color: "#9C7476" }}>{label}</div>
      <div className="display font-bold mt-1" style={{ fontSize: 26, color: C.texto }}>{valor}</div>
      {nota && <div className="text-xs mt-1" style={{ color: C.mudo }}>{nota}</div>}
    </div>
  );
}

export default function Painel({ clientes, salvas, pipeline, onNavigate, onNovoCliente, onNovaReuniao }) {
  const aprendizados = clientes.reduce((n, c) => n + (c.aprendizados || []).length, 0);
  const emAndamento = pipeline.filter((p) => p.etapa !== "fechado").length;
  const recentes = salvas.slice(0, 6);

  return (
    <div className="max-w-5xl mx-auto px-6 pt-8 pb-14">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <div>
          <div className="text-xs font-bold tracking-widest" style={{ color: "#FF3B3F" }}>CENTRAL DE OPERAÇÕES</div>
          <h1 className="display font-bold" style={{ fontSize: 28, color: C.texto }}>Painel</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={onNovoCliente} className="rounded-xl px-4 py-2 text-sm font-semibold" style={botaoSec}>+ Cliente</button>
          <button onClick={() => onNovaReuniao("estrategia")} className="rounded-xl px-4 py-2 text-sm font-bold" style={{ background: "#FF3B3F", color: "#fff", boxShadow: "0 0 22px #FF3B3F55" }}>
            + Nova reunião
          </button>
        </div>
      </div>
      <p className="text-sm mb-6" style={{ color: C.mudo }}>Visão geral da agência, da rede de agentes e da operação comercial.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Kpi label="CLIENTES ATIVOS" valor={clientes.length} />
        <Kpi label="ENTREGAS APROVADAS" valor={salvas.length} />
        <Kpi label="APRENDIZADOS" valor={aprendizados} nota="registrados pela direção" />
        <Kpi label="ATENDIMENTO" valor={emAndamento} nota="negociações em andamento" />
      </div>

      <div className="rounded-3xl overflow-hidden mb-6" style={{ background: "linear-gradient(160deg, #1C0D0F, #060304)", border: `1px solid ${C.linha}`, boxShadow: "0 24px 60px rgba(0,0,0,.4)" }}>
        <div className="hud-scan" />
        <div className="flex items-center justify-between px-4 pt-4 relative">
          <span className="text-xs font-semibold tracking-widest" style={{ color: "#FF9A9C" }}>REDE DE AGENTES</span>
          <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#FFFFFF" }}>
            <i className="ponto-vivo inline-block rounded-full" style={{ width: 7, height: 7, background: "#FF3B3F" }} /> 21 NÓS ONLINE
          </span>
        </div>
        <Mesa sala={SALA_GLOBAL} online={Object.keys(AGENTS)} centro="AGÊNCIA" sub="20 especialistas + você" compacto />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-3xl p-5" style={painelStyle}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="display font-bold text-sm">Atividade recente</h2>
            <button className="text-xs font-semibold" style={{ color: "#FF3B3F" }} onClick={() => onNavigate("entregas")}>Ver tudo</button>
          </div>
          {recentes.length === 0 && <p className="text-sm" style={{ color: C.mudo }}>Nenhuma entrega aprovada ainda.</p>}
          {recentes.map((s) => (
            <div key={s.id} className="flex items-start gap-3 py-2" style={{ borderBottom: `1px solid ${C.linha}` }}>
              <span className="rounded-full flex-shrink-0" style={{ width: 6, height: 6, marginTop: 6, background: "#FF3B3F" }} />
              <div className="min-w-0">
                <div className="text-sm truncate">
                  <strong>{SALAS[s.tipo] ? SALAS[s.tipo].aba : "Entrega"}</strong> aprovada para {s.cliente}
                </div>
                <div className="text-xs" style={{ color: C.mudo }}>{s.rotulo} · {s.data}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl p-5" style={painelStyle}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="display font-bold text-sm">Atendimento comercial</h2>
            <button className="text-xs font-semibold" style={{ color: "#FF3B3F" }} onClick={() => onNavigate("atendimento")}>Abrir funil</button>
          </div>
          {pipeline.slice(0, 5).map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${C.linha}` }}>
              <div className="min-w-0">
                <div className="text-sm truncate">{p.nome}</div>
                <div className="text-xs" style={{ color: C.mudo }}>{p.segmento}</div>
              </div>
              <span className="text-[10px] font-bold rounded-full px-2 py-1 flex-shrink-0" style={{ background: "#FF3B3F1A", color: "#FF9A9C", border: "1px solid #FF3B3F44" }}>
                {ETAPA_LABEL[p.etapa]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const ETAPA_LABEL = {
  novo: "Novo contato",
  proposta: "Proposta enviada",
  negociacao: "Negociação",
  fechado: "Fechado",
};
