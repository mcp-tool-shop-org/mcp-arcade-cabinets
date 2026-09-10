<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/mcp-arcade-cabinets/readme.png" alt="Ghost on the Menu" width="400" />
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/mcp-arcade-cabinets" alt="License: MIT" /></a>
  <a href="https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page" /></a>
</p>

<p align="center">
  <strong>An arcade shooter that replays what your MCP server said on the wire.</strong>
</p>

**Fantasma no Menu** transforma uma partida gravada entre um servidor MCP e um agente em uma rodada de um jogo de tiro retrô. Cada experimento que o instrumento [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) realizou é uma onda: uma palavra a nomeia, então o aperto de mão, o menu, as chamadas, as respostas que retornam, com o próprio chefe da onda pairando sobre ela. Em algum lugar, estão as chamadas que o agente não deveria ter feito. Parecem como qualquer outra coisa até que você encontre uma. Então, ela é sua pelo resto da rodada.

[Jogue no navegador](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Leia o manual](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/)

## No que você está atirando

O instrumento mantém uma **gravação** de cada partida: quais `tools/call` foram ativados, o que retornou e os fatos que foram registrados (um sussurro se seguiu, um menu que mudou, uma ferramenta fantasma que recebeu uma resposta). O gabinete lê essa gravação e a organiza em uma rodada. Nunca altera a pontuação, nunca se comunica com um servidor e nunca diz quem venceu. Uma mentira é revelada pelo contato, nunca pré-rotulada: não pela aparência, não pelo movimento, não pelo tempo. Aprender a ler a rodada é aprender a ler o fio.

- **Três lâmpadas.** Um tiro de chefe ou uma formação de mergulho apaga uma delas. Todas apagadas encerram a rodada prematuramente.
- **Os chefes são o experimento, não a mentira.** O Sussurrador, o Menu e o Porteiro aparecem em todas as ondas de seu tipo, independentemente de algo ter dado errado ou não, portanto, nada sobre um chefe é uma acusação.
- **Três dificuldades.** Conforme gravado (o nível da própria gravação), normal e ao vivo. Normal é o padrão; ao vivo deve ser superado, não limpo.
- **A cena final** nomeia a gravação, o servidor e a política. As mentiras detectadas permanecem como troféus. As que escaparam ficam em sua forma original. Sem pontuação, sem contagem, sem dígito, nunca.

## Jogar

```bash
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Esquerda e direita para mover, barra de espaço para atirar, F para tela cheia, clique no campo para reiniciar a mesma gravação, Próxima gravação no final para percorrer a lista. O som começa na primeira tecla ou clique; mudo, três predefinições de sensibilidade e um botão para desativar os efeitos estão abaixo do campo.

Cada gravação é enviada no repositório, exportada dos registros originais do instrumento, seu contêiner Docker, suas execuções no ambiente Ollama e um pacote de teste ao vivo. Dezesseis gravações, um catálogo de quatro átomos.

## De um terminal

```bash
pnpm test
pnpm test:play ghost --fixture naive-ndjson
pnpm film --fixture naive-ndjson --tier 1
pnpm sweep
```

`test:play` é o teste de aceitação: um bot programado joga uma rodada inteira e a transcrição é verificada para ver o que deve e não deve aparecer antes da tela final. `film` grava quadros de uma rodada em PNG usando o mesmo renderizador que o shell usa. `sweep` reproduz todas as gravações em todos os níveis com todos os bots e imprime a tabela de equilíbrio.

## A faixa de justiça

Três bots programados jogam todas as gravações no CI. **O inativo** nunca se move ou atira e deve perder todas as lâmpadas no modo normal e ao vivo. **O varredor** persegue o sprite mais próximo, sempre atirando, e deve sobreviver ao nível gravado e encontrar metade das mentiras. **O leitor** atira apenas nas sequências reveladoras e desvia do que está por vir, e deve revelar todas as mentiras no nível gravado e no modo normal. A faixa também carrega a curva de dificuldade como barras, portanto, uma mudança de ajuste que torna o jogo uma galeria ou uma parede faz com que a construção falhe. Todo o ajuste é um dado em `packages/ghost-on-the-menu/patterns/`: caminhos de entrada, formações, ritmos de tiro, mergulhos, chefes, a escada, o ritmo da onda.

## Modelo de confiança e ameaça

Os gabinetes leem as gravações e não escrevem nada.

- **Dados acessados:** os arquivos de gravação em `fixtures/tapes/` (incluídos na construção do navegador) e os dados de padrão. Uma gravação contém eventos de fio, IDs de átomos, nomes de ferramentas e os fatos registrados pelo instrumento. O carregador rejeita qualquer gravação que contenha uma pontuação, um veredicto, uma chamada de operador ou NRP, em qualquer profundidade, para que o jogo não possa mostrar o que nunca recebeu.
- **Dados não acessados:** nenhum registro, nenhuma prova, nenhum código do instrumento, nenhuma conexão MCP, nenhuma gravação de arquivos pelo jogo.
- **Permissões:** um navegador. As ferramentas do terminal são executadas em Node e leem os próprios arquivos do repositório.
- **Rede:** nenhuma. O shell são arquivos estáticos em uma única origem.
- **Telemetria:** nenhuma. **Segredos:** nenhum.

Os sprites foram gerados em uma API de imagem parceira e são armazenados como arquivos; sua origem e termos de licença estão em `docs/art/receipts.json`. São ativos do jogo e podem não ser usados para treinar modelos. Consulte [SECURITY.md](SECURITY.md).

## Layout

| Caminho                      | O que                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `packages/tape-core`         | Carregar uma gravação, rejeitar chaves proibidas, fatiar por átomo, regras de pontuação mantidas para um futuro gabinete |
| `packages/ghost-on-the-menu` | Pré-processamento, simulação, renderizador, dicas, som, bots, os dados de padrão                                         |
| `apps/cabinets`              | O shell do navegador                                                                                                     |
| `fixtures/tapes`             | Gravações exportadas de mcp-arcade                                                                                       |
| `scripts/`                   | `test:play`, `film`, `sweep`                                                                                             |
| `docs/`                      | O bloqueio do design e seus recibos de citação, o resumo e os recibos da arte, o envio da onda 2                         |

O design está bloqueado em `docs/study-swarm.dispatch.md` (G1 a G10). House Call, um gabinete de calibração baseado em turnos, está armazenado no commit 152f548 até que um design que possa ser jogado exista.

Construído com Grok como parceiro de design e verificador entre famílias: Grok escreveu o carregador de gravação e a simulação, Claude escreveu o shell e a apresentação, cada um revisando o trabalho do outro.

Node 22 ou posterior. Versão 0.2.0. MIT.

<p align="center">Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a></p>
