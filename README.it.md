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

Premi **Shift** e il sistema ti fornirà quattro azioni consecutive, scelte dalla lista e mai le stesse due volte. Ognuna di esse rappresenta un server in cui l'agente è stato inviato, e ogni azione si svolge in una stanza diversa: una situazione di pressione, un'area da difendere, un momento di riposo, quindi un momento di massima intensità. Una carta tra queste indica il server successivo, la strategia, gli strumenti che l'agente deve utilizzare e la descrizione della sfida — una stretta di mano d'acciaio, una barriera che divide la corsia, un momento di riposo tra le fasi di massima intensità, una parete di cataloghi color ocra. Le lampade si ricaricano ad ogni azione. Il fuoco continua a crescere di azione in azione; l'aumento è di intensità, non una nuova storia.

Alla fine, il turno ha un nome composto da quattro parole, come `frost robin chalk garden`. Digitalo nel menu per ripetere lo stesso turno, oppure passalo a qualcun altro. Nessun numero, nessun conteggio, nessuna classifica: un turno è una lista di compiti, non una tabella dei punteggi.

Scegli una registrazione dall'elenco. Ognuna è etichettata come "fissa", "in movimento" o "in diretta"; passa il mouse sopra la lettera **i** per scoprire il motivo. "In movimento" è l'impostazione predefinita per il combattimento. "In diretta" è pensata per essere superata. La modalità Hardcore è il quarto livello, accessibile solo tramite il selettore.

## Come si gioca

Una **cassetta** è una registrazione di un singolo combattimento. Questo gioco legge solo le cassette. Non comunica mai con un server, non tiene mai il punteggio e non ti dice mai chi ha vinto.

