import { C, SALAS } from "./agencyData.js";

const ICONES = {
  painel: "◆",
  clientes: "☰",
  entregas: "▣",
  cerebro: "✺",
  agencia: "◍",
};

const SALA_ICONES = { estrategia: "◎", copy: "✎", design: "▧", trafego: "▲", dna: "⬡", rh: "◇", financeiro: "▤" };

function ItemLateral({ ativo, aberto, icone, label, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className="side-item w-full flex items-center gap-3 rounded-xl text-sm font-semibold"
      style={{
        padding: aberto ? "9px 12px" : "9px 0",
        justifyContent: aberto ? "flex-start" : "center",
        background: ativo ? "#FF3B3F14" : "transparent",
        borderLeft: ativo ? "3px solid #FF3B3F" : "3px solid transparent",
        color: ativo ? "#FFFFFF" : C.mudo,
      }}
      title={label}
    >
      <span style={{ fontSize: 15, width: 18, textAlign: "center", flexShrink: 0, color: ativo ? "#FF3B3F" : C.mudo }}>{icone}</span>
      {aberto && <span className="truncate flex-1 text-left">{label}</span>}
      {aberto && badge != null && (
        <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5" style={{ background: ativo ? "#FF3B3F" : C.painel2, color: ativo ? "#fff" : C.mudo }}>
          {badge}
        </span>
      )}
    </button>
  );
}

export default function Sidebar({ view, salaId, aberto, onToggle, onNavigate, clientesCount, entregasCount }) {
  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{
        width: aberto ? 236 : 68,
        transition: "width .22s ease",
        background: "linear-gradient(180deg, #120A0B, #0A0607)",
        borderRight: `1px solid ${C.linha}`,
        minHeight: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      <div className="flex items-center gap-2 px-4 py-4" style={{ borderBottom: `1px solid ${C.linha}` }}>
        <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 30, height: 30, background: "#FF3B3F1A", border: "1px solid #FF3B3F55" }}>
          <span className="ponto-vivo inline-block rounded-full" style={{ width: 8, height: 8, background: "#FF3B3F" }} />
        </div>
        {aberto && (
          <div className="min-w-0">
            <div className="display font-bold text-xs tracking-widest truncate" style={{ color: "#FFFFFF" }}>SALA DE AGENTES</div>
            <div className="text-[10px] truncate" style={{ color: C.mudo }}>sistema operacional</div>
          </div>
        )}
      </div>

      <div className="flex-1 px-2 py-3 flex flex-col gap-1 overflow-y-auto">
        <ItemLateral ativo={view === "painel"} aberto={aberto} icone={ICONES.painel} label="Painel" onClick={() => onNavigate("painel")} />
        <ItemLateral ativo={view === "clientes"} aberto={aberto} icone={ICONES.clientes} label="Clientes" badge={clientesCount} onClick={() => onNavigate("clientes")} />

        {aberto && <div className="text-[10px] font-bold tracking-widest px-3 pt-3 pb-1" style={{ color: "#6B5052" }}>SALAS</div>}
        {!aberto && <div className="my-1 mx-3" style={{ height: 1, background: C.linha }} />}
        {Object.values(SALAS).filter((s) => !s.interna).map((s) => (
          <ItemLateral key={s.id} ativo={view === "sala" && salaId === s.id} aberto={aberto} icone={SALA_ICONES[s.id]} label={s.aba} onClick={() => onNavigate("sala", s.id)} />
        ))}

        {aberto && <div className="text-[10px] font-bold tracking-widest px-3 pt-3 pb-1" style={{ color: "#6B5052" }}>GESTÃO</div>}
        {!aberto && <div className="my-1 mx-3" style={{ height: 1, background: C.linha }} />}
        {Object.values(SALAS).filter((s) => s.interna).map((s) => (
          <ItemLateral key={s.id} ativo={view === "sala" && salaId === s.id} aberto={aberto} icone={SALA_ICONES[s.id]} label={s.aba} onClick={() => onNavigate("sala", s.id)} />
        ))}

        {aberto && <div className="text-[10px] font-bold tracking-widest px-3 pt-3 pb-1" style={{ color: "#6B5052" }}>OPERAÇÃO</div>}
        {!aberto && <div className="my-1 mx-3" style={{ height: 1, background: C.linha }} />}
        <ItemLateral ativo={view === "entregas"} aberto={aberto} icone={ICONES.entregas} label="Entregas" badge={entregasCount} onClick={() => onNavigate("entregas")} />
        <ItemLateral ativo={view === "cerebro"} aberto={aberto} icone={ICONES.cerebro} label="Cérebro" onClick={() => onNavigate("cerebro")} />
        <ItemLateral ativo={view === "agencia"} aberto={aberto} icone={ICONES.agencia} label="Agência" onClick={() => onNavigate("agencia")} />
      </div>

      <button
        onClick={onToggle}
        className="flex items-center justify-center gap-2 py-3 text-xs font-semibold"
        style={{ borderTop: `1px solid ${C.linha}`, color: C.mudo }}
      >
        <span style={{ display: "inline-block", transform: aberto ? "rotate(180deg)" : "none", transition: "transform .2s" }}>»</span>
        {aberto && "Recolher"}
      </button>
    </div>
  );
}
