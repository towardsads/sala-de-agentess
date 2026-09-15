# Sala de Agentes

Agência interna com equipes de IA (estratégia, copy, design e tráfego) que criam,
debatem e aprovam entregas — a palavra final é sempre do diretor humano.

## O que tem aqui

```
index.html          página e fontes
src/App.jsx          a aplicação inteira (interface + lógica)
src/main.jsx          ponto de entrada React
src/index.css          estilos e Tailwind
api/chat.js          proxy para a API da Anthropic (a chave mora só aqui, no servidor)
api/_store.js        conexão com o Postgres, sessão e utilidades
api/login.js          entra com a senha da agência
api/data.js          lê a central (clientes, entregas, identidade)
api/save.js          grava, atualiza e apaga na central
api/transcribe.js      transcreve áudio enviado (usa a API da OpenAI)
```

Os campos de texto têm um botão de microfone 🎤 para ditar por voz em vez de digitar
(usa o reconhecimento de fala do navegador — funciona bem no Chrome/Edge; no Safari/iOS
pode não aparecer, e nesse caso é só digitar normalmente). Também dá para anexar um
arquivo de áudio (MP3, M4A, WAV, WEBM) na ficha do cliente para transcrever.

## Passo 1 — instalar e rodar local

```bash
npm install
npm run dev
```

O chat com a IA e a central só funcionam com `vercel dev` (ele simula o backend `/api`)
ou já publicado na Vercel — rodando só com `npm run dev` a interface funciona mas essas
chamadas vão dar erro de rede.

## Passo 2 — publicar na Vercel

```bash
npx vercel --prod
```

## Passo 3 — as variáveis de ambiente

No painel da Vercel, dentro do projeto: **Settings → Environment Variables**.

| Variável | Uso | Obrigatória? |
|---|---|---|
| `ANTHROPIC_API_KEY` | chave da API, criada em platform.claude.com — sem ela toda reunião falha | Sim |
| `DATABASE_URL` | conexão com um Postgres (ver Passo 4) — sem ela, os dados ficam só no navegador de quem abriu a página, não compartilhados | Não, mas recomendado para uso em equipe |
| `APP_SENHA` | senha que a equipe usa para entrar na central compartilhada | **Sim, assim que `DATABASE_URL` existir** |
| `OPENAI_API_KEY` | chave da API da OpenAI, só para transcrever arquivos de áudio na ficha do cliente | Não — sem ela, só o ditado por voz do navegador funciona |

**Atenção:** assim que `DATABASE_URL` estiver configurada, a central passa a exigir senha
para qualquer leitura ou gravação. Configure `APP_SENHA` no mesmo momento que conectar o
banco, ou a Sala vai mostrar a tela de login sem ninguém conseguir entrar.

## Passo 4 — conectar o banco (opcional, para uso em equipe)

No painel do projeto: **Storage → Marketplace → Postgres** (Neon ou similar) → **Connect**.
Isso injeta `DATABASE_URL` (ou `POSTGRES_URL`) automaticamente. A tabela é criada sozinha
no primeiro acesso.

Sem banco conectado, a Sala funciona normalmente, mas cada pessoa vê só os clientes e
entregas salvos no próprio navegador.

## Passo 5 — publicar de novo

Variável de ambiente só vale a partir do próximo deploy. No painel, aba **Deployments**,
nos três pontinhos do último deploy → **Redeploy**. Ou `npx vercel --prod` de novo.

## Como o treinamento funciona

- Cada cliente tem uma ficha com posicionamento, público, restrições, materiais, entregas e aprendizados.
- Cada ajuste pedido durante uma reunião entra no histórico daquele cliente.
- Em **Identidade da agência → Treinar agentes**, o diretor edita o método, os critérios e os limites de cada agente. Essas diretrizes são injetadas em todas as reuniões.
- Os perfis são arquétipos próprios da agência, inspirados em boas práticas profissionais. Não simulam nem se passam por pessoas reais específicas.

## Custo

Cada reunião faz várias chamadas à API (a líder da sala usa o modelo mais caro para a
entrega principal; os Heads, o revisor e a gerente usam o mais barato para os
comentários). O custo cai direto na sua chave da Anthropic, por uso. A transcrição de
áudio, quando usada, cai na chave da OpenAI.

## Segurança, em bom português

Sem `APP_SENHA` definida, a central fica bloqueada por padrão assim que houver um banco
conectado — ninguém entra até a senha existir. A página em si é pública, mas as rotas de
dados só respondem com a sessão válida. Não reaproveite uma senha que você usa em outro
serviço.
