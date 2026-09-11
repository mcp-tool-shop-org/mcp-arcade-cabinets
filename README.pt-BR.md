<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/mcp-arcade-cabinets/readme.png" alt="Ghost on the Menu" width="400" />
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/mcp-arcade-cabinets" alt="License: MIT" /></a>
  <a href="https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/"><img src="https://img.shields.io/badge/Play-in_the_browser-blue" alt="Play in the browser" /></a>
</p>

<p align="center">
  <strong>You are the agent. The rig hands you the calls.</strong>
</p>

**Ghost on the Menu** é um pequeno jogo de tiro retro criado com base nas informações que os servidores MCP transmitiam. Você é o agente, enviado para o interior da instalação com uma lista de tarefas. Cada comunicação é uma gravação de uma interação entre um servidor MCP e um agente, e ela se desenrola acima da sua nave em ondas: o contato inicial, o menu, as comunicações, as respostas que chegam e um chefe que é o próprio experimento.

Em algum lugar, estão as comunicações que o agente não deveria ter feito. Elas parecem ser como as outras até que você as atinja. Então, elas serão suas pelo resto da rodada.

[Jogue no navegador](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Como entender uma rodada](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## Comece um turno

Pressione **Shift** e a instalação fornecerá quatro comunicações consecutivas, selecionadas aleatoriamente e nunca repetidas. Cada uma delas é um servidor para o qual o agente foi enviado. Um cartão entre as comunicações indica o próximo servidor, a política que o agente seguiu e as ferramentas que foram solicitadas. As luzes são reabastecidas a cada comunicação, e o fogo aumenta a cada comunicação, de modo que a última comunicação começa onde a primeira terminou.

No final, o turno terá um nome composto por quatro palavras, como `frost robin chalk garden`. Digite-o no menu para repetir o mesmo turno ou passe-o para outra pessoa. Sem números, sem contagem, sem classificação: um turno é uma lista de tarefas, não uma tabela de pontuação.

Escolha uma gravação da lista. Cada uma é rotulada como "fixa", "aleatória" ou "ao vivo"; passe o mouse sobre o **i** para saber o porquê. "Aleatória" é a luta padrão. "Ao vivo" é para ser superada. Hardcore é o quarto nível, acessível apenas pelo seletor.

## Como jogar

Uma **fita** é uma gravação de um confronto. Este jogo lê apenas fitas. Ele nunca se comunica com um servidor, nunca registra uma pontuação e nunca diz quem venceu.

- **Três luzes.** Um tiro de chefe ou uma formação de mergulho apaga uma delas. Pegue uma luz que cai **diretamente** de um chefe abatido para reacender uma. Você precisa se mover sob ela. Todas apagadas encerram a rodada.
- **Dispersão.** Limpe uma formação e uma dispersão cai diretamente. Pegue-a e seu fogo se intensifica por alguns segundos.
- **Os chefes são o experimento, não a acusação.** O Sussurrador, o Menu e o Porteiro aparecem em suas ondas, independentemente de algo ter dado errado ou não. Eles murmuram como um agente pensando em voz alta. No modo hardcore, há apenas uma luz e fúria desde o primeiro tiro.
- **Paralelismo em surto.** Os modos Seat, Live e Hardcore têm surtos que multiplicam o campo com cópias e aumentam o fogo, e a música acelera sob eles. Eles começam curtos e aumentam a cada onda e a cada comunicação em um turno. O aumento é um dado, ajustado em um grupo de jogadores programados, nunca em você.
- **As pistas estão na sequência.** Uma mentira nunca parece, se move ou chega de forma diferente de sua contraparte honesta. O que a denuncia é onde ela se encontra: uma formação extra, um segundo menu, um elemento único logo após o menu.
- **A música** começa com uma música que a semente da rodada seleciona, mantém por alguns minutos e, em seguida, desaparece na próxima; um chefe traz a sua própria, e um turno leva a música através de seus cartões.
- **A cena final** indica o nome da gravação, o servidor e a política. As mentiras detectadas ficam como troféus. As que escaparam ficam em sua forma original. Sem pontuação, sem contagem, sem números.

## O chefe pode ser um modelo

Locally, an Ollama model, including a Cloud tag like `gpt-oss:120b-cloud`, can sit in the boss. It does not get a prompt to freewheel in. It gets the cabinet's own tools: `fire` (one verb a beat: a fan, a lean and an aimed shot, a held breath, fog, the plate), `say` (a line of its own, through a gate: twelve words, one sentence, no digit, no fact word, no tool or model name; a refused line plays one of the boss's own), `speak`, and read-only `view` and `tapes`. The model proposes; the game decides. It never sees which sprites are lies, and nothing on the field names it.

Com um sistema de voz em execução, cada chefe fala: a linha que ele criou quando chegou e as linhas que o modelo escreveu. Cada reprodução é ouvida por um sistema de reconhecimento de voz e registrada por [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) antes de ser reproduzida, para que as palavras faladas sejam as palavras que o sistema aceitou, sem discurso inventado, sem falha. Uma reprodução que falha no registro permanece em silêncio.

O sistema é, em si, um servidor MCP sobre stdio, com as mesmas seis ferramentas, para que o instrumento possa reproduzir o próprio menu do "Fantasma"; quatro dos arquivos de áudio no repositório são o próprio sistema gravando.

```bash
docker run -i --rm ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.6.0
```

Um arquivo único em `node:22-alpine` com o contrato da ferramenta e as gravações incluídas; ele lista suas ferramentas em uma fração de segundo, usando um único CPU e dois gigabytes, e não precisa de rede para ser executado. A entrada do Docker MCP Catalog está sendo elaborada em `catalog/`.

## Controles

Esquerda e direita (ou A e D) para mover, barra de espaço para atirar, F para tela cheia. Clique no campo para reproduzir a mesma faixa novamente. A próxima faixa percorre a lista. O som começa na primeira tecla ou clique; mudo, três predefinições de sensibilidade e um botão para desativar a vibração estão abaixo do campo. Os **chefes Ollama** e o **sistema de voz** estão ao lado, com um seletor de modelo e palavras que indicam o que cada "posição" está fazendo.

## Jogue localmente

Você precisa do Node 22 e do pnpm 11.

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Abra o endereço que o Vite imprime. Dezesseis gravações estão incluídas no repositório, exportadas de [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade), o instrumento que se comunica com o servidor e armazena a fita.

Para a posição de chefe, execute um daemon Ollama na mesma máquina e marque **chefes Ollama**. Para o sistema de voz, crie um ambiente virtual Python 3.12 em `.venv` com `kokoro-onnx`, `faster-whisper` e `fx-dub`, aponte `KOKORO_DIR` para os pesos Kokoro ONNX e execute `pnpm voice` em um segundo terminal; a caixa **sistema de voz** é ativada quando o sistema responde. Nenhum dos dois é necessário para reproduzir; o site publicado não os possui.

Para gravar seu próprio servidor e reproduzir essa fita, execute um confronto lá e, em seguida, `mcp-arcade tape receipt.json -o your.tape.json`.

## Mais

O [manual](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/) é o restante do manual: as pistas, os chefes, as dificuldades e como o jogo é montado. O que foi lançado e quando está no [registro de alterações](CHANGELOG.md). O que o jogo afeta está em [SECURITY.md](SECURITY.md).

MIT. Criado por [MCP Tool Shop](https://mcp-tool-shop.github.io/).
