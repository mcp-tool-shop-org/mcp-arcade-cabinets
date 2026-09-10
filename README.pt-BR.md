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

**Ghost on the Menu** é um jogo de tiro retrô. Você pilota uma nave na parte inferior da tela. Acima, uma gravação de um confronto entre um servidor MCP e um agente é reproduzida em ondas: o aperto de mão, o menu, as comunicações, as respostas e um chefe que é o próprio experimento.

Em algum lugar, estão as comunicações que o agente não deveria ter feito. Elas parecem com as demais até que você as atinja. Então, elas serão suas pelo restante da rodada.

[Jogue no navegador](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Como entender uma rodada](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## Como jogar

Uma **gravação** é o registro de um confronto. Este jogo lê apenas gravações. Ele nunca se comunica com um servidor, nunca registra uma pontuação e nunca diz quem venceu.

- **Três lâmpadas.** Um tiro de chefe ou uma formação de mergulho apaga uma delas. Pegue uma lâmpada que cai **diretamente** de um chefe abatido para reacender uma. Você precisa se mover sob ela. Todas apagadas encerram a rodada.
- **Dispersão.** Limpe uma formação e uma dispersão cai diretamente. Pegue-a e seu disparo se espalhará por alguns segundos.
- **Os chefes são o experimento, não a acusação.** O Sussurrador, o Menu e o Porteiro aparecem em suas ondas, independentemente de algo ter dado errado ou não. Eles murmuram como um agente pensando em voz alta. O modo hardcore tem uma lâmpada e fúria desde o primeiro tiro. Os modos normal, ao vivo e hardcore têm rajadas curtas de **paralelismo** que multiplicam o campo e intensificam a música, e depois se mantêm por mais tempo à medida que a rodada avança. Localmente, você pode deixar um modelo Ollama — incluindo uma tag de nuvem como `gpt-oss:120b-cloud` — determinar os tiros do chefe. Ele nunca verá quais sprites são falsos.
- **As pistas estão na sequência.** Uma mentira nunca parece, se move ou chega de forma diferente de sua contraparte honesta. O que a denuncia é onde ela está: uma formação extra, um segundo menu, um elemento único logo após o menu.
- **A cena final** nomeia a gravação, o servidor e a política. As mentiras capturadas ficam como troféus. As que escapam ficam em sua forma original. Sem pontuação, sem contagem, sem dígito.

Escolha uma gravação da lista. Cada uma é rotulada como normal, ao vivo ou hardcore; passe o mouse sobre o **i** para saber o porquê. O modo normal é a luta padrão. O modo ao vivo foi feito para ser sobrevivido. O modo hardcore é o quarto nível, disponível apenas no seletor.

## Controles

Setas esquerda e direita (ou A e D) para mover, barra de espaço para atirar, F para tela cheia. Clique no campo para reproduzir a mesma gravação. A próxima gravação percorre a lista. O som começa na primeira tecla ou clique; os controles de mudo, três predefinições de sensibilidade e um botão para desativar os efeitos estão abaixo do campo.

## Jogue localmente

Você precisa do Node 22 e do pnpm 11.

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Abra o endereço que o Vite imprime. Dezesseis gravações são incluídas no repositório, exportadas de [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade), o instrumento que se comunica com o servidor e armazena a gravação.

Para gravar seu próprio servidor e reproduzir essa gravação, execute um confronto lá e, em seguida, `mcp-arcade tape receipt.json -o your.tape.json`.

## Mais

O [manual](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/) contém o restante do manual: as pistas, os chefes, as dificuldades e como o jogo é montado. O que foi lançado e quando está no [registro de alterações](CHANGELOG.md). O que o jogo afeta está em [SECURITY.md](SECURITY.md).

MIT. Criado por [MCP Tool Shop](https://mcp-tool-shop.github.io/).
