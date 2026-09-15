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
  <strong>You are the agent. The rig hands you the calls.</strong>
</p>

**Ghost on the Menu** est un court jeu de tir rétro créé à partir des données transmises par les serveurs MCP. Vous êtes le modèle, envoyé dans les entrailles de la structure avec une liste de tâches. Chaque interaction est un enregistrement d’une conversation entre un serveur MCP et un agent, et elle se déroule au-dessus de votre vaisseau sous forme de vagues : la poignée de main, le menu, les appels, les réponses, et un boss qui est l’expérience elle-même.

Quelque part, il y a les appels que l’agent n’aurait pas dû faire. Ils ressemblent à tout le reste jusqu’à ce que vous en touchiez un. Ensuite, il vous appartient pour le reste de la manche.

[Jouez-y dans votre navigateur](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Comment lire une manche](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## Effectuez un quart de travail

Appuyez sur **Shift** et la structure vous propose quatre interactions de suite, tirées de la liste et jamais les mêmes quatre interactions deux fois de suite. Chacune d’entre elles correspond à un serveur vers lequel l’agent a été envoyé, et chaque interaction correspond à une pièce différente : pression, zone interdite, une pause, puis un pic d’activité. Une carte entre elles indique le serveur suivant, la politique et les outils que l’agent était censé utiliser, ainsi que le déroulement du combat en mots : une poignée de main d’acier, une étagère traversant le passage, une pause entre les pics d’activité, un mur de catalogue ocre. Les lampes se rechargent à chaque interaction. Le feu continue de s’intensifier à chaque interaction ; l’ascension représente la chaleur, et non une nouvelle histoire.

À la fin, le quart de travail a un nom composé de quatre mots, comme `frost robin chalk garden`. Tapez-le dans le menu pour effectuer à nouveau le même quart de travail, ou transmettez-le à quelqu’un d’autre. Pas de chiffre, pas de décompte, pas de classement : un quart de travail est une liste de tâches, et non un tableau de scores.

Choisissez une cassette dans la liste. Chacune est étiquetée « fixture », « seat » ou « live » ; passez la souris sur **i** pour en savoir plus. « Seat » est le mode de combat par défaut. « Live » est conçu pour être surmonté. « Hardcore » est le quatrième niveau, accessible uniquement via le sélecteur.

## Comment y jouer

Une **cassette** est un enregistrement d’un affrontement. Ce jeu ne lit que des cassettes. Il ne communique jamais avec un serveur, ne conserve jamais de score et ne vous dit jamais qui a gagné.

- **Trois lampes.** Un tir de boss ou une formation en plongée en éteint une. Attrapez une lampe qui tombe **directement** d’un boss mis hors de combat pour en rallumer une. Vous devez vous déplacer en dessous. Si toutes les lampes sont éteintes, la manche se termine.
- **Dispersion.** Éliminez une formation et une dispersion tombe directement. Attrapez-la et votre tir s’intensifie pendant quelques secondes.
- **Les boss représentent l’expérience, et non l’accusation.** Le Murmureur, le Menu et le Gardien apparaissent pour leur vague, que quelque chose se soit mal passé ou non. Pendant un quart de travail, l’inspection se termine avec l’Archiviste (un mur de catalogue). Ils marmonnent comme un agent qui réfléchit à voix haute. Le mode hardcore se caractérise par une seule lampe et une rage dès le premier tir.
- **Le parallélisme explose.** Les modes siège, en direct et hardcore déclenchent des explosions qui multiplient le champ avec des copies fidèles et intensifient le feu, et la musique s’accélère. Ils commencent lentement et s’intensifient vague après vague, et au cours d’une interaction, interaction après interaction. L’ascension représente les données, ajustées sur une bande de joueurs programmés, et non sur vous.
- **Les indices se trouvent dans la séquence.** Un mensonge ne ressemble, ne bouge et n’arrive jamais différemment de son jumeau honnête. Ce qui le trahit, c’est l’endroit où il se trouve : une formation supplémentaire, un deuxième menu, un élément unique juste après le menu. Pendant un quart de travail, des coques supplémentaires peuvent rejoindre la pièce : une sonde rapide, une étagère traversant le passage, un registre empilé ; elles partagent toujours leur jumeau honnête jusqu’à ce que vous les touchiez.
- **La musique** suit la carte, mais une chanson ne dure qu’une seule boucle (environ une demi-minute) avant de s’arrêter. Le poison veut toujours du poison ; le Murmureur veut toujours le Murmureur. Les lits se trouvent sous les tirs et l’attrape ; le mode muet tue tout en même temps. Un quart de travail fait passer la musique à travers ses cartes.
- **La scène finale** indique le nom de la bande, du serveur et de la politique. Les mensonges capturés servent de trophées. Ceux qui ont échappé se présentent sous leur forme honnête. Pas de score, pas de décompte, pas de chiffre.

## Le boss peut être un modèle

Localement, un modèle Ollama, y compris une balise Cloud comme `gpt-oss:120b-cloud`, peut se trouver dans le boss. Il ne reçoit pas d’invite pour improviser. Il reçoit les propres outils de l’armoire : `fire` (un verbe par temps : un ventilateur, une inclinaison et un tir ciblé, une respiration retenue, du brouillard, la plaque), `say` (une ligne de son propre chef, à travers une porte : douze mots, une phrase, pas de chiffre, pas de mot factuel, pas de nom d’outil ou de modèle ; une ligne refusée joue l’une des propres lignes du boss), `speak`, et `view` et `tapes` en lecture seule. Il peut également mettre en file d’attente les prochains verbes légaux après le temps ; une réponse suspendue est le script, et non un blocage. Le sélecteur écrit une ligne de bibliothèque fermée après le tir. Le modèle propose ; le jeu décide. Il ne voit jamais quels sprites sont des mensonges, et rien dans le champ ne l’identifie. Le site publié n’a pas de démon, il omet donc Ollama et Voice.

Avec un travailleur vocal en cours d’exécution, chaque boss parle : sa ligne écrite lorsqu’il arrive, et les lignes que le modèle écrit. Chaque prise est réentendue par un système de reconnaissance vocale et enregistrée par [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) avant d’être diffusée, de sorte que les mots prononcés sont les mots que la porte a admis, et non des paroles inventées, et qu’il n’y a pas de trou. Une prise qui échoue à son enregistrement reste silencieuse.

L’armoire est elle-même un serveur MCP sur stdio, avec les mêmes six outils, de sorte que l’instrument peut jouer le propre menu du Ghost ; quatre des enregistrements du dépôt sont l’armoire qui s’enregistre elle-même. Elle est également livrée sous forme d’image Docker :

```bash
docker run -i --rm ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.7.0
```

Un seul fichier groupé sur `node:22-alpine` avec le contrat d’outil et les bandes intégrées ; il répertorie ses outils en moins d’une seconde avec un seul processeur et deux gigaoctets, et n’a pas besoin de réseau pour fonctionner. Un volume facultatif en lecture seule peut superposer des bandes d’opérateur supplémentaires à ces vingt. La liste du catalogue est silencieuse (réseau désactivé, pas de voix dans l’image). L’entrée du catalogue Docker MCP est rédigée sous `catalog/`. La composition locale pour une image locale se trouve à `voice/compose.host.yaml`.

## Commandes

Gauche et droite (ou A et D) pour se déplacer, espace pour tirer, F pour le plein écran. Cliquez sur le champ pour rejouer la même bande. La bande suivante fait défiler la liste ; pendant un quart de travail, la bande suivante sélectionne la carte suivante. Le son démarre au premier appui sur une touche ou au premier clic ; le mode muet, trois préréglages de sensation et un commutateur d’arrêt se trouvent sous le champ. La difficulté se trouve dans la ligne Lecture (le mode hardcore se caractérise par une seule lampe et des plaques qui tombent). Localement, les **boss Ollama** et **Voice** se trouvent à côté, avec un sélecteur de modèle et des mots qui indiquent ce que fait chaque siège. La page publiée `/play/` est le champ, le son, la sensation, l’arrêt et la difficulté uniquement.

## Jouez-y localement

Une seule commande, rien à cloner :

```bash
npx @mcptoolshop/ghost-on-the-menu
```

Cela sert l’armoire sur `127.0.0.1` et l’ouvre. Contrairement à la page publiée, celle-ci peut atteindre un démon Ollama et un travailleur vocal sur votre propre machine, de sorte que les sièges s’allument. `--mcp` exécute la même armoire en tant que serveur MCP sur stdio, pour qu’un agent puisse y jouer ; `--help` répertorie le reste. Node 22 ou version ultérieure, et rien d’autre.

Pour travailler dessus, clonez-le : vous avez besoin de Node 22 et de pnpm 11 :

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Ouvrez l’adresse que Vite affiche. Seize enregistrements sont inclus dans le dépôt, exportés de [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade), l’instrument qui communique avec le serveur et conserve la cassette.

Pour le poste de « chef », exécutez un démon Ollama sur la même machine et cochez la case « Ollama chefs ». Pour la voix, créez un environnement virtuel Python 3.12 à l’emplacement `.venv` avec `kokoro-onnx`, `faster-whisper` et `fx-dub`, pointez `KOKORO_DIR` vers les poids Kokoro ONNX, et exécutez `pnpm voice` dans un deuxième terminal ; la case « Voix » s’active lorsque l’agent répond. Aucun de ces éléments n’est nécessaire pour la lecture ; le site publié n’en contient aucun.

Pour enregistrer votre propre serveur et lire cette cassette, exécutez une séquence là-bas, puis `mcp-arcade tape receipt.json -o your.tape.json`.

## Plus d’informations

Le [manuel](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/) contient le reste du manuel : les indices, les boss, les difficultés et la façon dont le jeu est conçu. Ce qui a été inclus et quand est indiqué dans le [journal des modifications](CHANGELOG.md). Ce que le jeu touche est indiqué dans [SECURITY.md](SECURITY.md).

MIT. Créé par [MCP Tool Shop](https://mcp-tool-shop.github.io/).
