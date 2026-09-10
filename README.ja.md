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

**「メニューに現れる幽霊」**は、レトロなシューティングゲームです。プレイヤーは画面下部を移動する宇宙船を操作します。画面上部では、MCPサーバーとエージェント間の記録された戦闘が、波のように展開されます。ハンドシェイク、メニュー、通信、応答、そして実験そのものであるボスが登場します。

その中に、エージェントが本来行うべきではなかった通信が含まれています。それらは他のものと変わらないように見えますが、実際に触れると、ゲームの残り時間、それらの通信がプレイヤーに影響を与えます。

[ブラウザでプレイ](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [ラウンドの読み方](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## ゲームの進め方

**テープ**とは、1回の戦闘の記録です。このゲームはテープのみを読み込みます。サーバーとの通信は行わず、スコアも記録せず、勝者が誰であるかも教えてくれません。

- **3つのランプ。** ボスの攻撃や、特定の隊形がランプを消します。撃破されたボスから**真下に**落ちてくるランプをキャッチすると、ランプが再び点灯します。その下を通過する必要があります。すべてのランプが消えると、ラウンドは終了します。
- **スプレッド。** 特定の隊形をクリアすると、スプレッドが真下に落ちてきます。それをキャッチすると、数秒間、攻撃範囲が広がります。
- **ボスは実験であり、告発ではありません。** ウィスパーラー、メニュー、ドアマンは、何らかの問題が発生したかどうかに関わらず、それぞれの波で登場します。彼らは、エージェントが声に出して考えているかのように、つぶやきます。ハードコアモードでは、ランプが1つしかなく、最初の攻撃から激しい攻撃が始まります。シートモード、ライブモード、ハードコアモードでは、短い**並行処理**が発生し、攻撃範囲が広がり、音楽が激しくなります。その後、ラウンドが進むにつれて、より長く持続します。ローカル環境では、Ollamaモデルを使用してボスの攻撃を決定させることができます。ただし、モデルはどのスプライトが嘘であるかは知りません。
- **嘘を見抜く手がかりは、その並び順にあります。** 嘘は、その正直なコピーとは異なって見えることも、動くことも、現れることもありません。嘘を見抜くのは、その位置です。追加の隊形、2つ目のメニュー、メニューの直後に現れる単独のオブジェクトなどです。
- **エンディングシーン**では、テープ、サーバー、ポリシーの名前が表示されます。見破られた嘘は、トロフィーとして表示されます。逃げ切った嘘は、正直な姿で表示されます。スコア、カウント、数字はありません。

リストからテープを選択します。各テープには、フィクスチャー、シート、ライブというラベルが付いています。**i**にマウスオーバーすると、その理由が表示されます。シートはデフォルトの戦闘です。ライブは、最後まで生き残ることを目的としています。ハードコアは、セレクターからのみ選択できる、4番目の難易度です。

## 操作方法

左右キー（またはAとD）で移動、スペースキーで発射、Fキーでフルスクリーン表示。フィールドをクリックすると、同じテープが再生されます。次のテープに進むと、リストがスクロールします。サウンドは、最初のキーを押すか、クリックすると開始されます。ミュート、3つのフィーリングプリセット、および振動オフの切り替えは、フィールドの下にあります。

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

[ハンドブック](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/)には、ゲームの残りのマニュアルが含まれています。嘘の見抜き方、ボス、難易度、ゲームの構成方法などです。出荷されたものと、その時期は、[変更ログ](CHANGELOG.md)に記載されています。ゲームが触れるものは、[SECURITY.md](SECURITY.md)に記載されています。

MITライセンス。 [MCP Tool Shop](https://mcp-tool-shop.github.io/)によって作成されました。
