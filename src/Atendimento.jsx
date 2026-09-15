import { C, ETAPAS_PIPELINE } from "./agencyData.js";
import { painelStyle, botaoSec } from "./uiParts.jsx";

const COLUNAS = {
  novo: { titulo: "Novo contato", cor: "#8C7476" },
  proposta: { titulo: "Proposta enviada", cor: "#FF8A8D" },
  negociacao: { titulo: "Negociação", cor: "#FF5A5F" },
  fechado: { titulo: "Fechado", cor: "#FFFFFF" },
};

function proximaEtapa(etapa) {
  const i = ETAPAS_PIPELINE.indexOf(etapa);
  return ETAPAS_PIPELINE[Math.min(i + 1, ETAPAS_PIPELINE.length - 1)];
}

export default function Atendimento({ pipeline, setPipeline, onConverterCliente }) {
  const avancar = (id) => {
    setPipeline((prev) => prev.map((p) => (p.id === id ? { ...p, etapa: proximaEtapa(p.etapa) } : p)));
  };

  const valorTotal = pipeline.reduce((n, p) => n + (p.valor || 0), 0);
  const fmt = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="max-w-6xl mx-auto px-6 pt-8 pb-14">
      <div className="text-xs font-bold tracking-widest" style={{ color: "#FF3B3F" }}>OPERAÇÃO COMERCIAL</div>
      <h1 className="display font-bold mb-1" style={{ fontSize: 28, color: C.texto }}>Atendimento</h1>
      <p className="text-sm mb-1" style={{ color: C.mudo }}>Funil de novos contatos até virarem cliente ativo na agência.</p>
      <p className="text-xs mb-6" style={{ color: "#9C7476" }}>Dados de demonstração · verba potencial em negociação: {fmt(valorTotal)}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ETAPAS_PIPELINE.map((etapa) => {
          const itens = pipeline.filter((p) => p.etapa === etapa);
          const col = COLUNAS[etapa];
          return (
            <div key={etapa} className="rounded-2xl p-3" style={{ background: "#0F0809", border: `1px solid ${C.linha}`, minHeight: 200 }}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="rounded-full" style={{ width: 8, height: 8, background: col.cor }} />
                <span className="text-xs font-bold tracking-wide" style={{ color: C.texto }}>{col.titulo}</span>
                <span className="text-xs ml-auto" style={{ color: C.mudo }}>{itens.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {itens.map((p) => (
                  <div key={p.id} className="rounded-xl p-3" style={painelStyle}>
                    <div className="text-sm font-semibold">{p.nome}</div>
                    <div className="text-xs mt-0.5" style={{ color: C.mudo }}>{p.segmento}</div>
                    <div className="flex justify-between items-center mt-2 text-xs" style={{ color: "#9C7476" }}>
                      <span>{fmt(p.valor)}/mês</span>
                      <span>{p.contato}</span>
                    </div>
                    {etapa !== "fechado" ? (
                      <button onClick={() => avancar(p.id)} className="w-full mt-3 rounded-lg py-1.5 text-xs font-semibold" style={botaoSec}>
                        Avançar etapa →
                      </button>
                    ) : (
                      <button onClick={() => onConverterCliente(p)} className="w-full mt-3 rounded-lg py-1.5 text-xs font-bold" style={{ background: "#FF3B3F", color: "#fff" }}>
                        Converter em cliente
                      </button>
                    )}
                  </div>
                ))}
                {itens.length === 0 && <div className="text-xs text-center py-4" style={{ color: "#5C4547" }}>Vazio</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
