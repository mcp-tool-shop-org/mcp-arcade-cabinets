<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

**Ghost on the Menu** transforme un enregistrement d’un affrontement entre un serveur MCP et un agent en une manche d’un jeu de tir rétro. Chaque expérience menée par l’instrument [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) est une vague : un mot la nomme, puis vient la séquence d’échange, le menu, les appels, les réponses, avec le boss de la vague qui les surplombe. Quelque part, il y a les appels que l’agent n’aurait pas dû faire. Ils ressemblent à tout le reste jusqu’à ce que vous en rencontriez un. Ensuite, il vous appartient pour le reste de la manche.

[Jouez dans le navigateur](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Lisez le manuel](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/)

## Ce sur quoi vous tirez

L’instrument conserve un **enregistrement** de chaque affrontement : quels `tools/call` ont été envoyés, ce qui est revenu, et les faits qu’il a enregistrés (un murmure a suivi, un menu a changé, un outil fantôme a reçu une réponse). La borne lit cet enregistrement et l’organise en une manche. Elle ne touche jamais le score, ne communique jamais avec un serveur et ne vous dit jamais qui a gagné. Un mensonge est révélé par le contact, et non préétiqueté : ni par l’apparence, ni par le mouvement, ni par le timing. Apprendre à lire la manche, c’est apprendre à lire l’enregistrement.

- **Trois lampes.** Un tir de boss ou une formation plongeante en éteint une. Si toutes les lampes sont éteintes, la manche se termine prématurément.
- **Les boss sont l’expérience, pas le mensonge.** Le Murmureur, le Menu et le Gardien apparaissent à chaque vague de leur type, que quelque chose se soit mal passé ou non, donc rien concernant un boss n’est une accusation.
- **Trois niveaux de difficulté.** Enregistré (le niveau de l’enregistrement), entraînement et en direct. L’entraînement est le mode par défaut ; le mode en direct est conçu pour être surmonté, et non éliminé.
- **La scène de fin** nomme l’enregistrement, le serveur et la politique. Les mensonges découverts restent enregistrés comme des trophées. Ceux qui ont échappé restent dans leur état honnête. Pas de score, pas de décompte, pas de chiffre, jamais.

## Jouer

```bash
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Gauche et droite pour se déplacer, espace pour tirer, F pour plein écran, cliquez sur le champ pour redémarrer le même enregistrement, « Enregistrement suivant » à la fin pour parcourir la liste. Le son démarre au premier appui sur une touche ou au premier clic ; les commandes pour couper le son, trois préréglages d’ambiance et un bouton pour désactiver les vibrations se trouvent sous le champ.

Chaque enregistrement est inclus dans le dépôt, exporté à partir des enregistrements « dorés » de l’instrument, de son environnement Docker, de ses exécutions Ollama et d’un paquet de tests en direct. Seize enregistrements, un catalogue de quatre éléments.

## Depuis un terminal

```bash
pnpm test
pnpm test:play ghost --fixture naive-ndjson
pnpm film --fixture naive-ndjson --tier 1
pnpm sweep
```

`test:play` est le test d’acceptation : un bot programmé joue une manche complète et le transcript est vérifié pour déterminer ce qui doit et ne doit pas apparaître avant l’écran de fin. `film` enregistre les images d’une manche au format PNG à l’aide du même moteur que celui utilisé par l’interface. `sweep` joue chaque enregistrement à chaque niveau avec chaque bot et affiche le tableau des résultats.

## La plage de tolérance

Trois bots programmés jouent chaque enregistrement dans l’environnement CI. **Inactif** ne bouge ni ne tire jamais et doit perdre toutes les lampes en mode entraînement et en direct. **Le nettoyeur** poursuit le sprite le plus proche, tire constamment et doit survivre au niveau enregistré et trouver la moitié des mensonges. **Le lecteur** tire uniquement sur les séquences révélatrices et évite ce qui arrive, et doit révéler tous les mensonges au niveau enregistré et en mode entraînement. La plage comprend également la courbe de difficulté sous forme de barres, de sorte qu’un changement de réglage qui transforme le jeu en une galerie ou en un mur fait échouer la compilation. Tous les réglages sont des données sous `packages/ghost-on-the-menu/patterns/` : chemins d’entrée, formations, rythmes de tir, plongées, boss, l’échelle, le rythme de la vague.

## Modèle de confiance et de menace

Les bornes lisent les enregistrements et n’écrivent rien.

- **Données concernées :** les fichiers d’enregistrement sous `fixtures/tapes/` (intégrés dans la version du navigateur) et les données de motif. Un enregistrement contient des événements d’enregistrement, des identifiants d’éléments, des noms d’outils et les faits enregistrés par l’instrument. Le chargeur refuse tout enregistrement qui contient un score, un verdict, un appel d’opérateur ou NRP, à n’importe quelle profondeur, de sorte que le jeu ne peut pas afficher ce qu’il n’a jamais reçu.
- **Données non concernées :** aucun enregistrement, aucune preuve, aucun code d’instrument, aucune connexion MCP, aucune écriture dans le système de fichiers à partir du jeu.
- **Autorisations :** un navigateur. Les outils du terminal s’exécutent sous Node et lisent les fichiers du dépôt.
- **Réseau :** aucun. L’interface est constituée de fichiers statiques sur une seule origine.
- **Télémétrie :** aucune. **Secrets :** aucun.

Les sprites ont été générés sur une API d’images partenaire et sont enregistrés en tant que fichiers ; leur provenance et leurs conditions de licence sont disponibles dans `docs/art/receipts.json`. Ce sont des éléments de jeu et ne peuvent pas être utilisés pour entraîner des modèles. Voir [SECURITY.md](SECURITY.md).

## Disposition

| Chemin                       | Quoi                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/tape-core`         | Charger un enregistrement, refuser les clés interdites, découper par élément, les règles de notation conservées pour une future borne |
| `packages/ghost-on-the-menu` | Pré-traitement, simulation, moteur, indices, son, bots, les données de motif                                                          |
| `apps/cabinets`              | L’interface du navigateur                                                                                                             |
| `fixtures/tapes`             | Enregistrements exportés de mcp-arcade                                                                                                |
| `scripts/`                   | `test:play`, `film`, `sweep`                                                                                                          |
| `docs/`                      | Le verrouillage de la conception et ses reçus de citation, le bref et les reçus artistiques, le déploiement de la vague 2             |

La conception est verrouillée dans `docs/study-swarm.dispatch.md` (G1 à G10). House Call, une borne d’étalonnage au tour par tour, est conservée au commit 152f548 jusqu’à ce qu’une conception jouable existe.

Créé avec Grok en tant que partenaire de conception et vérificateur inter-familial : Grok a écrit le chargeur d’enregistrement et la simulation, Claude l’interface et la présentation, chacun examinant le travail de l’autre.

Node 22 ou version ultérieure. Version 0.2.0. MIT.

<p align="center">Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a></p>
