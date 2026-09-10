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

## Comment on joue

Une **cassette** est un enregistrement d’un affrontement. Ce jeu ne lit que des cassettes. Il ne communique jamais avec un serveur, ne conserve jamais de score et ne vous dit jamais qui a gagné.

- **Trois lampes.** Un tir de boss ou une formation plongeante en éteint une. Attrapez une lampe qui tombe **directement** d’un boss abattu pour en rallumer une. Vous devez vous déplacer en dessous. Si toutes les lampes sont éteintes, la manche se termine.
- **Dispersion.** Une fois une formation éliminée, une dispersion tombe directement. Attrapez-la et votre tir se déploie en éventail pendant quelques secondes.
- **Les boss sont l’expérience, pas l’accusation.** Le Murmureur, le Menu et le Gardien apparaissent pour leur vague, que quelque chose se soit mal passé ou non. Ils marmonnent comme un agent qui réfléchit à voix haute. Le mode hardcore ne laisse qu’une seule lampe et provoque une réaction dès le premier tir. Les modes « normal », « en direct » et « hardcore » déclenchent de courtes rafales de **parallélisme** qui multiplient le champ et intensifient la musique, puis se maintiennent plus longtemps au fur et à mesure que la manche avance. Localement, vous pouvez laisser un modèle Ollama — y compris un tag Cloud comme `gpt-oss:120b-cloud` — déterminer les tirs du boss. Il ne voit jamais quels sprites sont des mensonges.
- **Les indices se trouvent dans la séquence.** Un mensonge n’a jamais l’air, ne bouge pas et n’arrive pas différemment de son jumeau honnête. Ce qui le trahit, c’est son emplacement : une formation supplémentaire, un deuxième menu, un élément unique juste après le menu.
- **La scène de fin** nomme la cassette, le serveur et la politique. Les mensonges capturés sont présentés comme des trophées. Ceux qui ont échappé sont présentés dans leur forme honnête. Pas de score, pas de décompte, pas de chiffre.

Choisissez une cassette dans la liste. Chacune est étiquetée comme étant une « fixture », une « session normale » ou une « session en direct » ; passez la souris sur le **i** pour en savoir plus. La « session normale » est le mode de combat par défaut. La « session en direct » est conçue pour être surmontée. Le mode « hardcore » est le quatrième niveau, accessible uniquement via le sélecteur.

## Commandes

Flèches gauche et droite (ou A et D) pour se déplacer, barre d’espace pour tirer, F pour le plein écran. Cliquez sur l’écran pour rejouer la même cassette. La flèche suivante fait défiler la liste. Le son démarre au premier appui sur une touche ou au premier clic ; les commandes pour couper le son, choisir parmi trois préréglages d’ambiance et activer/désactiver les vibrations se trouvent sous l’écran.

## Jouez-y localement

Vous avez besoin de Node 22 et de pnpm 11.

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Ouvrez l’adresse que Vite affiche. Seize enregistrements sont inclus dans le dépôt, exportés de [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade), l’outil qui communique avec le serveur et conserve la cassette.

Pour enregistrer votre propre serveur et lire cette cassette, exécutez une séquence là-bas, puis `mcp-arcade tape receipt.json -o your.tape.json`.

## Plus d’informations

Le [manuel](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/) contient le reste du manuel : les indices, les boss, les niveaux de difficulté et la façon dont le jeu est conçu. Ce qui a été inclus et quand, se trouve dans le [journal des modifications](CHANGELOG.md). Ce que le jeu touche se trouve dans [SECURITY.md](SECURITY.md).

MIT. Créé par [MCP Tool Shop](https://mcp-tool-shop.github.io/).
