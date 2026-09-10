<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

**Ghost on the Menu** transforma una partida grabada entre un servidor MCP y un agente en una ronda de un juego de disparos retro. Cada experimento que el instrumento [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) realizó es una ola: una palabra la nombra, luego el saludo, el menú, las llamadas, las respuestas que regresan, con el jefe de la ola observando. En algún lugar de todo esto están las llamadas que el agente no debería haber hecho. Parecen todo lo demás hasta que te encuentras con una. Entonces, es tuya durante el resto de la ronda.

[Juega en el navegador](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Lee el manual](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/)

## A qué estás disparando

El instrumento guarda una **grabación** de cada partida: qué `tools/call` salió, qué regresó y los datos que registró en el cable (un susurro siguió, un menú que cambió, una herramienta fantasma a la que se respondió). La consola lee esa grabación y la organiza en una ronda. Nunca toca la puntuación, nunca se comunica con un servidor y nunca te dice quién ganó. Una mentira se revela por el contacto, nunca se etiqueta de antemano: ni por la apariencia, ni por el movimiento, ni por el tiempo. Aprender a leer la ronda es aprender a leer el cable.

- **Tres lámparas.** Un disparo del jefe o una formación de buceo apaga una. Si se apagan todas, la ronda termina antes de tiempo.
- **Los jefes son el experimento, no la mentira.** El Susurrador, el Menú y el Portero aparecen en cada ola de su tipo, independientemente de si algo salió mal o no, por lo que nada sobre un jefe es una acusación.
- **Tres niveles de dificultad.** Tal como se grabó (el nivel de la grabación), el modo de práctica y el modo en vivo. El modo de práctica es el predeterminado; el modo en vivo está diseñado para ser superado, no para ser completado.
- **La escena final** nombra la grabación, el servidor y la política. Las mentiras detectadas permanecen como trofeos. Las que se evaden permanecen en su estado original. Nunca hay puntuación, ni conteo, ni dígito.

## Jugar

```bash
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Izquierda y derecha para moverse, espacio para disparar, F para pantalla completa, haz clic en el campo para reiniciar la misma grabación, Siguiente grabación al final para recorrer la lista de elementos. El sonido se inicia con la primera tecla o clic; los controles de silencio, tres preajustes de sonido y un interruptor de vibración se encuentran debajo del campo.

Cada grabación de elemento se incluye en el repositorio, exportada de los registros originales del instrumento, su configuración de Docker, sus ejecuciones en el entorno Ollama y un paquete de pruebas en vivo. Dieciséis grabaciones, un catálogo de cuatro elementos.

## Desde una terminal

```bash
pnpm test
pnpm test:play ghost --fixture naive-ndjson
pnpm film --fixture naive-ndjson --tier 1
pnpm sweep
```

`test:play` es la prueba de aceptación: un bot programado juega una ronda completa y se verifica la transcripción para ver qué debe y no debe aparecer antes de la pantalla final. `film` escribe los fotogramas de una ronda en archivos PNG a través del mismo motor de renderizado que utiliza la consola. `sweep` reproduce todas las grabaciones en todos los niveles con todos los bots e imprime la tabla de equilibrio.

## La banda de equidad

Tres bots programados juegan todas las grabaciones en CI. **Inactivo** nunca se mueve ni dispara y debe perder todas las lámparas en los modos de práctica y en vivo. **El rastreador** persigue al sprite más cercano, siempre disparando, y debe sobrevivir al nivel grabado y encontrar la mitad de las mentiras. **El lector** dispara solo a las secuencias reveladoras y esquiva lo que se avecina, y debe revelar todas las mentiras en el nivel grabado y en el modo de práctica. La banda también incluye la curva de dificultad como barras, por lo que un cambio de configuración que convierta el juego en una galería o en un muro hace que falle la compilación. Todos los ajustes son datos que se encuentran en `packages/ghost-on-the-menu/patterns/`: rutas de entrada, formaciones, ritmos de disparo, inmersiones, jefes, la escalera, el ritmo de la ola.

## Modelo de confianza y amenaza

Las consolas leen las grabaciones y no escriben nada.

- **Datos accedidos:** los archivos de grabación que se encuentran en `fixtures/tapes/` (incluidos en la compilación del navegador) y los datos de patrón. Una grabación contiene eventos de cable, identificadores de elementos, nombres de herramientas y los datos registrados del instrumento. El cargador rechaza cualquier grabación que contenga una puntuación, un veredicto, una llamada de operador o NRP, a cualquier profundidad, por lo que el juego no puede mostrar lo que nunca se le proporcionó.
- **Datos no accedidos:** ningún registro, ninguna prueba, ningún código de instrumento, ninguna conexión MCP, ninguna escritura en el sistema de archivos desde el juego.
- **Permisos:** un navegador. Las herramientas de la terminal se ejecutan en Node y leen los propios elementos del repositorio.
- **Red:** ninguna. La consola son archivos estáticos en un único origen.
- **Telemetría:** ninguna. **Secretos:** ninguno.

Los sprites se generaron en una API de imágenes asociada y se incluyen como archivos; su procedencia y los términos de la licencia se encuentran en `docs/art/receipts.json`. Son activos del juego y no se pueden utilizar para entrenar modelos. Consulta [SECURITY.md](SECURITY.md).

## Diseño

| Ruta                         | Qué                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `packages/tape-core`         | Cargar una grabación, rechazar claves prohibidas, dividir por elemento, reglas de puntuación guardadas para una futura consola |
| `packages/ghost-on-the-menu` | Preprocesamiento, simulación, motor de renderizado, indicaciones, sonido, bots, los datos de patrón                            |
| `apps/cabinets`              | La consola del navegador                                                                                                       |
| `fixtures/tapes`             | Grabaciones exportadas de mcp-arcade                                                                                           |
| `scripts/`                   | `test:play`, `film`, `sweep`                                                                                                   |
| `docs/`                      | El diseño bloqueado y sus recibos de referencia, el resumen artístico y los recibos, el envío de la ola 2                      |

El diseño está bloqueado en `docs/study-swarm.dispatch.md` (G1 a G10). House Call, una consola de calibración por turnos, está aparcada en el commit 152f548 hasta que exista un diseño que se pueda jugar.

Creado con Grok como socio de diseño y verificador entre familias: Grok escribió el cargador de grabaciones y la simulación, Claude escribió la consola y la presentación, cada uno revisando el trabajo del otro.

Node 22 o posterior. Versión 0.2.0. MIT.

<p align="center">Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a></p>
