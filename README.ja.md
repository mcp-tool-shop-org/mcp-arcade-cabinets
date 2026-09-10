<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

**ゴースト・オン・ザ・メニュー**は、短いレトロスタイルのシューティングゲームです。プレイヤーは、画面下部を飛行機で移動させます。画面上部には、MCPサーバーとエージェント間の記録された戦闘が、波のように展開されます。ハンドシェイク、メニュー、通信、応答、そして実験そのものであるボスが登場します。

その中に、エージェントが本来行うべきではなかった通信が含まれています。それらは他のものと変わらないように見えますが、一度触れると、ゲームの残り時間、プレイヤーの所有物となります。

[ブラウザでプレイ](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) ・ [ラウンドの読み方](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## ゲームの進め方

**テープ**は、1回の戦闘の記録です。このゲームは、テープのみを読み込みます。サーバーとの通信は行わず、スコアも記録せず、勝者が誰であるかも教えてくれません。

- **Three lamps.** A boss shot or a diving formation puts one out. Catch a lamp that falls **straight down** from a downed boss to relight one. You have to move under it. All out ends the round.
- **Spread.** Clear a formation and a spread falls straight down. Catch it and your fire fans for a few seconds.
- **Bosses are the experiment, not the accusation.** The Whisperer, the Menu and the Doorman show up for their wave whether or not anything went wrong. They mutter like an agent thinking out loud. Hardcore is one lamp and rage from the first shot. Seat, live and hardcore get short **parallelism** bursts that multiply the field and heat the music, then hold longer as the round goes on. Locally, you can let an Ollama model — including a Cloud tag like `gpt-oss:120b-cloud` — sit in the boss: it calls each boss’s shots (a fan, a lean and an aimed shot, a held breath, fog, the plate) and picks which of the boss’s own lines it says. It never sees which sprites are lies.
- **The tells are in the sequence.** A lie never looks, moves or arrives differently from its honest twin. What gives it away is where it sits: an extra formation, a second menu, a singleton right after the menu.
- **The end scene** names the tape, the server and the policy. Caught lies sit as trophies. Escaped ones sit in their honest paint. No score, no count, no digit.

リストからテープを選択してください。それぞれのテープには、「通常」、「ライブ」、「ハードコア」というラベルが付いています。ラベルにマウスオーバーすると、その理由が表示されます。「通常」がデフォルトの戦闘モードです。「ライブ」は、生き残ることを目的としたモードです。「ハードコア」は、セレクターからのみ選択できる、4番目の難易度です。

## 操作方法

左右（またはAとD）で移動、スペースキーで発射、Fキーでフルスクリーン表示。フィールドをクリックすると、同じテープを再生できます。次のテープに進むと、リストが更新されます。サウンドは、最初のキーを押すか、クリックすると開始されます。ミュート、3つのプリセット、および振動オフの切り替えは、フィールドの下にあります。

## ローカルでプレイ

Node 22とpnpm 11が必要です。

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Viteが印刷するアドレスを開きます。リポジトリには、16個の録音が含まれており、サーバーと通信し、テープを記録するツールである[mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade)からエクスポートされています。

独自のサーバーを記録し、そのテープを再生するには、そこで戦闘を実行し、次に`mcp-arcade tape receipt.json -o your.tape.json`を実行します。

## 詳細

[ハンドブック](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/)には、ゲームの残りのマニュアルが含まれています。手がかり、ボス、難易度、ゲームの構成方法などです。出荷されたものと、その時期は、[変更ログ](CHANGELOG.md)に記載されています。ゲームが扱うものは、[SECURITY.md](SECURITY.md)に記載されています。

MITライセンス。 [MCP Tool Shop](https://mcp-tool-shop.github.io/)によって作成されました。
