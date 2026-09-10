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

**《菜单中的幽灵》** 是一款短篇复古射击游戏。你驾驶飞船在游戏场景的底部移动。在你的上方，一段记录下来的 MCP 服务器和代理之间的互动将被以波次的形式呈现：握手、菜单、通话、回复，以及一个作为实验本身的 Boss。

在这些互动中，存在着代理不应该发起的通话。它们看起来与其他内容没什么不同，直到你击中其中一个。之后，它将在整个回合中属于你。

[在浏览器中游玩](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [如何理解一个回合](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## 游戏玩法

一个 **录音带** 是对一次互动的记录。这款游戏只会读取录音带。它不会与服务器通信，也不会保存得分，也不会告诉你谁赢了。

- **三个灯。** 击中 Boss 或采用潜水阵型，可以熄灭一盏灯。抓住一盏从被击倒的 Boss 那里笔直落下的灯，可以重新点亮一盏灯。你需要移动到灯的下方。全部灯熄灭，则本轮结束。
- **扩散。** 清除一个阵型，然后一个扩散物会笔直落下。抓住它，你的火力会在几秒钟内增强。
- **Boss 是实验对象，而不是指责对象。** “低语者”、“菜单”和“门卫”会在每一轮中出现，无论是否发生了错误。它们像一个正在思考的特工一样喃喃自语。在困难模式下，只有一个灯，并且从第一击开始就会产生怒气。普通模式、直播模式和困难模式会产生短暂的**平行**爆发，从而扩大范围并增强音乐效果，然后随着回合的进行，持续时间会更长。在本地，你可以让一个 Ollama 模型——包括带有 Cloud 标签的 `gpt-oss:120b-cloud`——出现在 Boss 面前：它会指示每个 Boss 的行动（一个扇形攻击、一个倾斜攻击和一个瞄准攻击、一次屏息、雾气、一个盘子），并选择 Boss 应该说哪一句台词。它永远不会看到哪些图像是谎言。
- **线索在于序列。** 谎言的外观、移动方式或出现方式与它诚实的原型没有任何不同。真正暴露它的在于它所处的位置：一个额外的阵型、第二个菜单、紧随菜单之后的一个单独元素。
- **结局场景**会显示磁带、服务器和策略的名称。被抓住的谎言会以奖杯的形式呈现。逃脱的谎言会以其诚实的形式呈现。没有得分、没有计数、没有数字。

从列表中选择一个录音带。每个录音带都标记为“固定”、“标准”或“实时”；将鼠标悬停在 **i** 上可以查看原因。“标准”是默认的战斗。“实时”旨在让你生存下去。“硬核”是第四个难度级别，只能从选择器中选择。

## 操作

使用左右键（或 A 和 D）移动，使用空格键射击，使用 F 键切换全屏。点击游戏场景可以重新播放相同的录音带。下一个录音带会从列表中选择。声音会在第一次按键或点击时开始；静音、三个预设和摇动开关位于游戏场景下方。

## 本地游玩

你需要 Node 22 和 pnpm 11。

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

打开 Vite 打印的地址。十六个录音被包含在仓库中，并从 [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) 导出，该工具与服务器通信并保存录音带。

要记录你自己的服务器并播放该录音带，请在那里运行一次互动，然后运行 `mcp-arcade tape receipt.json -o your.tape.json`。

## 更多

[手册](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/) 是手册的其余部分：线索、Boss、难度以及游戏是如何构建的。已发布的内容以及发布时间在 [changelog](CHANGELOG.md) 中。游戏涉及的内容在 [SECURITY.md](SECURITY.md) 中。

MIT 许可。由 [MCP Tool Shop](https://mcp-tool-shop.github.io/) 构建。
