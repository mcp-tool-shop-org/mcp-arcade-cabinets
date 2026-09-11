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

Presiona **Shift** y la instalación te asigna cuatro llamadas consecutivas, seleccionadas de la lista y nunca las mismas cuatro dos veces seguidas. Cada una es un servidor al que se envió al agente. Una tarjeta entre las llamadas indica el siguiente servidor, la política que siguió el agente y las herramientas que se le pidió que utilizara. Las lámparas se rellenan en cada llamada, y el fuego aumenta llamada tras llamada, por lo que la última llamada comienza donde terminó la primera.

Al final, el turno tiene un nombre de cuatro palabras, como `frost robin chalk garden`. Escríbelo en el menú para repetir el mismo turno o pásaselo a otra persona. No hay puntuación, ni conteo, ni clasificación: un turno es una lista de tareas, no una tabla de resultados.

Elige una grabación de la lista. Cada una está etiquetada como "fijo", "asiento" o "en vivo"; pasa el cursor sobre la **i** para ver la razón. "Asiento" es la configuración predeterminada para la pelea. "En vivo" está diseñada para ser superada. "Difícil" es el cuarto nivel, accesible solo desde el selector.

## Cómo se juega

Una **cinta** es una grabación de un enfrentamiento. Este juego solo reproduce cintas. Nunca se comunica con un servidor, nunca guarda una puntuación y nunca te dice quién ganó.

- **Tres lámparas.** Un disparo de un jefe o una formación de buceo apaga una de ellas. Recoge una lámpara que cae **directamente hacia abajo** desde un jefe derribado para volver a encender una. Debes moverte debajo de ella. Si se apagan todas, termina la ronda.
- **Dispersión.** Al eliminar una formación, una dispersión cae directamente hacia abajo. Recógela y tu fuego se extenderá durante unos segundos.
- **Los jefes son el experimento, no la acusación.** El Susurrador, el Menú y el Portero aparecen en su oleada, independientemente de si algo salió mal o no. Murmuran como un agente que piensa en voz alta. En el modo difícil, solo hay una lámpara y el fuego se desata desde el primer disparo.
- **Las secuencias paralelas se intensifican.** Los modos Fácil, Normal y Difícil generan secuencias que multiplican el campo con copias precisas y aumentan el fuego, y la música se acelera. Comienzan de forma breve y aumentan oleada tras oleada, y en cada turno, llamada tras llamada. El aumento es información, ajustada en un conjunto de jugadores predefinidos, nunca en ti.
- **Las pistas están en la secuencia.** Una mentira nunca se ve, se mueve o llega de forma diferente a su gemela honesta. Lo que la delata es dónde se encuentra: una formación adicional, un segundo menú, un elemento único justo después del menú.
- **La música** comienza con una canción que elige la semilla de la ronda, la mantiene durante un par de minutos y luego se desvanece en la siguiente; un jefe trae la suya propia, y un turno lleva la música a través de sus cartas.
- **La escena final** indica el nombre de la grabación, el servidor y la política. Las mentiras detectadas se muestran como trofeos. Las que se evaden permanecen con su apariencia original. No hay puntuación, ni conteo, ni número.

## El jefe puede ser un modelo

Locally, an Ollama model, including a Cloud tag like `gpt-oss:120b-cloud`, can sit in the boss. It does not get a prompt to freewheel in. It gets the cabinet's own tools: `fire` (one verb a beat: a fan, a lean and an aimed shot, a held breath, fog, the plate), `say` (a line of its own, through a gate: twelve words, one sentence, no digit, no fact word, no tool or model name; a refused line plays one of the boss's own), `speak`, and read-only `view` and `tapes`. The model proposes; the game decides. It never sees which sprites are lies, and nothing on the field names it.

Con un programa de voz en funcionamiento, cada jefe habla: su línea original cuando llega y las líneas que escribe el modelo. Cada toma se reproduce y se registra mediante [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) antes de reproducirse, por lo que las palabras que se dicen son las palabras que la puerta admitió, sin discursos inventados, sin errores. Una toma que no pasa la verificación permanece en silencio.

El gabinete es en sí mismo un servidor MCP a través de stdio, con las mismas seis herramientas, por lo que el instrumento puede reproducir el propio menú del Fantasma; cuatro de las grabaciones en el repositorio son del propio gabinete grabando.

```bash
docker run -i --rm ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.6.0
```

Un archivo empaquetado en `node:22-alpine` con el contrato de la herramienta y las grabaciones incluidas; enumera sus herramientas en una fracción de segundo con un solo procesador y dos gigabytes, y no necesita red para funcionar. La entrada del catálogo Docker MCP se está redactando bajo `catalog/`.

## Controles

Izquierda y derecha (o A y D) para moverse, espacio para disparar, F para pantalla completa. Haz clic en el campo para reproducir la misma pista. La siguiente pista recorre la lista. El sonido comienza con la primera tecla o clic; los controles de silencio, tres preajustes de sonido y un interruptor de vibración están debajo del campo. Los **jefes de Ollama** y la opción **Voz** están a su lado, con un selector de modelos y palabras que indican qué está haciendo cada "seat".

## Juega localmente

Necesitas Node 22 y pnpm 11.

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
