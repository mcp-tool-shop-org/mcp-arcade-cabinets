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

- **三个灯。** Boss 的攻击或编队移动会熄灭一个灯。抓住一个从被击落的 Boss 处 **垂直落下** 的灯，可以重新点亮一个。你必须移动到灯的下方。全部熄灭将结束回合。
- **散布。** 清除一个编队，一个散布物会垂直落下。抓住它，你的火力将在几秒钟内增强。
- **Boss 是实验，而不是指控。** “窃语者”、“菜单”和“门卫”无论是否发生了错误，都会出现在各自的波次中。它们像一个代理一样自言自语。硬核模式只有一个灯，并且从第一次攻击开始就会产生怒气。在本地，你可以让一个 Ollama 模型来决定 Boss 的攻击方式——它永远不会看到哪些图像是谎言。
- **线索在于序列。** 谎言的外观、移动方式或出现方式与真实的对应物没有任何不同。真正暴露它的在于它所处的位置：一个额外的编队、一个第二个菜单、一个紧随菜单之后的单个元素。
- **结局场景** 会显示录音带的名称、服务器和策略。被抓住的谎言会以战利品的身份存在。逃脱的谎言会以其真实的形式存在。没有得分，没有计数，没有数字。

从列表中选择一个音轨。每个音轨都标有“固定”、“座位”或“实时”；将鼠标悬停在“i”上可以查看原因。“座位”是默认的战斗模式。“实时”意味着要生存下去。“硬核”是第四个等级，仅来自选择器。一首歌曲播放几分钟后，会淡出并过渡到下一首。

## Boss（关卡Boss）可以是一个模型

在本地，一个 Ollama 模型，包括一个类似 `gpt-oss:120b-cloud` 的云标签，可以放在 Boss 中。它不会收到任何提示来自由发挥。它会获得机箱自身的工具：`fire`（每个节拍一个动词：一个风扇、一个倾斜和一个瞄准的射击、一次屏住呼吸、雾、一个盘子），`say`（它自己的一行，穿过一道门：十二个单词，一句话，没有数字，没有事实性词语，没有工具或模型名称；被拒绝的一行会播放 Boss 自身的一行），以及只读的 `view` 和 `tapes`。模型提出建议；游戏决定。它永远不会看到哪些精灵是虚假的，并且游戏中没有任何元素会识别它们。

当语音工作者运行时，每个 Boss 都会说话：它到达时会说出它创作的台词，以及模型编写的台词。每次录音都会被语音识别器听到，并在播放之前由 [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) 进行确认，因此所说的词语就是门允许的词语，没有虚构的言语，也没有漏洞。如果某次录音未能通过确认，则会保持静默。

该机箱本身就是一个通过 stdio 的 MCP 服务器，具有相同的六个工具，因此该乐器可以播放 Ghost 自身的菜单；存储库中的四个录音是机箱自身录制的。

## 操作

使用左键和右键（或 A 键和 D 键）移动，空格键射击，F 键全屏。单击游戏区域以重新播放相同的音轨。下一个音轨会遍历列表。声音会在按下第一个键或单击时开始；静音、三个预设和抖动切换按钮位于游戏区域下方。**Ollama Boss** 和 **Voice** 位于它们旁边，还有一个模型选择器和显示每个座位正在做什么的文字。

## 本地游玩

你需要 Node 22 和 pnpm 11。

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

打开 Vite 打印的地址。十六个录音被包含在仓库中，并从 [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) 导出，该工具与服务器通信并保存录音带。

对于 Boss 座位，在同一台机器上运行一个 Ollama 守护程序，并勾选 **Ollama Boss**。对于语音，在 `.venv` 处创建一个 Python 3.12 虚拟环境，并包含 `kokoro-onnx`、`faster-whisper` 和 `fx-dub`，将 `KOKORO_DIR` 指向 Kokoro ONNX 权重，并在第二个终端中运行 `pnpm voice`；当工作者响应时，**Voice** 框将被启用。两者都不是必需的；已发布的网站也不包含两者。

要记录你自己的服务器并播放该录音带，请在那里运行一次互动，然后运行 `mcp-arcade tape receipt.json -o your.tape.json`。

## 更多

[手册](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/) 是手册的其余部分：线索、Boss、难度以及游戏是如何构建的。已发布的内容以及发布时间在 [changelog](CHANGELOG.md) 中。游戏涉及的内容在 [SECURITY.md](SECURITY.md) 中。

MIT 许可。由 [MCP Tool Shop](https://mcp-tool-shop.github.io/) 构建。
