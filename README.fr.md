<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

**Ghost on the Menu** est un court jeu de tir rétro. Vous pilotez un vaisseau le long du bas de l’écran. Au-dessus de vous, une séquence enregistrée d’un affrontement entre un serveur MCP et un agent se déroule en vagues : la phase d’échange, le menu, les appels, les réponses, et un boss qui est l’expérience elle-même.

Quelque part, il y a les appels que l’agent n’aurait pas dû faire. Ils ressemblent à tout le reste jusqu’à ce que vous en touchiez un. Ensuite, il vous appartient pour le reste de la manche.

[Jouez-y dans votre navigateur](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Comment lire une manche](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## Comment y jouer

Une **cassette** est un enregistrement d’un affrontement. Ce jeu ne lit que des cassettes. Il ne communique jamais avec un serveur, ne conserve jamais de score et ne vous dit jamais qui a gagné.

- **Three lamps.** A boss shot or a diving formation puts one out. Catch a lamp that falls **straight down** from a downed boss to relight one. You have to move under it. All out ends the round.
- **Spread.** Clear a formation and a spread falls straight down. Catch it and your fire fans for a few seconds.
- **Bosses are the experiment, not the accusation.** The Whisperer, the Menu and the Doorman show up for their wave whether or not anything went wrong. They mutter like an agent thinking out loud. Hardcore is one lamp and rage from the first shot. Seat, live and hardcore get short **parallelism** bursts that multiply the field and heat the music, then hold longer as the round goes on. Locally, you can let an Ollama model — including a Cloud tag like `gpt-oss:120b-cloud` — sit in the boss: it calls each boss’s shots (a fan, a lean and an aimed shot, a held breath, fog, the plate) and picks which of the boss’s own lines it says. It never sees which sprites are lies.
- **The tells are in the sequence.** A lie never looks, moves or arrives differently from its honest twin. What gives it away is where it sits: an extra formation, a second menu, a singleton right after the menu.
- **The end scene** names the tape, the server and the policy. Caught lies sit as trophies. Escaped ones sit in their honest paint. No score, no count, no digit.

Choisissez une cassette dans la liste. Chacune est étiquetée « fixture », « seat » ou « live » ; passez la souris sur **i** pour en savoir plus. « Seat » est le mode de combat par défaut. « Live » est conçu pour être surmonté. « Hardcore » est le quatrième niveau, accessible uniquement via le sélecteur.

## Commandes

Flèches gauche et droite (ou A et D) pour se déplacer, espace pour tirer, F pour le plein écran. Cliquez sur l’écran pour rejouer la même cassette. La touche suivante permet de passer à la cassette suivante. Le son démarre lors de la première pression de touche ou du premier clic ; les options de désactivation du son, les trois préréglages d’ambiance et un bouton pour désactiver les tremblements se trouvent sous l’écran.

## Jouez-y localement

Vous avez besoin de Node 22 et de pnpm 11.

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Ouvrez l’adresse que Vite affiche. Seize enregistrements sont inclus dans le dépôt, exportés de [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade), l’instrument qui communique avec le serveur et conserve la cassette.

Pour enregistrer votre propre serveur et lire cette cassette, exécutez une séquence là-bas, puis `mcp-arcade tape receipt.json -o your.tape.json`.

## Plus d’informations

Le [manuel](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/) contient le reste du manuel : les indices, les boss, les difficultés et la façon dont le jeu est conçu. Ce qui a été inclus et quand est indiqué dans le [journal des modifications](CHANGELOG.md). Ce que le jeu touche est indiqué dans [SECURITY.md](SECURITY.md).

MIT. Créé par [MCP Tool Shop](https://mcp-tool-shop.github.io/).
