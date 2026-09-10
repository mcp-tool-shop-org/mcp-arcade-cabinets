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
  <strong>An arcade shooter made from what an MCP server said on the wire.</strong>
</p>

**Ghost on the Menu** es un juego de disparos retro de corta duración. Pilotas una nave a lo largo de la parte inferior de la pantalla. Arriba, se reproduce una secuencia grabada de un enfrentamiento entre un servidor MCP y un agente, que se desarrolla en oleadas: el saludo inicial, el menú, las comunicaciones, las respuestas y un jefe que es el propio experimento.

En algún lugar de esa secuencia se encuentran las comunicaciones que el agente no debería haber realizado. Parecen cualquier otra cosa hasta que te encuentras con una. A partir de ese momento, estará disponible durante el resto de la ronda.

[Juega en el navegador](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [Cómo interpretar una ronda](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## Cómo se juega

Una **cinta** es una grabación de un enfrentamiento. Este juego solo reproduce cintas. Nunca se comunica con un servidor, nunca guarda una puntuación y nunca te dice quién ganó.

- **Tres lámparas.** Un disparo del jefe o una formación de buceo apaga una de ellas. Recoge una lámpara que cae **directamente hacia abajo** desde un jefe derrotado para volver a encender una. Tienes que moverte debajo de ella. Si se apagan todas, termina la ronda.
- **Dispersión.** Elimina una formación y una dispersión cae directamente hacia abajo. Recógela y tu fuego se extenderá durante unos segundos.
- **Los jefes son el experimento, no la acusación.** El Susurrador, el Menú y el Portero aparecen en su oleada, independientemente de si algo salió mal o no. Murmuran como un agente que piensa en voz alta. En el modo difícil, hay una lámpara y furia desde el primer disparo. Los modos de asiento, en vivo y difícil tienen ráfagas cortas de **paralelismo** que multiplican el campo y calientan la música, y luego se mantienen más tiempo a medida que avanza la ronda. Localmente, puedes dejar que un modelo de Ollama (incluida una etiqueta de nube como `gpt-oss:120b-cloud`) esté en el jefe: este indica los disparos de cada jefe (un abanico, una inclinación y un disparo dirigido, una respiración contenida, niebla, la placa) y elige cuál de las propias líneas del jefe dice. Nunca ve qué sprites son mentiras.
- **Las pistas están en la secuencia.** Una mentira nunca se ve, se mueve o llega de manera diferente a su gemelo honesto. Lo que la delata es dónde se encuentra: una formación adicional, un segundo menú, un elemento único justo después del menú.
- **La escena final** nombra la cinta, el servidor y la política. Las mentiras capturadas se muestran como trofeos. Las que escapan se muestran con su apariencia honesta. Sin puntuación, sin recuento, sin dígito.

Elige una grabación de la lista. Cada una está etiquetada como "fijo", "asiento" o "en vivo"; pasa el cursor sobre la **i** para ver la razón. "Asiento" es la configuración predeterminada para la pelea. "En vivo" está diseñada para ser superada. "Difícil" es el cuarto nivel, accesible solo desde el selector.

## Controles

Flechas izquierda y derecha (o A y D) para moverse, barra espaciadora para disparar, F para pantalla completa. Haz clic en la pantalla para reproducir la misma cinta. La siguiente cinta recorre la lista. El sonido se inicia con la primera tecla o clic; los controles de silencio, tres preajustes de sensación y un interruptor de vibración se encuentran debajo de la pantalla.

## Juega localmente

Necesitas Node 22 y pnpm 11.

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Abre la dirección que imprime Vite. Dieciséis grabaciones se incluyen en el repositorio, exportadas de [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade), el instrumento que se comunica con el servidor y guarda la cinta.

Para grabar tu propio servidor y reproducir esa cinta, ejecuta un enfrentamiento allí y luego `mcp-arcade tape receipt.json -o your.tape.json`.

## Más

El [manual](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/) es el resto del manual: las pistas, los jefes, las dificultades y cómo se construye el juego. Lo que se incluyó y cuándo, se encuentra en el [registro de cambios](CHANGELOG.md). Lo que el juego afecta, se encuentra en [SECURITY.md](SECURITY.md).

MIT. Creado por [MCP Tool Shop](https://mcp-tool-shop.github.io/).
