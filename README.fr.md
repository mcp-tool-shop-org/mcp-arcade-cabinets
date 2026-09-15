<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

**mcp-arcade-cabinets** est l’arcade. Chaque borne est un petit jeu construit sur le même châssis : elle lit des **cassettes**, les enregistrements que [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) conserve d’un affrontement entre un serveur MCP et un agent, et les transforme en quelque chose auquel vous pouvez jouer. Une borne ne communique jamais avec un serveur, ne charge jamais de données de score et ne conserve jamais de score que l’instrument pourrait voir. Vous êtes toujours le modèle ; les jeux diffèrent en fonction de ce que le système vous demande.

[Jouer dans le navigateur](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Manuel](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/)

## Les bornes

| Borne                                                         | Ce que c’est                                                                                                                                                                                                                                                                | État                                                                                                                                                                                                                                    |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Ghost on the Menu](packages/ghost-on-the-menu/README.md)** | Un court jeu de tir rétro. Le système vous fournit les actions ; les actions que l’agent n’aurait pas dû effectuer sont cachées parmi les actions légitimes et se révèlent lors de l’impact. Les boss sont l’expérience, et un modèle local peut y être placé.              | Publié, `v0.9.0`. [Jouer](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · `npx @mcptoolshop/ghost-on-the-menu` · [Docker](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/pkgs/container/mcp-arcade-cabinets) |
| **[Vibe Typer](packages/vibe-typer/README.md)**               | Un jeu d’arcade de saisie. Vous êtes un agent de codage travailleur et obséquieux ; votre utilisateur est un codeur de « vibe » dont les demandes sont absurdes. Tapez le code, regardez la création se construire et l’évaluation augmenter. Niveaux, infinis, difficiles. | Publié, `v0.9.0`. [Jouer](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · `npx @mcptoolshop/ghost-on-the-menu` · [Conception et verrouillage](docs/vibe-typer.dispatch.md)                                             |
| **House Call**                                                | Un jeu d’étalonnage au tour par tour : indiquez une action et un niveau de confiance, puis la cassette révèle ce qui s’est passé.                                                                                                                                           | En attente jusqu’à ce qu’une conception qui fonctionne soit disponible. `tape-core` conserve ses règles de notation.                                                                                                                    |

D’autres bornes seront ajoutées ici. Chacune aura son propre package, sa propre page dans le manuel et sa propre ligne dans ce tableau.

## Ce que toutes les bornes ont en commun

- **Des cassettes en entrée, rien en sortie.** `packages/tape-core` charge `mcp-arcade.tape/v1`, rejette tout ce qui contient un score ou un verdict, et fournit les mots d’en-tête du jeu, les lignes de câblage et un seul fait concret par atome. Vingt enregistrements sont inclus dans `fixtures/tapes/`.
- **Une simulation sans tête et une interface simplifiée.** Chaque jeu est une simulation pure et initialisée avec un déroulement scripté et une plage de tolérance qui fait échouer la construction. `apps/cabinets` est l’interface du navigateur qui les monte et c’est ce que Pages sert à `/play/`.
- **Des leviers de données, pas de code.** Ondes, voix, difficulté, lignes : JSON dans `patterns/` de chaque package, validé au chargement, de sorte que le jeu est ajusté sans reconstruction.
- **Une place pour un modèle, derrière une porte.** Un modèle local ou cloud peut être placé dans une borne (un boss dans Ghost, l’utilisateur dans le mode infini de Vibe Typer). Il ne remplit jamais qu’un levier d’un ensemble fermé, chaque ligne qu’il écrit passe une porte de mots, et rien sur le champ ne l’identifie. Une borne peut également fonctionner comme un serveur MCP via stdio, de sorte qu’un agent peut être celui qui joue.
- **Une voix.** Un processus côté hôte (`voice/`) prononce les lignes qu’une porte a autorisées, enregistrées par [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) avant qu’elles ne soient jouées.

Le compte rendu complet se trouve dans les pages [architecture](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/architecture/) et [sécurité](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/security/) du manuel.

## Disposition

```
packages/tape-core          the tape loader, schema and calibration math
packages/ghost-on-the-menu  the shooter: sim, patterns, bots, render
packages/vibe-typer         the typing game: sim, levers, corpus, bots
packages/house-call         parked
packages/cabinet-server     the cabinets as a stdio MCP server; the say gate; personas
packages/launcher           @mcptoolshop/ghost-on-the-menu: npx serves both cabinets; --mcp is Ghost's server
apps/cabinets               the browser shell, served by Pages at /play/
fixtures/tapes              twenty recordings, tape JSON only
docs/                       one dispatch (research + lock) and one review per slice
site/                       the landing page and the Starlight handbook
voice/                      the Kokoro voice worker and its compose file
catalog/                    the Docker MCP Catalog entry
```

## Jouer

Dans le navigateur : [`/play/`](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/). La page s’ouvre sur un commutateur entre les deux bornes et se souvient de celle à laquelle vous avez joué en dernier. La page publiée n’a pas de démon, de sorte que les emplacements pour le modèle et la voix sont absents.

Localement, avec les emplacements activés, rien à cloner :

```bash
npx @mcptoolshop/ghost-on-the-menu
```

Cela sert l’interface, les deux bornes, sur `127.0.0.1` et l’ouvre ; `--mcp` exécute Ghost on the Menu en tant que serveur MCP via stdio. Node 22 ou version ultérieure. Un package est publié sur npm et c’est celui-ci ; tous les autres packages ici sont privés.

Pour travailler sur l’arcade, clonez-la. Vous avez besoin de Node 22 et de pnpm 11 :

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

`pnpm verify` est la porte : lint, types, tests, construction et déroulement scripté de chaque borne. Pour l’emplacement du modèle, exécutez un démon Ollama sur la même machine ; pour la voix, consultez [`voice/`](voice/) et `pnpm voice`.

Pour jouer à votre propre serveur, enregistrez un affrontement avec mcp-arcade, puis `mcp-arcade tape receipt.json -o your.tape.json` et placez-le à côté des éléments de test. Le conteneur prend un volume en lecture seule de cassettes de la même manière.

## Ajout d’une borne

Un nouveau jeu commence comme une tâche dans `docs/` : la base de recherche, le verrou qu’il hérite et étend, ses leviers de données et ses tranches. Ensuite, un package qui suit la forme ci-dessus, un montage dans `apps/cabinets`, une ligne dans le tableau ici et une page dans le manuel. La version reste `0.x` jusqu’à ce que le directeur en décide autrement, et aucun deuxième package n’est publié sur npm sans le même mot.

## Plus d’informations

Ce qui a été publié et quand est indiqué dans le [journal des modifications](CHANGELOG.md). Ce que les jeux touchent est indiqué dans [SECURITY.md](SECURITY.md).

MIT. Créé par [MCP Tool Shop](https://mcp-tool-shop.github.io/).