- **Tre lampade.** Un colpo del boss o una formazione di attacco ne spegne una. Afferra una lampada che cade **direttamente** da un boss sconfitto per riaccenderla. Devi muoverti sotto di essa. Se tutte le lampade si spengono, il round termina.
- **Dispersione.** Elimina una formazione e una dispersione cade direttamente. Afferrala e il tuo fuoco si intensificherà per alcuni secondi.
- **I boss sono l'esperimento, non l'accusa.** Il Sussurratore, il Menu e il Portiere appaiono per la loro ondata, indipendentemente dal fatto che qualcosa sia andato storto o meno. Durante un turno, l'ispezione si conclude con l'Archivista (una parete di cataloghi). Mormorano come un agente che pensa ad alta voce. La modalità hardcore prevede una sola lampada e furia fin dal primo colpo.
- **Il parallelismo esplode.** Le modalità Seat, Live e Hardcore generano raffiche che moltiplicano il campo con copie fedeli e intensificano il fuoco, e la musica accelera. Iniziano in modo breve e aumentano di intensità di ondata in ondata, e durante un turno, di azione in azione. L'aumento è di dati, calibrato su un gruppo di giocatori predefiniti, mai su di te.
- **Gli indizi sono nella sequenza.** Una bugia non appare, non si muove e non arriva in modo diverso dalla sua controparte onesta. Ciò che la rivela è dove si trova: una formazione extra, un secondo menu, un elemento singolo subito dopo il menu. Durante un turno, elementi aggiuntivi possono unirsi alla stanza: una sonda che si muove rapidamente, una barriera che divide la corsia, un registro impilato, ma condividono comunque la loro controparte onesta finché non li colpisci.
- **La musica** segue la carta, ma una canzone ha un solo ciclo (circa mezz'ora) prima di cambiare. Il veleno vuole ancora il veleno; il Sussurratore vuole ancora il Sussurratore. I letti si trovano sotto i colpi e l'azione di afferrare; il silenzio uccide tutto insieme. Un turno fa proseguire la musica attraverso le sue carte.
- **La scena finale** indica la traccia, il server e la strategia. Le bugie catturate rimangono come trofei. Quelle sfuggite rimangono nel loro aspetto onesto. Nessun punteggio, nessun conteggio, nessuna cifra.

## Il boss può essere un modello

Localmente, un modello Ollama, incluso un tag Cloud come `gpt-oss:120b-cloud`, può essere presente nel boss. Non riceve un prompt per agire liberamente. Riceve gli strumenti del sistema: `fire` (un verbo per ogni battuta: un ventaglio, un movimento laterale e un colpo mirato, un respiro trattenuto, nebbia, la piastra), `say` (una sua linea, attraverso un cancello: dodici parole, una frase, nessuna cifra, nessuna parola che indichi un fatto, nessun nome di strumento o modello; una linea rifiutata riproduce una delle linee del boss), `speak` e `view` e `tapes` in sola lettura. Potrebbe anche mettere in coda le prossime azioni legali dopo la battuta; una risposta interrotta è lo script, mai un blocco. Il selezionatore scrive una linea di libreria chiusa dopo il fuoco. Il modello propone; il gioco decide. Non vede quali sprite sono bugie e nulla nel campo lo identifica. Il sito pubblicato non ha un demone, quindi omette il componente Ollama e Voice.

Con un processo di sintesi vocale in esecuzione, ogni boss parla: la frase originale quando arriva e le frasi che il modello scrive. Ogni registrazione viene riascoltata da un sistema di riconoscimento vocale e convalidata da [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) prima di essere riprodotta, in modo che le parole pronunciate siano le parole che il sistema ha accettato, senza invenzioni o errori. Una registrazione che non supera la convalida rimane silenziosa.

Il sistema è esso stesso un server MCP su stdio, con gli stessi sei strumenti, in modo che lo strumento possa riprodurre il menu originale del Ghost; quattro delle registrazioni nel repository sono registrazioni del sistema stesso.

```bash
docker run -i --rm ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.7.0
```

Un singolo file compresso su `node:22-alpine` con il contratto degli strumenti e le tracce integrate; elenca i suoi strumenti in una frazione di secondo con una sola CPU e due gigabyte e non necessita di una rete per funzionare. Un volume opzionale in sola lettura può sovrapporre tracce operative aggiuntive oltre a quelle venti. L'elenco del catalogo è silenzioso (nessuna rete, nessun audio nell'immagine). La voce del catalogo Docker MCP è redatta sotto `catalog/`. La composizione solo per l'host per un'immagine locale è disponibile all'indirizzo `voice/compose.host.yaml`.

## Controlli

Sinistra e destra (o A e D) per muoversi, spazio per sparare, F per la modalità schermo intero. Fai clic sul campo per riprodurre la stessa traccia. La traccia successiva scorre la lista; in un turno, "Prossima azione" seleziona la carta successiva. Il suono inizia con il primo tasto o clic; il silenzio, tre preimpostazioni di sensazione e un interruttore per disattivare le vibrazioni si trovano sotto il campo. La difficoltà è impostata nella riga "Play" (la modalità hardcore prevede una sola lampada e piastre che cadono). Localmente, i **boss Ollama** e **Voice** si trovano accanto, con un selezionatore di modelli e parole che indicano cosa sta facendo ogni elemento. La pagina pubblicata `/play/` è il campo, il suono, la sensazione, le vibrazioni e la difficoltà.

## Gioca in locale

Un singolo comando, niente da clonare:

```bash
npx @mcptoolshop/ghost-on-the-menu
```

Questo avvia il sistema su `127.0.0.1` e lo apre. A differenza della pagina pubblicata, questo può raggiungere un demone Ollama e un worker vocale sulla tua macchina, quindi gli elementi si illuminano. `--mcp` esegue lo stesso sistema come server MCP tramite stdio, in modo che un agente possa giocarci; `--help` elenca il resto. Node 22 o successivo, e nient'altro.

Per lavorarci, clonalo: hai bisogno di Node 22 e pnpm 11:

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
