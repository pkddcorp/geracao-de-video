# Estúdio de Vídeos — sua ferramenta

Aqui você conversa com o Claude como fez no chat, mas ele trabalha direto no seu computador:
escreve o vídeo, gera as prévias, confere sozinho e entrega o MP4.

## Instalar (uma vez)
1. **Node.js** (versão 18 ou mais nova): nodejs.org
2. **FFmpeg**: ffmpeg.org (no Windows, o jeito mais fácil é `winget install ffmpeg`)
3. **Claude Code**: siga claude.com/product/claude-code (funciona com o seu plano do Claude)
4. Nesta pasta, no terminal:
   ```
   npm install
   npm run instalar
   ```
5. Opcional (ferramentas de imagem): `pip install pillow numpy scipy`

## Usar
Abra esta pasta no Claude Code e converse normalmente. Exemplos:
- "Novo projeto: pizzaria do Zé, stories de 15s da promoção de terça. Fotos estão na pasta Downloads/ze"
- "Gera a prévia do exemplo da Fame Di"
- "As fotos estão passando rápido, deixa mais tempo"
- "Faz o final"

O Claude lê o arquivo `CLAUDE.md` toda vez: ali estão o passo a passo e tudo que você
aprovou e reprovou (fundo limpo, tela cheia, sem logo no meio etc.).
**Quando você ensinar uma preferência nova, peça: "anota isso no CLAUDE.md".** Assim a ferramenta vai ficando mais a sua cara.

## Comandos manuais (se quiser rodar sem o Claude)
- Prévia: `node motor/render.js projetos/exemplo-fame-di-pizzas`
- Final:  `node motor/render.js projetos/exemplo-fame-di-pizzas --final`

## Pastas
- `projetos/` — um por cliente/campanha (`_novo-projeto` é o modelo em branco)
- `motor/` — o que transforma o roteiro em vídeo (modelo visual, renderização, trilha)
- `referencias/` — vídeos antigos aprovados, para o Claude se inspirar
- `ferramentas/` — limpeza de logo e imagens
