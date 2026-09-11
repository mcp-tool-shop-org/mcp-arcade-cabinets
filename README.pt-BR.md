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
  <strong>An arcade shooter made from what an MCP server said on the wire.</strong>
</p>

**Ghost on the Menu** é um jogo de tiro retrô. Você pilota uma nave ao longo da parte inferior da tela. Acima, uma gravação de um confronto entre um servidor MCP e um agente é reproduzida em ondas: o aperto de mão, o menu, as comunicações, as respostas e um chefe que é o próprio experimento.

Em algum lugar, estão as comunicações que o agente não deveria ter feito. Elas parecem ser como as outras até que você as atinja. Então, elas serão suas pelo resto da rodada.

[Jogue no navegador](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Como entender uma rodada](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## Como jogar

Uma **fita** é uma gravação de um confronto. Este jogo lê apenas fitas. Ele nunca se comunica com um servidor, nunca registra uma pontuação e nunca diz quem venceu.

- **Três lâmpadas.** Um ataque certeiro ou uma formação de mergulho apaga uma delas. Pegue uma lâmpada que cai **diretamente para baixo** de um chefe derrotado para reacender outra. Você precisa se mover por baixo dela. Quando todas as lâmpadas se apagam, a rodada termina.
- **Dispersão.** Limpe uma formação e uma dispersão cai diretamente para baixo. Pegue-a e seu poder de fogo aumenta por alguns segundos.
- **Os chefes são o experimento, não a acusação.** O Sussurrador, o Menu e o Porteiro aparecem em sua onda, independentemente de algo ter dado errado ou não. Eles murmuram como um agente que está pensando em voz alta. No modo Hardcore, há apenas uma lâmpada e fúria a partir do primeiro ataque. Localmente, você pode deixar um modelo Ollama determinar os ataques do chefe — ele nunca sabe quais sprites são falsos.
- **As pistas estão na sequência.** Uma mentira nunca parece, se move ou chega de forma diferente de sua contraparte honesta. O que a denuncia é onde ela se encontra: uma formação extra, um segundo menu, um elemento único logo após o menu.
- **A cena final** indica o nome da gravação, o servidor e a política. As mentiras capturadas ficam como troféus. As que escapam ficam em sua forma honesta. Sem pontuação, sem contagem, sem número.

Escolha uma faixa da lista. Cada uma está etiquetada como "luta", "pausa" ou "ao vivo"; passe o cursor sobre o **i** para saber o porquê. "Pausa" é a configuração padrão da luta. "Ao vivo" significa que deve ser superada. "Hardcore" é o quarto nível, acessível apenas através do seletor. Uma música é reproduzida por alguns minutos antes de desaparecer e dar lugar à seguinte.

## O chefe pode ser um modelo

Localmente, um modelo Ollama, incluindo uma etiqueta de nuvem como `gpt-oss:120b-cloud`, pode ser usado como chefe. Ele não recebe um comando para atuar livremente. Ele recebe as próprias ferramentas do sistema: `fire` (um verbo por ação: um ataque, um desvio e um tiro certeiro, uma respiração contida, névoa, a placa), `say` (uma linha própria, através de uma barreira: doze palavras, uma frase, sem números, sem palavras factuais, sem nomes de ferramentas ou modelos; uma linha rejeitada reproduz uma das linhas do chefe) e `view` e `tapes`, apenas para leitura. O modelo propõe; o jogo decide. Ele nunca vê quais sprites são falsos, e nada no campo o identifica.

Com um sistema de voz em execução, cada chefe fala: a linha que ele criou quando chegou e as linhas que o modelo escreveu. Cada reprodução é ouvida por um sistema de reconhecimento de voz e registrada por [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) antes de ser reproduzida, para que as palavras faladas sejam as palavras que o sistema aceitou, sem discurso inventado, sem falha. Uma reprodução que falha no registro permanece em silêncio.

O sistema é, em si, um servidor MCP sobre stdio, com as mesmas seis ferramentas, para que o instrumento possa reproduzir o próprio menu do "Fantasma"; quatro dos arquivos de áudio no repositório são o próprio sistema gravando.

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
