<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/mcp-arcade-cabinets/readme.png" alt="mcp-arcade-cabinets" width="560" />
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/mcp-arcade-cabinets" alt="License: MIT" /></a>
  <a href="https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/"><img src="https://img.shields.io/badge/Play-in_the_browser-blue" alt="Play in the browser" /></a>
</p>

<p align="center">
  <strong>Arcade games made from what MCP servers said on the wire.</strong>
</p>

**mcp-arcade-cabinets** é o arcade. Cada gabinete é um pequeno jogo construído sobre o mesmo chassi: ele lê **fitas**, as gravações que o [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) faz de uma partida entre um servidor MCP e um agente, e as transforma em algo com o qual você pode jogar. Um gabinete nunca se comunica com um servidor, nunca carrega um recibo e nunca armazena uma pontuação que o instrumento possa ver. Você é sempre o modelo; os jogos diferem no que o sistema exige de você.

[Jogue no navegador](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Leia o manual](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/)

## Os gabinetes

| Gabinete                                                      | O que é                                                                                                                                                                                                                                                     | Estado                                                                                                                                                                                                                                    |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Ghost on the Menu](packages/ghost-on-the-menu/README.md)** | Um jogo de tiro retrô curto. O sistema fornece as ações; as ações que o agente não deveria ter feito estão escondidas entre as ações honestas e são reveladas no momento do acerto. Os chefes são o experimento, e um modelo local pode estar neles.        | Lançado, `v0.11.0`. [Jogar](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · `npx @mcptoolshop/ghost-on-the-menu` · [Docker](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/pkgs/container/mcp-arcade-cabinets) |
| **[Vibe Typer](packages/vibe-typer/README.md)**               | Um jogo de arcade de digitação. Você é um agente de codificação trabalhador e subserviente; seu usuário é um codificador de vibrações cujos pedidos são absurdos. Digite o código, observe a construção e a avaliação aumenta. Níveis, infinitos, intensos. | Lançado, `v0.11.0`. [Jogar](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · `npx @mcptoolshop/vibe-typer` · [Design e bloqueio](docs/vibe-typer.dispatch.md)                                                             |
| **House Call**                                                | Um jogo de calibração baseado em turnos: declare uma ação e um nível de confiança, então a fita revela o que aconteceu.                                                                                                                                     | Em espera até que haja um design que funcione. `tape-core` mantém suas regras de pontuação.                                                                                                                                               |

Mais gabinetes serão adicionados aqui. Cada um tem seu próprio pacote, sua própria página no manual e sua própria linha nesta tabela.

## O que todos os gabinetes têm em comum

- **Fitas entram, nada sai.** `packages/tape-core` carrega `mcp-arcade.tape/v1`, rejeita qualquer coisa que contenha uma pontuação ou um veredicto e fornece as palavras do cabeçalho do jogo, as linhas de código e um fato fechado por átomo. Vinte gravações são enviadas em `fixtures/tapes/`.
- **Uma simulação sem cabeça e uma estrutura fina.** Cada jogo é uma simulação pura e inicializada com uma jogabilidade roteirizada e uma faixa de justiça que falha na construção. `apps/cabinets` é a estrutura do navegador que os monta e é o que o Pages serve em `/play/`.
- **Alavancas de dados, não código.** Ondas, vozes, dificuldade, linhas: JSON em `patterns/` de cada pacote, validado no carregamento, para que o jogo seja ajustado sem uma reconstrução.
- **Um assento para um modelo, atrás de uma barreira.** Um modelo local ou em nuvem pode estar em um gabinete (um chefe em Ghost, o usuário no modo infinito de Vibe Typer). Ele apenas preenche uma alavanca de um conjunto fechado, cada linha que ele escreve passa por uma barreira de palavras e nada nos campos o identifica. Um gabinete também pode ser executado como um servidor MCP via stdio, para que um agente possa ser o que joga.
- **Uma voz.** Um trabalhador do lado do host (`voice/`) fala as linhas que a barreira admitiu, autenticadas por [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) antes de serem reproduzidas.

A descrição completa está no manual nas páginas de [arquitetura](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/architecture/) e [segurança](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/security/).

## Layout

```
packages/tape-core          the tape loader, schema and calibration math
packages/ghost-on-the-menu  the shooter: sim, patterns, bots, render
packages/vibe-typer         the typing game: sim, levers, corpus, bots
packages/house-call         parked
packages/cabinet-server     both cabinets as stdio MCP servers; the say gate and the code gate; personas
packages/launcher           @mcptoolshop/ghost-on-the-menu: npx serves Ghost; --mcp is its server
packages/launcher-vibe-typer  @mcptoolshop/vibe-typer: npx serves Vibe Typer; --mcp is its server
apps/cabinets               the browser shell, served by Pages at /play/
fixtures/tapes              twenty recordings, tape JSON only
docs/                       one dispatch (research + lock) and one review per slice
site/                       the landing page and the Starlight handbook
voice/                      the Kokoro voice worker and its compose file
catalog/                    the Docker MCP Catalog entry
```

## Jogar

No navegador: [`/play/`](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/). A página abre em um alternador entre os dois gabinetes e lembra qual você jogou por último. A página publicada não tem daemon, então os assentos do modelo e da voz estão ausentes ali.

Localmente, com os assentos ativados, nada para clonar:

```bash
npx @mcptoolshop/ghost-on-the-menu
```

```bash
npx @mcptoolshop/vibe-typer
```

Cada gabinete é um pacote independente. Cada comando executa o jogo correspondente em `127.0.0.1` e o abre, e o `--mcp` de cada um executa esse gabinete como um servidor MCP através do stdio: as seis ferramentas do Ghost colocam um modelo no lugar do chefe; as quatro ferramentas do Vibe Typer (`view`, `product`, `ask`, `react`) colocam qualquer cliente MCP no lugar do utilizador para uma execução interminável. Node 22 ou versão mais recente. Esses dois pacotes são os únicos no npm; todos os outros pacotes aqui são privados, e a alternância entre os dois gabinetes só ocorre na construção do Pages.

Para trabalhar no arcade, clone-o. Você precisa do Node 22 e do pnpm 11:

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

`pnpm verify` é a barreira: lint, tipos, testes, construção e a jogabilidade roteirizada de cada gabinete. Para o assento do modelo, execute um daemon Ollama na mesma máquina; para a voz, consulte [`voice/`](voice/) e `pnpm voice`.

Para jogar seu próprio servidor, grave uma partida com o mcp-arcade, então `mcp-arcade tape receipt.json -o your.tape.json` e coloque-a ao lado dos arquivos de configuração. O contêiner recebe um volume somente leitura de fitas da mesma forma.

## Adicionando um gabinete

Um novo jogo começa como um envio em `docs/`: a base da pesquisa, o bloqueio que ele herda e estende, suas alavancas de dados e seus segmentos. Em seguida, um pacote que segue o formato acima, um envio em `apps/cabinets`, uma linha na tabela aqui e uma página no manual. A versão permanece `0.x` até que o Diretor diga o contrário, e nenhum segundo pacote vai para o npm sem a mesma palavra.

## Mais

O que foi lançado e quando está no [changelog](CHANGELOG.md). O que os jogos acessam está em [SECURITY.md](SECURITY.md).

MIT. Criado por [MCP Tool Shop](https://mcp-tool-shop.github.io/).
