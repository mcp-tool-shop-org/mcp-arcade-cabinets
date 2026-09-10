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

**Ghost on the Menu** è un breve sparatutto in stile retrò. Si controlla un’astronave che si muove lungo il bordo inferiore dello schermo. Sopra, viene riprodotto un combattimento registrato tra un server MCP e un agente, che si svolge a ondate: la sequenza di avvio, il menu, le comunicazioni, le risposte e un boss che rappresenta l’esperimento stesso.

Da qualche parte, in questa sequenza, ci sono le comunicazioni che l’agente non avrebbe dovuto inviare. Sembrano uguali a tutte le altre finché non le si intercetta. A quel punto, diventano permanenti per il resto del round.

[Gioca nel browser](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Come interpretare un round](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## Come si gioca

Una **cassetta** è una registrazione di un singolo combattimento. Questo gioco legge solo le cassette. Non comunica mai con un server, non tiene mai il punteggio e non ti dice mai chi ha vinto.

- **Tre lampade.** Un colpo diretto al boss o una formazione a immersione ne spegne una. Afferra una lampada che cade **direttamente verso il basso** da un boss sconfitto per riaccenderne un'altra. Devi muoverti sotto. Quando tutte le lampade si spengono, il round finisce.
- **Formazione diffusa.** Elimina una formazione e una lampada cade direttamente verso il basso. Afferrala e il tuo fuoco si intensificherà per alcuni secondi.
- **I boss sono l'oggetto dell'esperimento, non l'elemento accusatorio.** Il Sussurratore, il Menu e il Portiere appaiono per la loro ondata, indipendentemente dal fatto che qualcosa sia andato storto o meno. Mormorano come un agente che pensa ad alta voce. In modalità Hardcore, c'è una sola lampada e la rabbia si scatena fin dal primo colpo. Localmente, puoi far sì che un modello Ollama determini le azioni del boss; non vedrà mai quali sprite sono false.
- **Gli indizi sono nella sequenza.** Una bugia non appare, non si muove e non arriva in modo diverso dalla sua controparte onesta. Ciò che la rivela è la sua posizione: una formazione extra, un secondo menu, un elemento singolo subito dopo il menu.
- **La scena finale** indica il nome della registrazione, il server e la politica. Le bugie catturate vengono esposte come trofei. Quelle che sono sfuggite mantengono il loro aspetto onesto. Nessun punteggio, nessun conteggio, nessuna cifra.

Scegli una registrazione dall'elenco. Ognuna è etichettata come "fissa", "in movimento" o "in diretta"; passa il mouse sopra la lettera **i** per scoprire il motivo. "In movimento" è l'impostazione predefinita per il combattimento. "In diretta" è pensata per essere superata. La modalità Hardcore è il quarto livello, accessibile solo tramite il selettore.

## Controlli

Sinistra e destra (o A e D) per muoversi, spazio per sparare, F per la modalità a schermo intero. Fai clic sullo schermo per riprodurre la stessa cassetta. Il pulsante “Avanti” fa avanzare l’elenco. Il suono si avvia con il primo tasto o clic; i controlli per disattivare l’audio, i tre preset di sensibilità e un interruttore per disattivare le vibrazioni si trovano sotto lo schermo.

## Gioca in locale

È necessario Node 22 e pnpm 11.

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Apri l’indirizzo che Vite visualizza. Sedici registrazioni sono incluse nel repository, esportate da [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade), lo strumento che comunica con il server e registra la cassetta.

Per registrare il tuo server e riprodurre quella cassetta, esegui un combattimento lì, quindi esegui il comando `mcp-arcade tape receipt.json -o your.tape.json`.

## Altro

Il [manuale](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/) contiene il resto delle istruzioni: gli indizi, i boss, le difficoltà e come è strutturato il gioco. Cosa è stato incluso e quando è indicato nel [registro delle modifiche](CHANGELOG.md). Cosa tocca il gioco è indicato in [SECURITY.md](SECURITY.md).

MIT. Creato da [MCP Tool Shop](https://mcp-tool-shop.github.io/).
