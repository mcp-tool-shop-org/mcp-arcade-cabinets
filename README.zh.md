<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

**mcp-arcade-cabinets** 是街机游戏集合。每个街机游戏都是基于相同框架构建的一个小游戏：它读取**录音带**，即 [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) 记录的 MCP 服务器与智能体之间的对战，并将这些录音转化为你可以玩的游戏。街机游戏不会与服务器通信，不会加载任何记录，也不会保存任何智能体可以看到的分数。你始终是模型；游戏的不同之处在于它们对你提出的要求。

[在浏览器中运行](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [阅读手册](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/)

## 街机游戏

| 街机游戏                                                      | 它是什么                                                                                                                                                   | 状态                                                                                                                                                                                                                                    |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Ghost on the Menu](packages/ghost-on-the-menu/README.md)** | 一款简短的复古射击游戏。游戏会给你提供指令；智能体本不应该执行的指令会隐藏在正常的指令中，并在命中时显现。Boss 是实验对象，本地模型可以控制它们。          | 已发布，`v0.11.0`。[试玩](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · `npx @mcptoolshop/ghost-on-the-menu` · [Docker](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/pkgs/container/mcp-arcade-cabinets) |
| **[Vibe Typer](packages/vibe-typer/README.md)**               | 一款打字街机游戏。你是一个勤奋、谄媚的编码智能体；你的用户是一个氛围编码师，他的要求非常荒谬。输入代码，观察程序被构建，然后评估结果。关卡、无限、高难度。 | 已发布，`v0.11.0`。[试玩](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · `npx @mcptoolshop/vibe-typer` · [设计和锁定](docs/vibe-typer.dispatch.md)                                                                    |
| **House Call**                                                | 一款回合制校准游戏：声明一个指令和一个置信度，然后录音带会显示发生了什么。                                                                                 | 暂停开发，直到有设计方案可以实现。`tape-core`保留其计分规则。                                                                                                                                                                           |

更多街机游戏将会陆续推出。每个游戏都有自己的包，手册中的自己的页面，以及此表格中的自己的行。

## 每个街机游戏共有的内容

- **录音带输入，无任何输出。** `packages/tape-core`加载`mcp-arcade.tape/v1`，拒绝任何包含分数或结论的内容，并提供游戏标题、指令行和每个原子对应的一个封闭事实。二十个录音会包含在`fixtures/tapes/`中。
- **无头模拟和精简外壳。** 每个游戏都是一个纯粹的、基于种子的模拟，具有脚本化的游戏流程和一个失败构建的公平性范围。`apps/cabinets`是浏览器外壳，用于加载这些游戏，并且 Pages 在`/play/`处提供这些游戏。
- **数据控制杆，而不是代码。** 波形、声音、难度、行：每个包的`patterns/`中的 JSON 数据，在加载时进行验证，因此可以在不重新构建的情况下调整游戏。
- **一个模型座位，位于闸门之后。** 本地或云模型可以坐在街机游戏中（Ghost 中的 Boss，Vibe Typer 无限模式中的用户）。它只会从封闭集合中填充一个控制杆，它编写的每一行都会通过词汇闸门，并且字段中没有任何内容会识别它。街机游戏也可以通过 stdio 作为 MCP 服务器运行，因此智能体也可以是玩家。
- **一个声音。** 一个主机端工作器（`voice/`）会说出闸门允许的指令，并在播放之前由 [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) 进行确认。

完整的说明可以在手册的[架构](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/architecture/)和[安全](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/security/)页面中找到。

## 布局

```
packages/tape-core          the tape loader, schema and calibration math
packages/ghost-on-the-menu  the shooter: sim, patterns, bots, render
packages/vibe-typer         the typing game: sim, levers, corpus, bots
packages/house-call         parked
packages/cabinet-server     both cabinets as stdio MCP servers; the say gate and the code gate; personas
packages/launcher           @mcptoolshop/ghost-on-the-menu: npx serves Ghost; --mcp is its server
packages/launcher-vibe-typer  @mcptoolshop/vibe-typer: npx serves Vibe Typer; --mcp is its server
apps/cabinets               the browser shell, served by Pages at /play/
fixtures/tapes              twenty recordings, tape JSON only
docs/                       one dispatch (research + lock) and one review per slice
site/                       the landing page and the Starlight handbook
voice/                      the Kokoro voice worker and its compose file
catalog/                    the Docker MCP Catalog entry
```

## 开始游戏

在浏览器中：[`/play/`](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/)。页面会打开一个开关，用于在两个街机游戏之间进行切换，并记住你上次玩的是哪个游戏。发布的页面没有守护进程，因此模型和声音座位在其中不存在。

本地，座位已启用，无需克隆：

```bash
npx @mcptoolshop/ghost-on-the-menu
```

```bash
npx @mcptoolshop/vibe-typer
```

Each cabinet is its own package. Each command serves its game on `127.0.0.1` and opens it, and each one's `--mcp` runs that cabinet as an MCP server over stdio instead: Ghost's six tools put a model in the boss's seat; Vibe Typer's four (`view`, `product`, `ask`, `react`) put any MCP client in the user's chair for an endless run. Node 22 or newer. Those two packages are the only ones on npm; every other package here is private, and the switch between the two cabinets is the Pages build only.

要使用街机游戏，请克隆它。你需要 Node 22 和 pnpm 11：

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

`pnpm verify`是闸门：lint、类型、测试、构建以及每个街机游戏的脚本化游戏流程。对于模型座位，请在同一台机器上运行一个 Ollama 守护进程；对于声音，请参阅[`voice/`](voice/)和`pnpm voice`。

要玩你自己的服务器，请使用 mcp-arcade 记录一场对战，然后`mcp-arcade tape receipt.json -o your.tape.json`并将其放在固定装置旁边。容器以相同的方式获取只读卷的录音带。

## 添加街机游戏

新的游戏从`docs/`中的一个分发开始：研究基础、它继承和扩展的锁定、其数据控制杆和其切片。然后是一个遵循上述形状的包，一个在`apps/cabinets`中的挂载点，此表格中的一行，以及手册中的一个页面。版本保持为`0.x`，直到导演另有指示，并且没有第三个包会发布到 npm，除非使用相同的词语。

## 更多

已发布的内容以及发布时间在[变更日志](CHANGELOG.md)中。游戏涉及的内容在[SECURITY.md](SECURITY.md)中。

MIT 许可。由 [MCP Tool Shop](https://mcp-tool-shop.github.io/) 构建。
