<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

**《菜单中的幽灵》** 将 MCP 服务器和代理之间的一次记录的互动转化为一款复古射击游戏的关卡。 [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) 工具运行的每一次实验都是一个关卡：一个词命名它，然后是握手、菜单、指令、回复，以及关卡中独特的 Boss。 在其中，隐藏着代理不应该发送的指令。 它们看起来与其他指令一样，直到你触发其中一个。 之后，它将属于你，直到关卡结束。

[在浏览器中运行](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [阅读手册](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/)

## 你正在射击的目标

该工具会记录每次互动：`tools/call` 发送了什么，返回了什么，以及它在“线路”上记录的事实（随后是低语，一个改变的菜单，一个被回复的“幽灵”工具）。 游戏机读取该记录，并将其排列成一个关卡。 它不会触及得分，不会与服务器通信，也不会告诉你谁赢了。 谎言是通过接触来揭示的，而不是预先标记的：不是通过外观，不是通过动作，也不是通过时间。 学习解读关卡，就是学习解读“线路”。

- **三个灯。** Boss 的攻击或潜行阵型会熄灭一个灯。 全部熄灭会提前结束关卡。
- **Boss 是实验，而不是谎言。** “低语者”、“菜单”和“守门人”会在每次同类型关卡中出现，无论是否出现问题，因此 Boss 的任何方面都不是指责。
- **三种难度。** 分别为记录难度（记录本身的等级）、“座位”难度和“实时”难度。“座位”难度是默认难度；“实时”难度旨在让人能够生存，而不是通关。
- **结束场景** 会显示记录的名称、服务器和策略。 发现的谎言会以战利品的身份保留。 未被发现的谎言则会以其原本的形态存在。 没有得分，没有计数，没有数字。

## 开始游戏

```bash
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

左右键移动，空格键射击，F 键全屏，点击游戏区域以重新开始相同的记录，在关卡结束时点击“下一个记录”以浏览记录列表。 声音会在第一次按键或点击时开始；静音、三个感觉预设和一个震动开关位于游戏区域下方。

每个游戏记录都包含在代码库中，并从该工具的“黄金记录”、其 Docker 游戏配置、其 Ollama “座位”运行和实时射击数据包中导出。 十六个记录，一个包含四个元素的目录。

## 从终端运行

```bash
pnpm test
pnpm test:play ghost --fixture naive-ndjson
pnpm film --fixture naive-ndjson --tier 1
pnpm sweep
```

`test:play` 是验收测试：一个脚本化的机器人会玩完整一个关卡，并且会检查记录中必须出现和不应该出现的内容，直到出现结束画面。 `film` 通过相同的渲染器将关卡的帧写入 PNG 文件，该渲染器也是游戏使用的。 `sweep` 使用每个机器人播放每个关卡中的每个难度等级，并打印平衡表。

## 公平性测试

三个脚本化的机器人会播放每个记录中的所有关卡。 **“闲置者”** 既不会移动也不会射击，并且必须在“座位”和“实时”难度下失去所有灯。 **“清扫者”** 会追逐最近的精灵，并始终射击，并且必须在记录难度下生存，并找到一半的谎言。 **“读者”** 仅在序列提示时射击，并躲避即将发生的事情，并且必须在记录难度和“座位”难度下揭示所有谎言。 该测试还以条形图的形式显示难度曲线，因此，如果调整导致游戏变得过于简单或过于困难，则构建将失败。 所有调整都以数据形式存在于 `packages/ghost-on-the-menu/patterns/` 中：入口路径、阵型、射击节奏、潜行、Boss、梯子、关卡节奏。

## 信任和威胁模型

游戏机读取记录，但不写入任何内容。

- **触及的数据：** 位于 `fixtures/tapes/` 中的记录文件（捆绑到浏览器构建中）和模式数据。 记录包含“线路”事件、原子 ID、工具名称以及工具记录的事实。 加载器会拒绝任何包含得分、判决、操作员调用或 NRP 的记录，无论其深度如何，因此游戏无法显示它从未获得的内容。
- **未触及的数据：** 没有记录、没有证据、没有工具代码、没有 MCP 连接、没有来自游戏的文件系统写入。
- **权限：** 一个浏览器。 终端工具在 Node 下运行，并读取代码库中的游戏配置。
- **网络：** 无。 游戏是静态文件，位于一个源头上。
- **遥测：** 无。 **秘密：** 无。

精灵是在合作伙伴的图像 API 上生成的，并作为文件提交；它们的来源和许可条款位于 `docs/art/receipts.json` 中。 它们是游戏资源，不能用于训练模型。 请参阅 [SECURITY.md](SECURITY.md)。

## 布局

| 路径                         | 内容                                                               |
| ---------------------------- | ------------------------------------------------------------------ |
| `packages/tape-core`         | 加载记录，拒绝禁止的键，按原子切片，保留评分规则以供未来游戏机使用 |
| `packages/ghost-on-the-menu` | 预处理、模拟、渲染器、提示、声音、机器人、模式数据                 |
| `apps/cabinets`              | 浏览器游戏                                                         |
| `fixtures/tapes`             | 从 mcp-arcade 导出的记录                                           |
| `scripts/`                   | `test:play`, `film`, `sweep`                                       |
| `docs/`                      | 设计锁定及其引用记录、艺术简报及其记录、第二波部署                 |

设计已在 `docs/study-swarm.dispatch.md` 中锁定（G1 到 G10）。 “家庭拜访”，一个回合制校准游戏，已停留在提交 152f548，直到存在一个可以玩的设计。

与 Grok 合作构建，作为设计合作伙伴和跨家族验证者：Grok 编写了记录加载器和模拟器，Claude 编写了游戏和演示，双方都对对方的工作进行了审查。

Node 22 或更高版本。 版本 0.2.0。 MIT 许可。

<p align="center">Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a></p>
