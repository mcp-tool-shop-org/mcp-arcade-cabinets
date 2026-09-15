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

按住 **Shift** 键，游戏会连续提供四个任务，这些任务来自任务列表，并且不会连续出现两次相同的四个任务。每个任务都是指派给特工执行的服务器，每个任务都是不同的房间：压力、区域防御、休息，然后是高潮。一张卡片会显示下一个服务器、策略以及特工被要求执行的任务和战斗内容——一次坚定的握手、一道横跨通道的屏障、一次高潮之间的休息、一面赭色的目录墙。每次任务都会补充灯光。火焰会随着任务的进行而不断升温；这种升温是热度，而不是新的故事。

在最后一轮任务结束时，这轮任务会有一个由四个词组成的名称，例如 `frost robin chalk garden`。在菜单中输入该名称，可以再次执行相同的任务，或者将其交给其他人。没有数字、没有计数、没有排名：一轮任务只是一个任务列表，而不是一个排行榜。

从列表中选择一个录音带。每个录音带都标记为“固定”、“标准”或“实时”；将鼠标悬停在 **i** 上可以查看原因。“标准”是默认的战斗。“实时”旨在让你生存下去。“硬核”是第四个难度级别，只能从选择器中选择。

## 游戏玩法

一个 **录音带** 是对一次互动的记录。这款游戏只会读取录音带。它不会与服务器通信，也不会保存得分，也不会告诉你谁赢了。

- **三盏灯。** 一次强力射击或一次潜水阵型可以熄灭一盏灯。抓住一盏从被击倒的 Boss 处笔直坠落的灯，可以重新点亮一盏。你必须移动到灯的下方。全部熄灭将结束本回合。
- **分散。** 清除一个阵型，一个分散的灯光会笔直坠落。抓住它，你的火力将在几秒钟内扩散。
- **Boss 是实验，而不是指责。** 无论是否出现问题，低语者、菜单和门卫都会出现在他们的回合中。在一次任务中，检查会与档案管理员结束（一面目录墙）。他们像特工一样自言自语。硬核模式是一盏灯和从第一次射击开始的愤怒。
- **平行性爆发。** 座位、实时模式和硬核模式会产生爆发，这些爆发会通过真实的副本来增加场上的元素，并使火焰升温，同时音乐也会加速。它们一开始是短暂的，然后随着回合的进行而不断增加，并且在一次任务中，每个任务都会增加。这种增加是数据，它会根据一组预先编写的玩家进行调整，但不会针对你。
- **线索在于序列。** 谎言看起来、移动或出现的方式与它真实的对应物没有任何不同。真正揭示它的在于它所处的位置：一个额外的阵型、第二个菜单、在菜单之后立即出现的一个单一元素。在一次任务中，额外的结构可以加入房间——一个快速移动的探测器、一道横跨通道的屏障、一叠账本——它们仍然与真实的对应物共享，直到你击中它们。
- **音乐** 遵循卡片，但一首歌曲在播放完一个循环（大约半分钟）后就会停止。毒药仍然需要毒药；低语者仍然需要低语者。床位于射击和捕捉下方；静音仍然会同时杀死所有东西。一次任务会将音乐带入其卡片中。
- **结局场景** 会显示磁带、服务器和策略。被捕获的谎言会作为战利品。逃脱的谎言会以其真实的颜色呈现。没有得分，没有计数，没有数字。

## Boss 可以是一个模型

在本地，一个 Ollama 模型，包括一个像 `gpt-oss:120b-cloud` 这样的云标签，可以位于 Boss 中。它不会收到任何提示来自由发挥。它会获得柜子自己的工具：`fire`（每个节拍一个动词：一个扇形、一个倾斜和一个瞄准射击、一次屏住呼吸、雾、一个盘子）、`say`（它自己的一行，穿过一个门：十二个单词，一个句子，没有数字，没有事实性词语，没有工具或模型名称；被拒绝的行会播放 Boss 自己的其中一个）、`speak`，以及只读的 `view` 和 `tapes`。它还可以将接下来的几个合法的动词排队，等待下一个节拍；一个悬而未决的答案就是剧本，而不是停顿。在射击之后，选择器会编写一行封闭的库代码。模型会提出建议；游戏会做出决定。它永远不会看到哪些精灵是谎言，并且场上的任何东西都不会识别它。发布的网站没有守护进程，因此它会省略 Ollama 和 Voice 插件。

如果运行了一个语音工作者，每个 Boss 都会说话：它在出现时会说出它编写的台词，以及模型编写的台词。每次对话都会被语音识别器听到，并在播放之前由 [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) 进行记录，因此所说的词就是门允许的词，没有虚构的对话，也没有漏洞。如果某个对话未能通过记录，则它将保持沉默。

该设施本身就是一个通过 stdio 连接的 MCP 服务器，具有相同的六种工具，因此该工具可以播放《幽灵》自身的菜单；存储库中的四段录音是设施自身录制的。它也以 Docker 镜像的形式提供：

```bash
docker run -i --rm ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.7.0
```

一个捆绑的文件位于 `node:22-alpine`，其中包含工具协议和烘焙好的磁带；它会在不到一秒钟的时间内，在单个 CPU 和两个千兆字节的内存下列出其工具，并且不需要网络即可运行。一个可选的只读卷可以覆盖额外的操作员磁带，这些磁带将添加到那二十个磁带中。目录列表是静止的（网络关闭，图像中没有声音）。Docker MCP 目录条目是在 `catalog/` 下编写的。仅主机模式的本地图像位于 `voice/compose.host.yaml`。

## 操作

使用左键和右键（或 A 键和 D 键）进行移动，使用空格键进行射击，使用 F 键进行全屏显示。单击该区域以重新播放相同的磁带。下一个磁带会遍历列表；在一次任务中，下一个任务会选择下一张卡片。声音会在第一次按键或单击时开始；静音、三个感觉预设和一个关闭切换按钮位于该区域下方。难度设置位于“播放”行中（硬核模式是一盏灯和掉落的盘子）。在本地，**Ollama Boss** 和 **Voice** 位于它们旁边，还有一个模型选择器和一些文字，说明每个座位正在做什么。发布的 `/play/` 页面是该区域、声音、感觉、关闭切换和难度设置。

## 本地游玩

一个命令，无需克隆：

```bash
npx @mcptoolshop/ghost-on-the-menu
```

这将在 `127.0.0.1` 上提供该柜子并打开它。与发布的页面不同，这个页面可以访问你自己的机器上的 Ollama 守护进程和一个语音工作器，因此座位会亮起。`--mcp` 会以 MCP 服务器的形式通过 stdio 运行相同的柜子，供特工使用；`--help` 列出了其余部分。Node 22 或更高版本，没有其他要求。

要对其进行操作，请克隆它——你需要 Node 22 和 pnpm 11：

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
