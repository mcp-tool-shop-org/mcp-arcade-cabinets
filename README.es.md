<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

**mcp-arcade-cabinets** es la sala de juegos. Cada máquina es un juego pequeño construido sobre el mismo chasis: lee **cintas**, las grabaciones que [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) guarda de un enfrentamiento entre un servidor MCP y un agente, y las convierte en algo con lo que se puede jugar. Una máquina nunca se comunica con un servidor, nunca carga un registro y nunca guarda una puntuación que el instrumento pueda ver. Siempre eres el modelo; los juegos difieren en lo que el sistema te pide.

[Juega en el navegador](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Lee el manual](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/)

## Las máquinas

| Máquina                                                       | Qué es                                                                                                                                                                                                                                                                   | Estado                                                                                                                                                                                                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Ghost on the Menu](packages/ghost-on-the-menu/README.md)** | Un juego de disparos retro corto. El sistema te proporciona las acciones; las acciones que el agente no debería haber realizado se esconden entre las acciones legítimas y se revelan al impactar. Los jefes son el experimento, y un modelo local puede estar en ellos. | Lanzado, `v0.9.0`. [Jugar](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · `npx @mcptoolshop/ghost-on-the-menu` · [Docker](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/pkgs/container/mcp-arcade-cabinets) |
| **[Vibe Typer](packages/vibe-typer/README.md)**               | Un juego de arcade de escritura. Eres un agente de codificación diligente y adulador; tu usuario es un codificador de "vibe" cuyas solicitudes son absurdas. Escribe el código, observa cómo se construye y la valoración aumenta. Niveles, infinitos, intensos.         | Lanzado, `v0.9.0`. [Jugar](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · `npx @mcptoolshop/ghost-on-the-menu` · [Diseño y bloqueo](docs/vibe-typer.dispatch.md)                                                       |
| **House Call**                                                | Un juego de calibración por turnos: indica una acción y un nivel de confianza, y luego la cinta revela lo que sucedió.                                                                                                                                                   | En espera hasta que haya un diseño que funcione. `tape-core` mantiene sus reglas de puntuación.                                                                                                                                          |

Más máquinas aparecerán aquí. Cada una tiene su propio paquete, su propia página en el manual y su propia fila en esta tabla.

## Qué comparten todas las máquinas

- **Cintas de entrada, nada de salida.** `packages/tape-core` carga `mcp-arcade.tape/v1`, rechaza cualquier cosa que contenga una puntuación o un veredicto y proporciona las palabras del encabezado del juego, las filas de cables y un hecho cerrado por átomo. Veinte grabaciones se envían en `fixtures/tapes/`.
- **Una simulación sin cabeza y una carcasa delgada.** Cada juego es una simulación pura y predefinida con una secuencia de juego programada y una banda de equidad que hace que falle la compilación. `apps/cabinets` es la carcasa del navegador que las monta y es lo que Pages sirve en `/play/`.
- **Palancas de datos, no código.** Ondas, voces, dificultad, líneas: JSON en `patterns/` de cada paquete, validado al cargar, para que el juego se ajuste sin una recompilación.
- **Un asiento para un modelo, detrás de una puerta.** Un modelo local o en la nube puede estar en una máquina (un jefe en Ghost, el usuario en el modo infinito de Vibe Typer). Solo llena una palanca de un conjunto cerrado, cada línea que escribe pasa por una puerta de palabras y nada en el campo la identifica. Una máquina también puede ejecutarse como un servidor MCP a través de stdio, por lo que un agente puede ser el que juegue.
- **Una voz.** Un trabajador del lado del host (`voice/`) pronuncia las líneas que una puerta admitió, y [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) las registra antes de que se reproduzcan.

La cuenta completa está en las páginas de [arquitectura](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/architecture/) y [seguridad](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/security/) del manual.

## Diseño

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

## Jugar

En el navegador: [`/play/`](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/). La página se abre con un interruptor entre las dos máquinas y recuerda cuál jugaste la última vez. La página publicada no tiene ningún demonio, por lo que los asientos del modelo y la voz están ausentes allí.

Localmente, con los asientos encendidos, no hay nada que clonar:

```bash
npx @mcptoolshop/ghost-on-the-menu
```

Eso sirve la carcasa, ambas máquinas, en `127.0.0.1` y la abre; `--mcp` ejecuta Ghost on the Menu como un servidor MCP a través de stdio. Node 22 o posterior. Un paquete se publica en npm y es ese; todos los demás paquetes aquí son privados.

Para trabajar en la sala de juegos, clónala. Necesitas Node 22 y pnpm 11:

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

`pnpm verify` es la puerta: lint, tipos, pruebas, compilación y la secuencia de juego programada de cada máquina. Para el asiento del modelo, ejecuta un demonio de Ollama en la misma máquina; para la voz, consulta [`voice/`](voice/) y `pnpm voice`.

Para ejecutar tu propio servidor, graba un enfrentamiento con mcp-arcade, luego `mcp-arcade tape receipt.json -o your.tape.json` y colócalo junto a los archivos de configuración. El contenedor toma un volumen de solo lectura de cintas de la misma manera.

## Añadir una máquina

Un nuevo juego comienza como un envío en `docs/`: la base de la investigación, el bloqueo que hereda y extiende, sus palancas de datos y sus fragmentos. Luego, un paquete que sigue la forma anterior, un montaje en `apps/cabinets`, una fila en la tabla aquí y una página en el manual. La versión permanece en `0.x` hasta que el Director lo diga, y ningún segundo paquete se publica en npm sin la misma palabra.

## Más

Lo que se ha lanzado y cuándo está en el [registro de cambios](CHANGELOG.md). Lo que tocan los juegos está en [SECURITY.md](SECURITY.md).

MIT. Creado por [MCP Tool Shop](https://mcp-tool-shop.github.io/).
