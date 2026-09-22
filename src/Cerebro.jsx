import { useState } from "react";
import { C, SALAS } from "./agencyData.js";
import { CampoComVoz, inputStyle, painelStyle, botaoSec } from "./uiParts.jsx";

export default function Cerebro({ skills, setSkills, onSalvar }) {
  const [aberta, setAberta] = useState(null);
  const [salvo, setSalvo] = useState(false);

  const atualizar = (id, campo, valor) => {
    setSkills((prev) => prev.map((sk) => (sk.id === id ? { ...sk, [campo]: valor } : sk)));
  };

  const alternarSala = (id, salaId) => {
    setSkills((prev) => prev.map((sk) => {
      if (sk.id !== id) return sk;
      const tem = sk.salas.includes(salaId);
      return { ...sk, salas: tem ? sk.salas.filter((s) => s !== salaId) : [...sk.salas, salaId] };
    }));
  };

  const nova = () => {
    const id = "skill-" + Date.now();
    setSkills((prev) => [...prev, { id, nome: "Novo padrão", descricao: "", salas: [], conteudo: "" }]);
    setAberta(id);
  };

  const excluir = (id) => {
    setSkills((prev) => prev.filter((sk) => sk.id !== id));
    if (aberta === id) setAberta(null);
  };

  const salvarTudo = () => {
    onSalvar();
    setSalvo(true);
    setTimeout(() => setSalvo(false), 1500);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 pt-8 pb-14">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <div>
          <div className="text-xs font-bold tracking-widest" style={{ color: "#FF3B3F" }}>CONHECIMENTO COLETIVO</div>
          <h1 className="display font-bold" style={{ fontSize: 28, color: C.texto }}>Cérebro</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={nova} className="rounded-xl px-4 py-2 text-sm font-semibold" style={botaoSec}>+ Padrão</button>
          <button onClick={salvarTudo} className="rounded-xl px-4 py-2 text-sm font-bold" style={{ background: "#FF3B3F", color: "#fff" }}>
            {salvo ? "Salvo" : "Salvar"}
          </button>
        </div>
      </div>
      <p className="text-sm mb-6" style={{ color: C.mudo, lineHeight: 1.6 }}>
        Os padrões e frameworks que a equipe usa de verdade — cada um entra automaticamente nas salas marcadas, junto com o briefing e o manual de cada agente.
      </p>

      {skills.length === 0 && (
        <div className="rounded-3xl p-8 text-center" style={painelStyle}>
          <p className="text-sm" style={{ color: C.mudo }}>Nenhum padrão registrado ainda.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {skills.map((sk) => {
          const abertaAqui = aberta === sk.id;
          return (
            <div key={sk.id} className="rounded-2xl overflow-hidden" style={painelStyle}>
              <button className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left" onClick={() => setAberta(abertaAqui ? null : sk.id)}>
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">{sk.nome || "Sem nome"}</div>
                  <div className="text-xs mt-0.5" style={{ color: C.mudo }}>{sk.descricao || "Sem descrição"}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {sk.salas.length === 0 && <span className="text-[10px]" style={{ color: "#6B5052" }}>Nenhuma sala usa este padrão</span>}
                    {sk.salas.map((sid) => (
                      <span key={sid} className="text-[10px] font-bold rounded-full px-2 py-0.5" style={{ background: "#FF3B3F1A", color: "#FF9A9C", border: "1px solid #FF3B3F44" }}>
                        {SALAS[sid] ? SALAS[sid].aba : sid}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: C.mudo }}>{abertaAqui ? "Fechar" : "Editar"}</span>
              </button>

              {abertaAqui && (
                <div className="px-5 pb-5 pt-1">
                  <label className="block mb-3">
                    <span className="block text-xs font-semibold mb-1">Nome do padrão</span>
                    <CampoComVoz className="w-full rounded-xl px-3 py-2 text-sm" style={inputStyle} value={sk.nome} onChange={(v) => atualizar(sk.id, "nome", v)} />
                  </label>
                  <label className="block mb-3">
                    <span className="block text-xs font-semibold mb-1">Descrição curta</span>
                    <CampoComVoz className="w-full rounded-xl px-3 py-2 text-sm" style={inputStyle} value={sk.descricao} onChange={(v) => atualizar(sk.id, "descricao", v)} />
                  </label>
                  <div className="mb-3">
                    <span className="block text-xs font-semibold mb-2">Usado em quais salas</span>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(SALAS).map((s) => (
                        <button key={s.id} onClick={() => alternarSala(sk.id, s.id)} className="rounded-full px-3 py-1.5 text-xs font-semibold"
                          style={sk.salas.includes(s.id) ? { background: "#FF3B3F", color: "#fff" } : botaoSec}>
                          {s.aba}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="block mb-3">
                    <span className="block text-xs font-semibold mb-1">Conteúdo (o que a equipe deve aplicar)</span>
                    <CampoComVoz linhas={6} className="w-full rounded-xl px-3 py-2 text-sm" style={inputStyle} value={sk.conteudo} onChange={(v) => atualizar(sk.id, "conteudo", v)} />
                  </label>
                  <button onClick={() => excluir(sk.id)} className="text-xs font-semibold" style={{ color: "#FF9AAC" }}>Excluir padrão</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
