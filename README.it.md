<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

**Ghost on the Menu** è uno sparatutto retrò. Si controlla un’astronave che si muove nella parte inferiore dello schermo. Sopra, viene riprodotto un combattimento tra un server MCP e un agente, che si svolge a ondate: la stretta di mano, il menu, le comunicazioni, le risposte e un boss che è l’esperimento stesso.

Da qualche parte, ci sono le comunicazioni che l’agente non avrebbe dovuto fare. Sembrano come tutte le altre finché non se ne colpisce una. A quel punto, sarà a disposizione per il resto del round.

[Gioca nel browser](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Come interpretare un round](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## Come si gioca

Una **cassetta** è una registrazione di un singolo combattimento. Questo gioco legge solo le cassette. Non comunica mai con un server, non tiene mai il punteggio e non ti dice mai chi ha vinto.

- **Tre lampade.** Un colpo di boss o una formazione di attacco ne spegne una. Per riaccenderne una, bisogna prendere una lampada che cade **direttamente** da un boss abbattuto. Bisogna muoversi sotto di essa. Se tutte e tre si spengono, il round termina.
- **Formazione diffusa.** Quando una formazione viene eliminata, una formazione diffusa cade direttamente. Bisogna prenderla e, per alcuni secondi, il fuoco si amplificherà.
- **I boss sono l’esperimento, non l’accusa.** Il Sussurratore, il Menu e il Portiere appaiono per la loro ondata, indipendentemente dal fatto che qualcosa sia andato storto o meno. Mormorano come un agente che pensa ad alta voce. La modalità hardcore prevede una sola lampada e rabbia fin dal primo colpo. Le modalità "seat" e "live" offrono brevi raffiche di **parallelismo** che moltiplicano lo schermo e intensificano la musica, per poi durare più a lungo man mano che il round procede. Localmente, è possibile far sì che un modello Ollama determini i colpi del boss; il modello non vedrà mai quali sprite sono falsi.
- **Gli indizi sono nella sequenza.** Una falsità non appare, non si muove e non arriva mai in modo diverso dalla sua controparte onesta. Ciò che la rivela è la sua posizione: una formazione extra, un secondo menu, un elemento singolo subito dopo il menu.
- **La scena finale** indica il nome della cassetta, del server e della politica. Le falsità catturate vengono esposte come trofei. Quelle che sono sfuggite rimangono nel loro aspetto onesto. Nessun punteggio, nessun conteggio, nessuna cifra.

Scegli una cassetta dall’elenco. Ognuna è etichettata come "fixture", "seat" o "live"; passa il mouse sopra l’icona **i** per scoprire il motivo. "Seat" è la modalità di combattimento predefinita. "Live" è pensata per essere superata. "Hardcore" è il quarto livello, disponibile solo dal selettore.

## Controlli

Tasti freccia sinistra e destra (o A e D) per muoversi, barra spaziatrice per sparare, F per schermo intero. Clicca sullo schermo per riprodurre la stessa cassetta. Il tasto successivo fa avanzare l’elenco. Il suono si avvia con il primo tasto o clic; i controlli per disattivare l’audio, scegliere tra tre preset di sensibilità e attivare/disattivare le vibrazioni si trovano sotto lo schermo.

## Gioca in locale

Sono necessari Node 22 e pnpm 11.

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Apri l’indirizzo che Vite stampa. Nel repository sono presenti sedici registrazioni, esportate da [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade), lo strumento che comunica con il server e conserva la cassetta.

Per registrare il proprio server e riprodurre quella cassetta, esegui un combattimento lì, quindi esegui il comando `mcp-arcade tape receipt.json -o your.tape.json`.

## Altro

Il [manuale](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/) contiene il resto delle istruzioni: gli indizi, i boss, le difficoltà e come è strutturato il gioco. Cosa è stato rilasciato e quando è indicato nel [changelog](CHANGELOG.md). Cosa tocca il gioco è indicato in [SECURITY.md](SECURITY.md).

MIT. Creato da [MCP Tool Shop](https://mcp-tool-shop.github.io/).
