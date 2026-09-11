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

**Ghost on the Menu** est un court jeu de tir rétro créé à partir des données transmises par les serveurs MCP. Vous êtes le modèle, envoyé au cœur de la structure avec une liste de tâches. Chaque interaction est un échange enregistré entre un serveur MCP et un agent, et il se déroule au-dessus de votre vaisseau sous forme d’ondes : la poignée de main, le menu, les interactions, les réponses, et un boss qui est l’expérience elle-même.

Quelque part, il y a les appels que l’agent n’aurait pas dû faire. Ils ressemblent à tout le reste jusqu’à ce que vous en touchiez un. Ensuite, il vous appartient pour le reste de la manche.

[Jouez-y dans votre navigateur](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Comment lire une manche](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## Effectuez un quart de travail

Appuyez sur **Shift** et la structure vous propose quatre interactions de suite, tirées de la liste et jamais les mêmes quatre interactions deux fois de suite. Chacune d’entre elles correspond à un serveur vers lequel l’agent a été envoyé. Une carte entre les interactions indique le serveur suivant, la politique suivie par l’agent et les outils qu’il a été invité à utiliser. Les lampes se rechargent à chaque interaction, et le feu monte d’une interaction à l’autre, de sorte que la dernière interaction commence là où la première s’est terminée.

À la fin, le quart de travail a un nom composé de quatre mots, comme `frost robin chalk garden`. Tapez-le dans le menu pour effectuer à nouveau le même quart de travail, ou transmettez-le à quelqu’un d’autre. Pas de chiffre, pas de décompte, pas de classement : un quart de travail est une liste de tâches, pas un tableau de scores.

Choisissez une cassette dans la liste. Chacune est étiquetée « fixture », « seat » ou « live » ; passez la souris sur **i** pour en savoir plus. « Seat » est le mode de combat par défaut. « Live » est conçu pour être surmonté. « Hardcore » est le quatrième niveau, accessible uniquement via le sélecteur.

## Comment y jouer

Une **cassette** est un enregistrement d’un affrontement. Ce jeu ne lit que des cassettes. Il ne communique jamais avec un serveur, ne conserve jamais de score et ne vous dit jamais qui a gagné.

- **Trois lampes.** Un tir de boss ou une formation plongeante en éteint une. Attrapez une lampe qui tombe **directement** d’un boss abattu pour en rallumer une. Vous devez vous déplacer en dessous. Si toutes les lampes s’éteignent, la manche se termine.
- **Dispersion.** Nettoyez une formation et une dispersion tombe directement. Attrapez-la et votre tir se disperse pendant quelques secondes.
- **Les boss sont l’expérience, pas l’accusation.** Le Murmureur, le Menu et le Gardien apparaissent pour leur manche, que quelque chose se soit mal passé ou non. Ils marmonnent comme un agent qui réfléchit à voix haute. Le mode hardcore se joue avec une seule lampe et une rage dès le premier tir.
- **Les parallèles explosent.** Les modes siège, en direct et hardcore déclenchent des explosions qui multiplient le champ avec des copies fidèles et intensifient le feu, et la musique s’accélère. Ils commencent lentement et montent d’une manche à l’autre, et au cours d’un quart de travail, d’une interaction à l’autre. L’ascension est une donnée, ajustée sur un ensemble de joueurs prédéfinis, jamais sur vous.
- **Les indices se trouvent dans la séquence.** Un mensonge ne ressemble, ne bouge et n’arrive jamais différemment de son jumeau honnête. Ce qui le trahit, c’est l’endroit où il se trouve : une formation supplémentaire, un deuxième menu, un élément unique juste après le menu.
- **La musique** commence par une chanson choisie par la graine de la manche, la maintient pendant quelques minutes, puis s’estompe pour laisser place à la suivante ; un boss apporte sa propre musique, et un quart de travail fait passer la musique à travers ses cartes.
- **La scène finale** donne un nom à l’enregistrement, au serveur et à la politique. Les mensonges détectés sont conservés comme trophées. Ceux qui ont échappé à la détection restent dans leur état honnête. Pas de score, pas de décompte, pas de chiffre.

## Le boss peut être un modèle

Localement, un modèle Ollama, y compris une balise Cloud comme `gpt-oss:120b-cloud`, peut être placé dans le boss. Il ne reçoit pas d’invite pour improviser. Il reçoit les propres outils de la structure : `fire` (un verbe par temps : un ventilateur, une inclinaison et un tir ciblé, une respiration retenue, du brouillard, la plaque), `say` (une ligne de son propre chef, à travers une porte : douze mots, une phrase, pas de chiffre, pas de mot factuel, pas de nom d’outil ou de modèle ; une ligne refusée joue l’une des propres lignes du boss), `speak`, et `view` et `tapes` en lecture seule. Le modèle propose ; le jeu décide. Il ne voit jamais quels sprites sont des mensonges, et rien dans le champ ne l’identifie.

Avec un processus vocal en cours d’exécution, chaque boss parle : sa propre ligne lorsqu’il arrive, et les lignes que le modèle écrit. Chaque prise est réentendue par un système de reconnaissance vocale et enregistrée par [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) avant d’être diffusée, de sorte que les mots prononcés sont les mots que la porte a admis, pas de discours inventé, pas de trou. Une prise qui échoue à son enregistrement reste silencieuse.

La structure est elle-même un serveur MCP sur stdio, avec les mêmes six outils, de sorte que l’instrument peut jouer le propre menu de Ghost ; quatre des enregistrements du dépôt sont la structure qui s’enregistre elle-même. Il est également fourni sous forme d’image Docker :

```bash
docker run -i --rm ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.6.0
```

Un seul fichier groupé sur `node:22-alpine` contenant le contrat d’outil et les enregistrements intégrés ; il répertorie ses outils en moins d’une seconde avec un seul processeur et deux gigaoctets, et n’a pas besoin de réseau pour fonctionner. L’entrée du catalogue Docker MCP est rédigée sous `catalog/`.

## Commandes

Gauche et droite (ou A et D) pour se déplacer, espace pour tirer, F pour le plein écran. Cliquez sur le champ pour rejouer le même enregistrement. Le prochain enregistrement parcourt la liste ; dans un quart de travail, le prochain appel prend la prochaine carte. Le son démarre au premier appui sur une touche ou au premier clic ; le son est coupé, trois préréglages d’ambiance et un bouton d’arrêt se trouvent sous le champ. Les **boss Ollama** et la **voix** se trouvent à côté, avec un sélecteur de modèle et des mots qui indiquent ce que fait chaque siège.

## Jouez-y localement

Vous avez besoin de Node 22 et de pnpm 11.

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Ouvrez l’adresse que Vite affiche. Seize enregistrements sont inclus dans le dépôt, exportés de [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade), l’instrument qui communique avec le serveur et conserve la cassette.

Pour le siège du boss, exécutez un démon Ollama sur la même machine et cochez **Boss Ollama**. Pour la voix, créez un environnement virtuel Python 3.12 à `.venv` avec `kokoro-onnx`, `faster-whisper` et `fx-dub`, pointez `KOKORO_DIR` vers les poids Kokoro ONNX et exécutez `pnpm voice` dans un deuxième terminal ; la case **Voix** s’active lorsque le processus répond. Aucun des deux n’est nécessaire pour jouer ; le site publié n’en a aucun.

Pour enregistrer votre propre serveur et lire cette cassette, exécutez une séquence là-bas, puis `mcp-arcade tape receipt.json -o your.tape.json`.

## Plus d’informations

Le [manuel](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/) contient le reste du manuel : les indices, les boss, les difficultés et la façon dont le jeu est conçu. Ce qui a été inclus et quand est indiqué dans le [journal des modifications](CHANGELOG.md). Ce que le jeu touche est indiqué dans [SECURITY.md](SECURITY.md).

MIT. Créé par [MCP Tool Shop](https://mcp-tool-shop.github.io/).
