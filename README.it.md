<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

**Ghost on the Menu** trasforma una registrazione di un confronto tra un server MCP e un agente in un round di uno sparatutto retrò. Ogni esperimento eseguito dallo strumento [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) è un'ondata: una parola la nomina, poi la stretta di mano, il menu, le chiamate, le risposte che arrivano, con il boss dell'ondata che veglia su di essa. Da qualche parte, ci sono le chiamate che l'agente non avrebbe dovuto fare. Sembrano come tutto il resto finché non ne colpisci una. A quel punto, è tua per il resto del round.

[Giocalo nel browser](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Leggi il manuale](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/)

## A cosa stai sparando

Lo strumento conserva una **registrazione** di ogni confronto: quali `tools/call` sono stati attivati, cosa è tornato e i fatti che ha fissato sul filo (seguì un sussurro, un menu che è cambiato, uno strumento fantasma a cui è stata data una risposta). La console legge quella registrazione e la organizza in un round. Non tocca mai il punteggio, non parla mai con un server e non ti dice mai chi ha vinto. Una bugia viene rivelata attraverso il contatto, non etichettata in anticipo: non dall'aspetto, non dal movimento, non dalla tempistica. Imparare a leggere il round significa imparare a leggere il filo.

- **Tre lampade.** Un colpo del boss o una formazione di immersione ne spegne una. Quando tutte e tre sono spente, il round termina prematuramente.
- **I boss sono l'esperimento, non la bugia.** Il Sussurratore, il Menu e il Portiere appaiono per ogni ondata del loro tipo, indipendentemente dal fatto che qualcosa sia andato storto o meno, quindi nulla riguardo a un boss è un'accusa.
- **Tre livelli di difficoltà.** Come registrato (il livello della registrazione), simulazione e in diretta. Simulazione è l'impostazione predefinita; in diretta è progettato per essere superato, non completato.
- **La scena finale** nomina la registrazione, il server e la politica. Le bugie scoperte rimangono parcheggiate come trofei. Quelle evitate rimangono nel loro aspetto onesto. Nessun punteggio, nessun conteggio, nessuna cifra, mai.

## Gioca

```bash
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Sinistra e destra per muoversi, spazio per sparare, F per schermo intero, fai clic sul campo per riavviare la stessa registrazione, "Registrazione successiva" alla fine per scorrere l'elenco delle registrazioni. Il suono si avvia alla prima pressione di un tasto o al primo clic; i controlli per disattivare l'audio, tre preimpostazioni di sensazione e un interruttore per disattivare le vibrazioni si trovano sotto il campo.

Ogni registrazione viene fornita nel repository, esportata dalle ricevute dorate dello strumento, dal suo ambiente Docker, dalle sue esecuzioni in ambiente simulato Ollama e da un pacchetto di test in diretta. Sedici registrazioni, un catalogo di quattro elementi.

## Da un terminale

```bash
pnpm test
pnpm test:play ghost --fixture naive-ndjson
pnpm film --fixture naive-ndjson --tier 1
pnpm sweep
```

`test:play` è il test di accettazione: un bot programmato gioca un intero round e la trascrizione viene controllata per verificare cosa deve e cosa non deve apparire prima della schermata finale. `film` scrive i fotogrammi di un round in formato PNG utilizzando lo stesso motore di rendering utilizzato dalla shell. `sweep` riproduce ogni registrazione a ogni livello con ogni bot e stampa la tabella dei risultati.

## La fascia di equità

Tre bot programmati riproducono ogni registrazione in CI. **Inattivo** non si muove né spara e deve perdere ogni lampada in modalità simulazione e in diretta. **Lo spazzino** insegue lo sprite più vicino, sparando sempre, e deve sopravvivere al livello registrato e trovare metà delle bugie. **Il lettore** spara solo alle sequenze rivelatrici e schiva ciò che sta arrivando, e deve rivelare ogni bugia nel livello registrato e in modalità simulazione. La fascia include anche la curva di difficoltà sotto forma di barre, quindi una modifica delle impostazioni che rende il gioco una galleria o un muro fa fallire la build. Tutte le impostazioni sono dati sotto `packages/ghost-on-the-menu/patterns/`: percorsi di ingresso, formazioni, ritmi di fuoco, immersioni, boss, la scala, il ritmo dell'ondata.

## Modello di fiducia e di minaccia

Le console leggono le registrazioni e non scrivono nulla.

- **Dati toccati:** i file di registrazione sotto `fixtures/tapes/` (inclusi nella build del browser) e i dati di pattern. Una registrazione contiene eventi del filo, ID degli elementi, nomi degli strumenti e i fatti fissati dallo strumento. Il caricatore rifiuta qualsiasi registrazione che contenga un punteggio, un verdetto, una chiamata operatore o NRP, a qualsiasi livello, quindi il gioco non può mostrare ciò che non gli è stato fornito.
- **Dati non toccati:** nessuna ricevuta, nessuna prova, nessun codice dello strumento, nessuna connessione MCP, nessuna scrittura sul file system da parte del gioco.
- **Autorizzazioni:** un browser. Gli strumenti del terminale vengono eseguiti sotto Node e leggono gli elementi del repository.
- **Rete:** nessuna. La shell è costituita da file statici su un'unica origine.
- **Telemetria:** nessuna. **Segreti:** nessuno.

Gli sprite sono stati generati su un'API di immagini partner e sono inclusi come file; la loro provenienza e i termini di licenza sono in `docs/art/receipts.json`. Sono risorse di gioco e potrebbero non essere utilizzati per addestrare modelli. Vedi [SECURITY.md](SECURITY.md).

## Layout

| Percorso                     | Cosa                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/tape-core`         | Carica una registrazione, rifiuta le chiavi proibite, suddivide per elemento, le regole di punteggio sono conservate per una console futura |
| `packages/ghost-on-the-menu` | Pre-passaggio, simulazione, motore di rendering, indizi, suono, bot, i dati di pattern                                                      |
| `apps/cabinets`              | La shell del browser                                                                                                                        |
| `fixtures/tapes`             | Registrazioni esportate da mcp-arcade                                                                                                       |
| `scripts/`                   | `test:play`, `film`, `sweep`                                                                                                                |
| `docs/`                      | Il blocco del design e le relative ricevute, il brief artistico e le ricevute, la spedizione dell'ondata 2                                  |

Il design è bloccato in `docs/study-swarm.dispatch.md` (da G1 a G10). House Call, una console di calibrazione a turni, è parcheggiata al commit 152f548 fino a quando non sarà disponibile un design che possa essere giocato.

Creato con Grok come partner di progettazione e verificatore tra famiglie: Grok ha scritto il caricatore di registrazioni e la simulazione, Claude ha scritto la shell e la presentazione, ciascuno rivedendo il lavoro dell'altro.

Node 22 o successivo. Versione 0.2.0. MIT.

<p align="center">Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a></p>
