<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

**Ghost on the Menu** es un breve juego de disparos retro creado a partir de la información que los servidores MCP transmitían. Eres el agente, enviado a las profundidades de la instalación con una lista de tareas. Cada llamada es una grabación de una conversación entre un servidor MCP y un agente, y se reproduce sobre tu nave en forma de oleadas: el saludo inicial, el menú, las llamadas, las respuestas que se reciben y un jefe que es el propio experimento.

En algún lugar de esa secuencia se encuentran las comunicaciones que el agente no debería haber realizado. Parecen cualquier otra cosa hasta que te encuentras con una. A partir de ese momento, estará disponible durante el resto de la ronda.

[Juega en el navegador](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Cómo interpretar una ronda](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## Comienza un turno

Presiona **Shift** y el equipo te dará cuatro indicaciones seguidas, seleccionadas de la lista y nunca serán las mismas cuatro dos veces seguidas. Cada una es un servidor al que se envió al agente, y cada indicación es una sala diferente: presión, área de negación, un descanso y luego un punto álgido. Una tarjeta entre ellas indica el siguiente servidor, la política, las herramientas que se le pidió al agente que utilizara y la pelea en palabras: un apretón de manos de acero, una estantería a lo largo del camino, un descanso entre los puntos álgidos, una pared de catálogo ocre. Las lámparas se rellenan en cada indicación. El fuego sigue subiendo de indicación en indicación; la subida es calor, no una nueva historia.

Al final, el turno tiene un nombre de cuatro palabras, como `frost robin chalk garden`. Escríbelo en el menú para repetir el mismo turno o pásaselo a otra persona. No hay puntuación, ni conteo, ni clasificación: un turno es una lista de tareas, no una tabla de resultados.

Elige una grabación de la lista. Cada una está etiquetada como "fijo", "asiento" o "en vivo"; pasa el cursor sobre la **i** para ver la razón. "Asiento" es la configuración predeterminada para la pelea. "En vivo" está diseñada para ser superada. "Difícil" es el cuarto nivel, accesible solo desde el selector.

## Cómo se juega

Una **cinta** es una grabación de un enfrentamiento. Este juego solo reproduce cintas. Nunca se comunica con un servidor, nunca guarda una puntuación y nunca te dice quién ganó.

- **Tres lámparas.** Un disparo de jefe o una formación de buceo apaga una de ellas. Atrapa una lámpara que cae **directamente hacia abajo** desde un jefe derrotado para volver a encender una. Tienes que moverte debajo de ella. Que todas se apaguen termina la ronda.
- **Dispersión.** Elimina una formación y una dispersión cae directamente hacia abajo. Atrapa y tu fuego se extenderá durante unos segundos.
- **Los jefes son el experimento, no la acusación.** El Susurrador, el Menú y el Portero aparecen en su oleada, independientemente de si algo salió mal o no. En una ronda, la inspección termina con el Archivista (una pared de catálogo). Murmuran como un agente que piensa en voz alta. El modo difícil es una lámpara y furia desde el primer disparo.
- **El paralelismo estalla.** Los modos de asiento, en vivo y difícil obtienen ráfagas que multiplican el campo con copias honestas y calientan el fuego, y la música se acelera bajo ellas. Comienzan cortas y suben oleada tras oleada, y en una ronda, indicación tras indicación. La subida es datos, ajustados en una banda de jugadores programados, nunca en ti.
- **Las pistas están en la secuencia.** Una mentira nunca se ve, se mueve o llega de manera diferente a su gemelo honesto. Lo que la delata es dónde se encuentra: una formación adicional, un segundo menú, un elemento único justo después del menú. En una ronda, los cascos adicionales pueden unirse a la sala: una sonda que se mueve rápidamente, una estantería a lo largo del camino, un libro de contabilidad apilado; todos ellos comparten su gemelo honesto hasta que los golpees.
- **La música** sigue la tarjeta, pero una canción tiene un solo ciclo (aproximadamente medio minuto) antes de que ceda. El veneno sigue queriendo veneno; el Susurrador sigue queriendo al Susurrador. Las camas están debajo de los disparos y la captura; el silencio sigue matando todo a la vez. Una ronda lleva la música a través de sus tarjetas.
- **La escena final** indica la cinta, el servidor y la política. Las mentiras atrapadas sirven como trofeos. Las que escapan permanecen en su color honesto. Sin puntuación, sin conteo, sin dígito.

## El jefe puede ser un modelo

Localmente, un modelo de Ollama, incluido un indicador de nube como `gpt-oss:120b-cloud`, puede estar en el jefe. No recibe una indicación para improvisar. Recibe las propias herramientas del gabinete: `fire` (un verbo por compás: un ventilador, una inclinación y un disparo dirigido, una respiración contenida, niebla, la placa), `say` (una línea propia, a través de una puerta: doce palabras, una oración, sin dígito, sin palabra de hecho, sin nombre de herramienta o modelo; una línea rechazada reproduce una de las propias del jefe), `speak` y solo lectura `view` y `tapes`. También puede poner en cola los próximos pocos verbos legales fuera del compás; una respuesta interrumpida es el guion, nunca una pausa. El selector escribe una línea de biblioteca cerrada después del disparo. El modelo propone; el juego decide. Nunca ve qué sprites son mentiras, y nada en el campo lo identifica. El sitio publicado no tiene un demonio, por lo que omite el aspecto de Ollama y Voice.

Con un programa de voz en funcionamiento, cada jefe habla: su línea original cuando llega y las líneas que escribe el modelo. Cada toma se reproduce y se registra mediante [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) antes de reproducirse, por lo que las palabras que se dicen son las palabras que la puerta admitió, sin discursos inventados, sin errores. Una toma que no pasa la verificación permanece en silencio.

El gabinete es en sí mismo un servidor MCP a través de stdio, con las mismas seis herramientas, por lo que el instrumento puede reproducir el propio menú del Fantasma; cuatro de las grabaciones en el repositorio son del propio gabinete grabando.

```bash
docker run -i --rm ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.7.0
```

Un archivo agrupado en `node:22-alpine` con el contrato de la herramienta y las cintas integradas; enumera sus herramientas en una fracción de segundo con una CPU y dos gigabytes, y no necesita red para funcionar. Un volumen opcional de solo lectura puede superponer cintas adicionales del operador junto a esas veinte. La lista del catálogo está en silencio (red apagada, sin voz en la imagen). La entrada del catálogo de Docker MCP se redacta en `catalog/`. La composición solo para el host para una imagen local está en `voice/compose.host.yaml`.

## Controles

Izquierda y derecha (o A y D) para moverse, espacio para disparar, F para pantalla completa. Haz clic en el campo para reproducir la misma cinta. La siguiente cinta recorre la lista; en una ronda, la siguiente indicación toma la siguiente tarjeta. El sonido comienza en la primera tecla o clic; el silencio, tres ajustes de sensación y un interruptor de desactivación están debajo del campo. La dificultad está en la fila de reproducción (el modo difícil es una lámpara y placas que caen). Localmente, los **jefes de Ollama** y **Voice** están junto a ellos, con un selector de modelo y palabras que indican lo que está haciendo cada asiento. La página publicada `/play/` es el campo, sonido, sensación, desactivación y dificultad solamente.

## Juega localmente

Un comando, nada que clonar:

```bash
npx @mcptoolshop/ghost-on-the-menu
```

Eso sirve al gabinete en `127.0.0.1` y lo abre. A diferencia de la página publicada, esta puede acceder a un demonio de Ollama y a un trabajador de voz en tu propia máquina, por lo que los asientos se iluminan. `--mcp` ejecuta el mismo gabinete como un servidor MCP a través de stdio, para que un agente lo juegue; `--help` enumera el resto. Node 22 o posterior, y nada más.

Para trabajar en ello, clónalo: necesitas Node 22 y pnpm 11:

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Abre la dirección que imprime Vite. Dieciséis grabaciones se incluyen en el repositorio, exportadas de [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade), el instrumento que se comunica con el servidor y guarda la cinta.

Para el "seat" del jefe, ejecuta un demonio de Ollama en la misma máquina y marca la casilla **Jefes de Ollama**. Para la voz, crea un entorno virtual de Python 3.12 en `.venv` con `kokoro-onnx`, `faster-whisper` y `fx-dub`, apunta `KOKORO_DIR` a los pesos ONNX de Kokoro y ejecuta `pnpm voice` en una segunda terminal; la casilla **Voz** se activa cuando el programa responde. Ninguno de los dos es necesario para jugar; el sitio publicado no los tiene.

Para grabar tu propio servidor y reproducir esa cinta, ejecuta un enfrentamiento allí y luego `mcp-arcade tape receipt.json -o your.tape.json`.

## Más

El [manual](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/) es el resto del manual: las pistas, los jefes, las dificultades y cómo se construye el juego. Lo que se incluyó y cuándo, se encuentra en el [registro de cambios](CHANGELOG.md). Lo que el juego afecta, se encuentra en [SECURITY.md](SECURITY.md).

MIT. Creado por [MCP Tool Shop](https://mcp-tool-shop.github.io/).
