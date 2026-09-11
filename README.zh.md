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
  <strong>You are the agent. The rig hands you the calls.</strong>
</p>

**《菜单中的幽灵》**是一款复古射击游戏，其灵感来源于 MCP 服务器在网络上传播的信息。你扮演一名特工，被派往设施深处执行一系列任务。每次遭遇都是 MCP 服务器与特工之间的一次对话记录，这些对话以波浪的形式呈现在你的飞船上方：握手、菜单、对话、回复，以及一个本身就是实验的 Boss。

在这些互动中，存在着代理不应该发起的通话。它们看起来与其他内容没什么不同，直到你击中其中一个。之后，它将在整个回合中属于你。

[在浏览器中游玩](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [如何理解一个回合](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## 开始一轮

按下 **Shift** 键，设施会连续向你提供四次任务，这些任务是从任务列表中随机选择的，并且不会重复。每次任务都是特工被派往的一个服务器。任务之间会显示一张卡片，上面标明下一个服务器、特工执行的策略以及需要执行的工具。每次任务结束后，能量灯都会重新充满，火焰也会逐渐增强，因此最后一轮任务将从第一轮任务结束的地方开始。

在最后一轮任务结束时，这轮任务会有一个由四个词组成的名称，例如 `frost robin chalk garden`。在菜单中输入该名称，可以再次执行相同的任务，或者将其交给其他人。没有数字、没有计数、没有排名：一轮任务只是一个任务列表，而不是一个排行榜。

从列表中选择一个录音带。每个录音带都标记为“固定”、“标准”或“实时”；将鼠标悬停在 **i** 上可以查看原因。“标准”是默认的战斗。“实时”旨在让你生存下去。“硬核”是第四个难度级别，只能从选择器中选择。

## 游戏玩法

一个 **录音带** 是对一次互动的记录。这款游戏只会读取录音带。它不会与服务器通信，也不会保存得分，也不会告诉你谁赢了。

- **三个能量灯。** Boss 的攻击或编队移动会使一个能量灯熄灭。抓住从被击落的 Boss 处笔直坠落的能量灯，可以重新点亮一个。你需要移动到它的下方。所有能量灯都熄灭，则本轮结束。
- **扩散。** 清除一个编队，一个扩散物会笔直坠落。抓住它，你的火力将在几秒钟内增强。
- **Boss 是实验，而不是指责。** 无论是否出现问题，低语者、菜单和门卫都会出现在他们的回合中。他们像特工一样自言自语。硬核模式只有一个能量灯，并且从第一次攻击开始就会产生强烈的反应。
- **平行性爆发。** 座位、实时模式和硬核模式都会产生爆发，这些爆发会复制出大量的副本，并增强火力，同时音乐也会加速。它们一开始是短暂的，然后随着回合和任务的进行而逐渐增强。这种增强是数据，它会根据一组预先设定的玩家进行调整，但不会影响你。
- **线索隐藏在序列中。** 谎言在外观、移动方式和出现时间上与真实的副本没有任何区别。真正能揭示其身份的是它所处的位置：一个额外的编队、一个额外的菜单，或者在菜单之后立即出现的一个单独的单位。
- **音乐**以一首本轮游戏种子选择的歌曲开始，持续播放几分钟，然后淡出，进入下一首；Boss 会带来自己的音乐，而一轮任务会将音乐贯穿于其所有卡片。
- **结局场景**会显示磁带、服务器和策略的名称。被抓住的谎言会作为战利品展示。逃脱的谎言会以其真实的形态呈现。没有得分、没有计数、没有数字。

## Boss 可以是一个模型

在本地，一个 Ollama 模型，包括一个像 `gpt-oss:120b-cloud` 这样的云标签，可以放置在 Boss 中。它不会收到任何提示来自由发挥。它会获得设施自身的工具：`fire`（每拍一个动词：一个扇形攻击、一个倾斜、一个瞄准射击、一个屏住呼吸、雾、一个盘子）、`say`（一句话，通过一个门：十二个词，一个句子，没有数字，没有事实词，没有工具或模型名称；如果拒绝，则播放 Boss 自身的其中一个）、`speak`，以及只读的 `view` 和 `tapes`。模型提出建议；游戏决定。它永远不会看到哪些精灵是谎言，并且游戏中没有任何元素会指向它。

如果运行了一个语音工作者，每个 Boss 都会说话：它在出现时会说出它编写的台词，以及模型编写的台词。每次对话都会被语音识别器听到，并在播放之前由 [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) 进行记录，因此所说的词就是门允许的词，没有虚构的对话，也没有漏洞。如果某个对话未能通过记录，则它将保持沉默。

该设施本身就是一个通过 stdio 连接的 MCP 服务器，具有相同的六种工具，因此该工具可以播放《幽灵》自身的菜单；存储库中的四段录音是设施自身录制的。它也以 Docker 镜像的形式提供：

```bash
docker run -i --rm ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.6.0
```

一个包含工具协议和内置磁带的捆绑文件，位于 `node:22-alpine`；它可以在一个 CPU 和两个千兆字节的内存下，在不到一秒钟的时间内列出其工具，并且不需要网络即可播放。Docker MCP 目录条目草案位于 `catalog/`。

## 操作

使用左键和右键（或 A 键和 D 键）进行移动，空格键进行射击，F 键切换为全屏。点击游戏区域可以重新播放相同的磁带。下一个磁带会播放列表中的下一个内容；在一轮任务中，下一个任务会播放下一张卡片。声音会在第一次按键或点击时开始播放；静音、三个感觉预设和一个关闭摇晃的切换按钮位于游戏区域下方。**Ollama Boss** 和 **语音** 位于它们旁边，并配有一个模型选择器和一些文字，说明每个座位的用途。

## 本地游玩

你需要 Node 22 和 pnpm 11。

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

打开 Vite 打印的地址。十六个录音被包含在仓库中，并从 [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) 导出，该工具与服务器通信并保存录音带。

对于 Boss 座位，在同一台机器上运行一个 Ollama 守护程序，并勾选 **Ollama Boss**。对于语音，在 `.venv` 中创建一个 Python 3.12 虚拟环境，并安装 `kokoro-onnx`、`faster-whisper` 和 `fx-dub`，将 `KOKORO_DIR` 指向 Kokoro ONNX 权重，并在第二个终端中运行 `pnpm voice`；当工作者响应时，**语音** 框将被启用。两者都不是必需的；已发布的网站也没有这两个选项。

要记录你自己的服务器并播放该录音带，请在那里运行一次互动，然后运行 `mcp-arcade tape receipt.json -o your.tape.json`。

## 更多

[手册](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/) 是手册的其余部分：线索、Boss、难度以及游戏是如何构建的。已发布的内容以及发布时间在 [changelog](CHANGELOG.md) 中。游戏涉及的内容在 [SECURITY.md](SECURITY.md) 中。

MIT 许可。由 [MCP Tool Shop](https://mcp-tool-shop.github.io/) 构建。
