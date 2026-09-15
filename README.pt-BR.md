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

Pressione **Shift** e o jogo lhe dará quatro ações consecutivas, retiradas da lista e nunca as mesmas quatro duas vezes seguidas. Cada uma é um servidor para o qual o agente foi enviado, e cada ação é uma sala diferente: pressão, área de negação, um descanso e, em seguida, um ataque. Uma carta entre elas indica o próximo servidor, a política, as ferramentas que o agente deve usar e o confronto em palavras — um aperto de mão firme, uma prateleira atravessando a pista, um descanso entre os ataques, uma parede de catálogo ocre. As lâmpadas são reabastecidas a cada ação. O fogo continua a aumentar a cada ação; a ascensão é calor, não uma nova história.

No final, o turno terá um nome composto por quatro palavras, como `frost robin chalk garden`. Digite-o no menu para repetir o mesmo turno ou passe-o para outra pessoa. Sem números, sem contagem, sem classificação: um turno é uma lista de tarefas, não uma tabela de pontuação.

Escolha uma gravação da lista. Cada uma é rotulada como "fixa", "aleatória" ou "ao vivo"; passe o mouse sobre o **i** para saber o porquê. "Aleatória" é a luta padrão. "Ao vivo" é para ser superada. Hardcore é o quarto nível, acessível apenas pelo seletor.

## Como jogar

Uma **fita** é uma gravação de um confronto. Este jogo lê apenas fitas. Ele nunca se comunica com um servidor, nunca registra uma pontuação e nunca diz quem venceu.

- **Três lâmpadas.** Um tiro de chefe ou uma formação de mergulho apaga uma delas. Pegue uma lâmpada que cai **diretamente** de um chefe derrotado para reacender uma. Você tem que se mover sob ela. Todas apagadas encerram a rodada.
- **Dispersão.** Limpe uma formação e uma dispersão cai diretamente. Pegue-a e seu fogo se espalha por alguns segundos.
- **Os chefes são o experimento, não a acusação.** O Sussurrador, o Menu e o Porteiro aparecem em sua onda, independentemente de algo ter dado errado ou não. Em uma rodada, a inspeção termina com o Arquivista (uma parede de catálogo). Eles murmuram como um agente pensando em voz alta. O modo hardcore é uma lâmpada e fúria desde o primeiro tiro.
- **O paralelismo explode.** Assento, ativo e hardcore recebem rajadas que multiplicam o campo com cópias honestas e aquecem o fogo, e a música acelera sob elas. Eles começam curtos e aumentam onda após onda, e durante uma rodada, ação após ação. A ascensão é dados, ajustados em uma faixa de jogadores programados, nunca em você.
- **As pistas estão na sequência.** Uma mentira nunca parece, se move ou chega de forma diferente de sua contraparte honesta. O que a denuncia é onde ela está: uma formação extra, um segundo menu, um único item logo após o menu. Em uma rodada, estruturas extras podem se juntar à sala — uma sonda rápida, uma prateleira atravessando a pista, um livro de contabilidade empilhado — ainda compartilhando sua contraparte honesta até que você as atinja.
- **A música** segue a carta, mas uma música tem apenas um ciclo (cerca de meio minuto) antes de dar lugar a outra. O veneno ainda quer veneno; o Sussurrador ainda quer o Sussurrador. As camas ficam sob os tiros e a captura; o mudo ainda mata tudo de uma vez. Uma rodada leva a música através de suas cartas.
- **A cena final** indica a fita, o servidor e a política. As mentiras capturadas servem como troféus. As que escaparam ficam em sua forma honesta. Sem pontuação, sem contagem, sem dígito.

## O chefe pode ser um modelo

Localmente, um modelo Ollama, incluindo uma tag de Nuvem como `gpt-oss:120b-cloud`, pode estar no chefe. Ele não recebe um prompt para agir livremente. Ele recebe as próprias ferramentas do gabinete: `fire` (um verbo por batida: um ventilador, um apoio e um tiro preciso, uma respiração contida, névoa, a placa), `say` (uma linha própria, através de um portão: doze palavras, uma frase, sem dígito, sem palavra factual, sem nome de ferramenta ou modelo; uma linha rejeitada reproduz uma das linhas do próprio chefe), `speak` e `view` e `tapes` somente leitura. Ele também pode colocar na fila as próximas ações legais após a batida; uma resposta interrompida é o script, nunca uma pausa. O seletor escreve uma linha de biblioteca fechada após o fogo. O modelo propõe; o jogo decide. Ele nunca vê quais sprites são mentiras, e nada no campo o identifica. O site publicado não tem um daemon, então ele omite o Ollama e o Voice.

Com um sistema de voz em execução, cada chefe fala: a linha que ele criou quando chegou e as linhas que o modelo escreveu. Cada reprodução é ouvida por um sistema de reconhecimento de voz e registrada por [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) antes de ser reproduzida, para que as palavras faladas sejam as palavras que o sistema aceitou, sem discurso inventado, sem falha. Uma reprodução que falha no registro permanece em silêncio.

O sistema é, em si, um servidor MCP sobre stdio, com as mesmas seis ferramentas, para que o instrumento possa reproduzir o próprio menu do "Fantasma"; quatro dos arquivos de áudio no repositório são o próprio sistema gravando.

```bash
docker run -i --rm ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.7.0
```

Um arquivo agrupado em `node:22-alpine` com o contrato de ferramenta e as fitas embutidas; ele lista suas ferramentas em uma fração de segundo, usando uma CPU e dois gigabytes, e não precisa de rede para ser executado. Um volume opcional somente leitura pode sobrepor fitas extras do operador, além dessas vinte. A listagem do Catálogo está silenciosa (rede desligada, sem voz na imagem). A entrada do Catálogo Docker MCP é elaborada em `catalog/`. A composição somente para o host para uma imagem local está em `voice/compose.host.yaml`.

## Controles

Esquerda e direita (ou A e D) para se mover, barra de espaço para atirar, F para tela cheia. Clique no campo para reproduzir a mesma fita. A próxima fita percorre a lista; em uma rodada, Próxima ação seleciona a próxima carta. O som começa na primeira tecla ou clique; mudo, três predefinições de sensação e um botão de desligamento ficam sob o campo. A dificuldade está na linha de reprodução (o modo hardcore é uma lâmpada e placas caindo). Localmente, os **chefes Ollama** e o **Voice** ficam ao lado deles, com um seletor de modelo e palavras que dizem o que cada assento está fazendo. A página publicada `/play/` é o campo, som, sensação, vibração e dificuldade apenas.

## Jogue localmente

Um comando, nada para clonar:

```bash
npx @mcptoolshop/ghost-on-the-menu
```

Isso serve o gabinete em `127.0.0.1` e o abre. Ao contrário da página publicada, esta pode acessar um daemon Ollama e um worker de voz em sua própria máquina, então os assentos se acendem. `--mcp` executa o mesmo gabinete como um servidor MCP através de stdio, para que um agente possa jogá-lo; `--help` lista o restante. Node 22 ou mais recente, e nada mais.

Para trabalhar nele, clone-o — você precisa de Node 22 e pnpm 11:

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
