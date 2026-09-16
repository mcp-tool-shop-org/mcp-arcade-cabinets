<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

**mcp-arcade-cabinets** è l'area giochi. Ogni cabinato è un piccolo gioco basato sullo stesso telaio: legge le **cassette**, le registrazioni che [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) conserva di un incontro tra un server MCP e un agente, e le trasforma in qualcosa con cui puoi giocare. Un cabinato non comunica mai con un server, non carica mai una ricevuta e non memorizza mai un punteggio che lo strumento potrebbe visualizzare. Tu sei sempre il modello; i giochi differiscono per ciò che il sistema richiede.

[Giocalo nel browser](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Leggi il manuale](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/)

## I cabinati

| Cabinato                                                      | Cos'è                                                                                                                                                                                                                                                                                        | Stato                                                                                                                                                                                                                                        |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Ghost on the Menu](packages/ghost-on-the-menu/README.md)** | Un breve sparatutto in stile retrò. Il sistema ti fornisce le azioni; le azioni che l'agente non avrebbe dovuto compiere sono nascoste tra quelle corrette e vengono rivelate al momento dell'impatto. I boss sono l'esperimento e un modello locale può essere posizionato al loro interno. | Rilasciato, `v0.11.0`. [Gioca](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · `npx @mcptoolshop/ghost-on-the-menu` · [Docker](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/pkgs/container/mcp-arcade-cabinets) |
| **[Vibe Typer](packages/vibe-typer/README.md)**               | Un gioco arcade di digitazione. Sei un agente di codifica laborioso e servile; il tuo utente è un creatore di "vibe" le cui richieste sono assurde. Digita il codice, osserva la creazione e guarda il valore aumentare. Livelli, infiniti, impegnativi.                                     | Rilasciato, `v0.11.0`. [Gioca](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · `npx @mcptoolshop/vibe-typer` · [Progettazione e blocco](docs/vibe-typer.dispatch.md)                                                        |
| **House Call**                                                | Un gioco di calibrazione a turni: indica un'azione e un livello di confidenza, quindi la registrazione rivela cosa è successo.                                                                                                                                                               | In attesa finché non sarà disponibile un design che lo supporti. `tape-core` mantiene le sue regole di punteggio.                                                                                                                            |

Altri cabinati saranno aggiunti qui. Ognuno avrà il suo pacchetto, la sua pagina nel manuale e la sua riga in questa tabella.

## Cosa hanno in comune tutti i cabinati

- **Cassette in entrata, niente in uscita.** `packages/tape-core` carica `mcp-arcade.tape/v1`, rifiuta qualsiasi cosa che contenga un punteggio o un risultato e fornisce al gioco le parole dell'intestazione, le righe di codice e un singolo dato per ogni elemento. Vengono fornite venti registrazioni in `fixtures/tapes/`.
- **Una simulazione senza interfaccia e un guscio sottile.** Ogni gioco è una simulazione pura e predefinita con una sequenza di gioco predefinita e una fascia di tolleranza che causa l'errore nella compilazione. `apps/cabinets` è il guscio del browser che li monta ed è ciò che Pages serve all'indirizzo `/play/`.
- **Leve di dati, non codice.** Onde, voci, difficoltà, righe: JSON all'interno del `patterns/` di ogni pacchetto, convalidato al caricamento, in modo che il gioco possa essere regolato senza una nuova compilazione.
- **Un posto per un modello, dietro un cancello.** Un modello locale o cloud può essere posizionato in un cabinato (un boss in Ghost, l'utente nella modalità infinita di Vibe Typer). Questo riempie sempre una leva da un set chiuso, ogni riga che scrive supera un filtro di parole e nulla sul campo lo identifica. Un cabinato può anche essere eseguito come server MCP tramite stdio, in modo che l'agente possa essere colui che gioca.
- **Una voce.** Un worker lato host (`voice/`) pronuncia le righe che il cancello ha ammesso, verificate da [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) prima che vengano riprodotte.

La descrizione completa è disponibile nelle pagine [architettura](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/architecture/) e [sicurezza](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/security/) del manuale.

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

## Gioca

Nel browser: [`/play/`](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/). La pagina si apre con un interruttore tra i due cabinati e ricorda quale hai giocato l'ultima volta. La pagina pubblicata non ha daemon, quindi i posti per il modello e la voce sono assenti.

Localmente, con i posti attivati, non è necessario clonare nulla:

```bash
npx @mcptoolshop/ghost-on-the-menu
```

```bash
npx @mcptoolshop/vibe-typer
```

Ogni cabinet è un pacchetto a sé stante. Ogni comando avvia il gioco corrispondente su `127.0.0.1` e lo apre, e il `--mcp` di ciascuno di essi esegue quel cabinet come server MCP tramite stdio: i sei strumenti di Ghost inseriscono un modello nel ruolo del boss; i quattro strumenti di Vibe Typer (`view`, `product`, `ask`, `react`) inseriscono qualsiasi client MCP nella posizione dell’utente per un ciclo infinito. Versione Node 22 o successiva. Questi due pacchetti sono gli unici disponibili su npm; tutti gli altri pacchetti presenti sono privati e il passaggio tra i due cabinet avviene solo durante la fase di build di Pages.

Per lavorare sull'area giochi, clonala. Hai bisogno di Node 22 e pnpm 11:

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

`pnpm verify` è il cancello: lint, tipi, test, compilazione e la sequenza di gioco predefinita di ogni cabinato. Per il posto del modello, esegui un daemon Ollama sulla stessa macchina; per la voce, consulta [`voice/`](voice/) e `pnpm voice`.

Per eseguire il tuo server, registra un incontro con mcp-arcade, quindi `mcp-arcade tape receipt.json -o your.tape.json` e posizionalo accanto agli elementi di configurazione. Il container accetta una directory di sola lettura contenente le cassette nello stesso modo.

## Aggiunta di un cabinato

Un nuovo gioco inizia come un elemento di configurazione in `docs/`: la base della ricerca, il blocco che eredita ed estende, le sue leve di dati e le sue sezioni. Quindi un pacchetto che segue la struttura sopra, un elemento di configurazione in `apps/cabinets`, una riga nella tabella qui e una pagina nel manuale. La versione rimane `0.x` finché il Direttore non dirà diversamente e nessun secondo pacchetto viene pubblicato su npm senza la stessa parola.

## Altro

Cosa è stato rilasciato e quando è indicato nel [changelog](CHANGELOG.md). Cosa toccano i giochi è indicato in [SECURITY.md](SECURITY.md).

MIT. Creato da [MCP Tool Shop](https://mcp-tool-shop.github.io/).
