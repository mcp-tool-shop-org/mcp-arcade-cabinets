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
  <strong>You are the agent. The rig hands you the calls.</strong>
</p>

**Ghost on the Menu** è un breve sparatutto in stile retrò, creato sulla base delle informazioni che i server MCP trasmettevano. Sei il modello, inviato nelle profondità della struttura con una lista di compiti. Ogni chiamata è una registrazione di uno scambio tra un server MCP e un agente, e si svolge sopra la tua nave come ondate: la stretta di mano, il menu, le chiamate, le risposte che arrivano e un boss che è l'esperimento stesso.

Da qualche parte, in questa sequenza, ci sono le comunicazioni che l’agente non avrebbe dovuto inviare. Sembrano uguali a tutte le altre finché non le si intercetta. A quel punto, diventano permanenti per il resto del round.

[Gioca nel browser](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Come interpretare un round](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## Inizia il turno

Premi **Shift** e la struttura ti assegna quattro chiamate consecutive, estratte dalla lista e mai ripetute due volte. Ognuna di esse è un server a cui è stato inviato l'agente. Una scheda tra le chiamate indica il server successivo, la politica che l'agente ha seguito e gli strumenti che gli è stato chiesto di utilizzare. Le lampade si ricaricano a ogni chiamata e il fuoco aumenta di chiamata in chiamata, quindi l'ultima chiamata inizia dove è finita la prima.

Alla fine, il turno ha un nome composto da quattro parole, come `frost robin chalk garden`. Digitalo nel menu per ripetere lo stesso turno, oppure passalo a qualcun altro. Nessun numero, nessun conteggio, nessuna classifica: un turno è una lista di compiti, non una tabella dei punteggi.

Scegli una registrazione dall'elenco. Ognuna è etichettata come "fissa", "in movimento" o "in diretta"; passa il mouse sopra la lettera **i** per scoprire il motivo. "In movimento" è l'impostazione predefinita per il combattimento. "In diretta" è pensata per essere superata. La modalità Hardcore è il quarto livello, accessibile solo tramite il selettore.

## Come si gioca

Una **cassetta** è una registrazione di un singolo combattimento. Questo gioco legge solo le cassette. Non comunica mai con un server, non tiene mai il punteggio e non ti dice mai chi ha vinto.

- **Tre lampade.** Un colpo di boss o una formazione di immersione ne spegne una. Afferra una lampada che cade **direttamente** da un boss abbattuto per riaccenderne una. Devi muoverti sotto di essa. Se tutte si spengono, il round finisce.
- **Diffusione.** Elimina una formazione e una diffusione cade direttamente. Afferrala e il tuo fuoco si intensificherà per alcuni secondi.
- **I boss sono l'esperimento, non l'accusa.** Il Sussurratore, il Menu e il Portiere appaiono per la loro ondata, indipendentemente dal fatto che qualcosa sia andato storto o meno. Mormorano come un agente che pensa ad alta voce. La modalità hardcore prevede una sola lampada e rabbia fin dal primo colpo.
- **Il parallelismo esplode.** Le modalità Seat, Live e Hardcore generano esplosioni che moltiplicano il campo con copie autentiche e intensificano il fuoco, e la musica accelera sotto di esse. Iniziano in modo breve e aumentano di ondata in ondata, e durante un turno di chiamata in chiamata. L'aumento è un dato, calibrato su un gruppo di giocatori predefiniti, mai su di te.
- **Gli indizi sono nella sequenza.** Una bugia non appare, non si muove e non arriva in modo diverso dalla sua controparte onesta. Ciò che la rivela è dove si trova: una formazione extra, un secondo menu, un elemento singolo subito dopo il menu.
- **La musica** inizia con una canzone scelta dal seme del round, la mantiene per un paio di minuti, quindi sfuma nella successiva; un boss porta con sé la propria, e un turno trasporta la musica attraverso le sue schede.
- **La scena finale** indica il nome della registrazione, il server e la politica. Le bugie catturate rimangono come trofei. Quelle sfuggite rimangono nel loro aspetto onesto. Nessun punteggio, nessun conteggio, nessun numero.

## Il boss può essere un modello

Locally, an Ollama model, including a Cloud tag like `gpt-oss:120b-cloud`, can sit in the boss. It does not get a prompt to freewheel in. It gets the cabinet's own tools: `fire` (one verb a beat: a fan, a lean and an aimed shot, a held breath, fog, the plate), `say` (a line of its own, through a gate: twelve words, one sentence, no digit, no fact word, no tool or model name; a refused line plays one of the boss's own), `speak`, and read-only `view` and `tapes`. The model proposes; the game decides. It never sees which sprites are lies, and nothing on the field names it.

Con un processo di sintesi vocale in esecuzione, ogni boss parla: la frase originale quando arriva e le frasi che il modello scrive. Ogni registrazione viene riascoltata da un sistema di riconoscimento vocale e convalidata da [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) prima di essere riprodotta, in modo che le parole pronunciate siano le parole che il sistema ha accettato, senza invenzioni o errori. Una registrazione che non supera la convalida rimane silenziosa.

Il sistema è esso stesso un server MCP su stdio, con gli stessi sei strumenti, in modo che lo strumento possa riprodurre il menu originale del Ghost; quattro delle registrazioni nel repository sono registrazioni del sistema stesso.

```bash
docker run -i --rm ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.6.0
```

Un singolo file compresso su `node:22-alpine` con il contratto degli strumenti e le registrazioni incluse; elenca i suoi strumenti in una frazione di secondo con un singolo processore e due gigabyte e non necessita di una rete per essere eseguito. La voce del catalogo Docker MCP è in fase di bozza sotto `catalog/`.

## Controlli

Sinistra e destra (o A e D) per muoversi, spazio per sparare, F per schermo intero. Clicca sul campo per riprodurre la stessa traccia. La traccia successiva scorre l'elenco. Il suono inizia alla prima pressione di un tasto o al primo clic; sotto il campo sono presenti i controlli per disattivare l'audio, tre preimpostazioni di sensibilità e un interruttore per disattivare le vibrazioni. I **boss Ollama** e la funzione **Voice** sono posizionati accanto, con un selettore di modelli e delle parole che indicano cosa sta facendo ogni boss.

## Gioca in locale

È necessario Node 22 e pnpm 11.

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Apri l’indirizzo che Vite visualizza. Sedici registrazioni sono incluse nel repository, esportate da [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade), lo strumento che comunica con il server e registra la cassetta.

Per il boss, esegui un daemon Ollama sulla stessa macchina e seleziona **Ollama bosses**. Per la funzione vocale, crea un ambiente virtuale Python 3.12 in `.venv` con `kokoro-onnx`, `faster-whisper` e `fx-dub`, punta `KOKORO_DIR` ai pesi Kokoro ONNX ed esegui `pnpm voice` in una seconda finestra del terminale; la casella **Voice** si attiva quando il processo risponde. Nessuno dei due è necessario per la riproduzione; il sito pubblicato non li include.

Per registrare il tuo server e riprodurre quella cassetta, esegui un combattimento lì, quindi esegui il comando `mcp-arcade tape receipt.json -o your.tape.json`.

## Altro

Il [manuale](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/) contiene il resto delle istruzioni: gli indizi, i boss, le difficoltà e come è strutturato il gioco. Cosa è stato incluso e quando è indicato nel [registro delle modifiche](CHANGELOG.md). Cosa tocca il gioco è indicato in [SECURITY.md](SECURITY.md).

MIT. Creato da [MCP Tool Shop](https://mcp-tool-shop.github.io/).
