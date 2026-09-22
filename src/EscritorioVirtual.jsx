import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import { AGENTS, SALAS, C } from "./agencyData.js";

function construirSalas() {
  const externas = Object.values(SALAS).filter((s) => !s.interna);
  const internas = Object.values(SALAS).filter((s) => s.interna);
  return [...externas, ...internas].map((s) => ({
    nome: s.aba,
    cor: (AGENTS[s.lider] || {}).cor || C.brilho,
    span: s.id === "dna" ? 2 : 1,
    agentes: s.mesa.filter((id) => id !== "voce"),
  }));
}

export default function EscritorioVirtual() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let destruido = false;
    let removerTick = null;
    const app = new Application();

    (async () => {
      await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
      if (destruido) { app.destroy(true, { children: true }); return; }
      host.appendChild(app.canvas);

      const salas = construirSalas();
      const cols = 4;
      const rows = 2;
      const gap = 9;
      const W = app.screen.width;
      const H = app.screen.height;
      const colW = (W - gap * (cols - 1)) / cols;
      const rowH = (H - gap * (rows - 1)) / rows;

      let colCursor = 0;
      let rowCursor = 0;
      const agentesAnimados = [];

      salas.forEach((sala) => {
        const span = sala.span || 1;
        const x = colCursor * (colW + gap);
        const y = rowCursor * (rowH + gap);
        const w = colW * span + gap * (span - 1);
        const h = rowH;
        colCursor += span;
        if (colCursor >= cols) { colCursor = 0; rowCursor += 1; }

        const corSala = parseInt(sala.cor.replace("#", ""), 16);
        const zona = new Graphics()
          .roundRect(x, y, w, h, 10)
          .fill({ color: 0x0d0708 })
          .stroke({ width: 1, color: corSala, alpha: 0.35 });
        app.stage.addChild(zona);

        const label = new Text({
          text: sala.nome.toUpperCase(),
          style: { fontFamily: "Sora, sans-serif", fontSize: 9, fontWeight: "700", fill: corSala, letterSpacing: 1 },
        });
        label.x = x + 8;
        label.y = y + 6;
        app.stage.addChild(label);

        sala.agentes.forEach((id) => {
          const ag = AGENTS[id];
          if (!ag) return;
          const corAgente = parseInt(ag.cor.replace("#", ""), 16);
          const raio = 8;
          const pad = raio + 4;
          const minX = x + pad, maxX = Math.max(x + pad, x + w - pad);
          const minY = y + 22, maxY = Math.max(y + 22, y + h - pad);

          const corpo = new Container();
          const sombra = new Graphics().ellipse(0, raio + 3, raio * 0.7, 3).fill({ color: 0x000000, alpha: 0.35 });
          const bola = new Graphics().circle(0, 0, raio).fill({ color: 0x1a0e10 }).stroke({ width: 1.5, color: corAgente });
          const texto = new Text({ text: ag.nome[0], style: { fontFamily: "Unbounded, sans-serif", fontSize: 8, fontWeight: "700", fill: corAgente } });
          texto.anchor.set(0.5);
          corpo.addChild(sombra, bola, texto);
          corpo.x = minX + Math.random() * Math.max(1, maxX - minX);
          corpo.y = minY + Math.random() * Math.max(1, maxY - minY);
          app.stage.addChild(corpo);

          agentesAnimados.push({
            corpo,
            minX, maxX, minY, maxY,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            proximaGuinada: Math.random() * 120,
          });
        });
      });

      const tick = () => {
        agentesAnimados.forEach((a) => {
          a.proximaGuinada -= 1;
          if (a.proximaGuinada <= 0) {
            a.vx += (Math.random() - 0.5) * 0.3;
            a.vy += (Math.random() - 0.5) * 0.3;
            const vel = Math.hypot(a.vx, a.vy) || 1;
            const max = 0.5;
            if (vel > max) { a.vx = (a.vx / vel) * max; a.vy = (a.vy / vel) * max; }
            a.proximaGuinada = 90 + Math.random() * 120;
          }
          a.corpo.x += a.vx;
          a.corpo.y += a.vy;
          if (a.corpo.x < a.minX || a.corpo.x > a.maxX) { a.vx *= -1; a.corpo.x = Math.max(a.minX, Math.min(a.maxX, a.corpo.x)); }
          if (a.corpo.y < a.minY || a.corpo.y > a.maxY) { a.vy *= -1; a.corpo.y = Math.max(a.minY, Math.min(a.maxY, a.corpo.y)); }
          a.corpo.scale.x = a.vx < 0 ? -1 : 1;
        });
      };
      app.ticker.add(tick);
      removerTick = () => app.ticker.remove(tick);
    })();

    return () => {
      destruido = true;
      if (removerTick) removerTick();
      try { app.destroy(true, { children: true, texture: true }); } catch (e) {}
      if (host) host.innerHTML = "";
    };
  }, []);

  return <div ref={hostRef} style={{ width: "100%", height: "100%" }} />;
}
