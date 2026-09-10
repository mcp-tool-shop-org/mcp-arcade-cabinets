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

- **3つのランプ。** ボスの攻撃や、特定の編隊がランプを消します。撃破されたボスから落ちてくるランプを捕獲すると、ランプを再び点灯させることができます。すべてのランプが消えると、ラウンドは終了します。
- **スプレッド。** 編隊をクリアすると、スプレッドが飛行機に向かって落ちてきます。それを捕獲すると、数秒間、攻撃範囲が広がります。
- **ボスは実験であり、告発ではありません。** ウィスパーラー、メニュー、ドアマンは、何らかの問題が発生したかどうかに関わらず、それぞれの波で登場します。波が開始されるときに実験の名前が、ボスが登場するときにクリーチャーの名前が表示されます。
- **手がかりは、その並びの中にあります。** 嘘は、真実の姿とは異なって見えることも、動くことも、現れることもありません。嘘を明らかにするのは、その位置です。追加の編隊、2つ目のメニュー、メニューの直後に現れる単独のオブジェクトなどです。
- **エンディングシーン**では、テープ、サーバー、ポリシーの名前が表示されます。捕獲された嘘は、トロフィーとして表示されます。逃げ出した嘘は、本来の姿で表示されます。スコア、カウント、数字はありません。

リストからテープを選択します。各テープには、フィクスチャ、シート、ライブというラベルが付いています。**i**にマウスオーバーすると、その理由が表示されます。シートはデフォルトの戦闘です。ライブは、生き残ることを目的としています。

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
