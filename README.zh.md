<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

**《菜单中的幽灵》** 是一款简短的复古射击游戏。你驾驶飞船在游戏场景的底部移动。在你的上方，一段 MCP 服务器和代理之间的录制片段会以波次的形式播放：握手、菜单、通话、回复，以及一个作为实验本身的 Boss。

在这些片段中，隐藏着代理不应该进行的通话。它们看起来和其他内容没什么不同，直到你击中其中一个。之后，它将在整个回合中属于你。

[在浏览器中玩](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [如何理解一个回合](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## 游戏玩法

一个 **录音带** 是一段录制片段。这款游戏只会读取录音带。它不会与服务器通信，也不会记录得分，也不会告诉你谁赢了。

- **三个灯。** Boss 的攻击或编队飞行会熄灭一个灯。捕捉从被击落的 Boss 身上掉落的灯，可以重新点亮一个灯。全部熄灭则回合结束。
- **散布。** 清除一个编队，一个散布物会向飞船方向落下。捕捉它，你的火力将在几秒钟内增强。
- **Boss 是实验，而不是指控。** “窃语者”、“菜单”和“门卫”无论是否出现问题，都会在各自的波次中出现。当波次开始时，一条简短的文字会说明实验内容，当 Boss 出现时，会说明生物的名称。
- **线索隐藏在序列中。** 谎言在外观、移动方式或出现时间上，与真实的对应物没有任何区别。真正暴露它的，是它所处的位置：一个额外的编队、第二个菜单，或者在菜单之后立即出现的一个单独的物体。
- **结局场景** 会显示录音带、服务器和策略的名称。捕捉到的谎言会以奖杯的形式呈现。逃脱的谎言则会以其真实的形式呈现。没有得分，没有计数，没有数字。

从列表中选择一个录音带。每个录音带都标有“固定”、“座位”或“实时”；将鼠标悬停在 **i** 上可以查看原因。“座位”是默认的战斗模式。“实时”模式旨在让你生存下去。

## 操作

使用左右键（或 A 和 D 键）移动，空格键射击，F 键切换全屏。点击游戏场景可以重新播放相同的录音带。按“下一步”可以浏览列表。声音会在第一次按键或点击时开始播放；静音、三种预设和震动开关位于游戏场景下方。

## 本地运行

你需要 Node 22 和 pnpm 11。

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

打开 Vite 打印的地址。十六个录音片段包含在仓库中，这些录音片段是从 [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) 导出的，该工具与服务器通信并保存录音带。

要录制你自己的服务器并播放该录音带，请在服务器上运行一个片段，然后运行 `mcp-arcade tape receipt.json -o your.tape.json`。

## 更多

[手册](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/) 是手册的其余部分：线索、Boss、难度以及游戏是如何构建的。已发布的内容以及发布时间，请参见 [changelog](CHANGELOG.md)。游戏涉及的内容，请参见 [SECURITY.md](SECURITY.md)。

MIT 许可。由 [MCP Tool Shop](https://mcp-tool-shop.github.io/) 构建。
