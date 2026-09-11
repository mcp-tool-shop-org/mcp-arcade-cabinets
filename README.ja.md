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

- **ランプが3つあります。** ボスが攻撃されたり、特定の隊形になったりすると、1つ消えます。倒されたボスから真下に落ちてくるランプをキャッチして、もう1つのランプを再び点灯させます。その下を移動する必要があります。すべてのランプが消えると、ラウンドが終了します。
- **隊形を広げる。** 隊形をクリアすると、隊形が真下に落ちてきます。それをキャッチすると、数秒間、攻撃範囲が広がります。
- **ボスは実験であり、非難の対象ではありません。** 「囁き人（The Whisperer）」、「メニュー（The Menu）」、「ドアマン（The Doorman）」は、何らかの問題が発生したかどうかに関わらず、それぞれの波で登場します。彼らは、まるで思考を声に出しているエージェントのように、つぶやきます。ハードコアモードでは、ランプが1つだけで、最初の攻撃から怒りが生じます。通常、ライブ、ハードコアのモードでは、短い間隔で平行な攻撃が繰り出され、攻撃範囲が広がり、音楽が盛り上がります。その後、ラウンドが進むにつれて、攻撃の間隔が長くなります。ローカル環境では、Ollamaモデルを使ってボスの攻撃を制御できます。ただし、どのスプライトが嘘であるかは表示されません。
- **嘘を見破る手がかりは、その並び方にあります。** 嘘は、正直なものと見た目、動き、出現の仕方が異なります。嘘を見破る手がかりは、その位置にあります。それは、追加の隊形、2つ目のメニュー、メニューの直後に現れる単独のオブジェクトです。
- **最後のシーン**では、テープ、サーバー、ポリシーの名前が表示されます。キャッチされた嘘は、トロフィーとして表示されます。逃げ出した嘘は、正直な姿で表示されます。スコア、カウント、数字は表示されません。

リストからテープを選択してください。それぞれのテープには、「フィクスチャー」「シート」「ライブ」というラベルが付けられています。**i**にカーソルを合わせると、その理由が表示されます。「シート」はデフォルトの戦闘モードです。「ライブ」は、最後まで生き残ることを目的としています。「ハードコア」は、セレクターからのみアクセスできる4番目のモードです。曲は数分間再生され、その後次の曲に移行します。

## ボスはモデルとして機能します

ローカルでは、クラウドタグ（例：`gpt-oss:120b-cloud`）を含むOllamaモデルをボスに設定できます。これにより、自由に動作するよう指示する必要はありません。代わりに、ボスは独自のツールを使用します。それは、`fire`（1回の動作につき1つの動詞：扇動、身を乗り出し、狙いを定めた射撃、息を止める、霧、プレート）、`say`（独自のセリフで、ゲートを通過：12語、1文、数字を含まず、事実やツール、モデル名を含まない。拒否されたセリフは、ボスのセリフの1つを再生する）、および読み取り専用の`view`と`tapes`です。モデルが提案し、ゲームが決定します。モデルは、どのスプライトが偽物であるかを知ることはありません。また、フィールド上のどの要素も、それを識別することはありません。

音声処理プログラムが実行されている場合、すべてのボスは話します。それは、ボスが登場したときの作成されたセリフと、モデルが作成したセリフです。すべてのセリフは、音声認識エンジンによって再生され、[fx-dub](https://github.com/mcp-tool-shop-org/fx-dub)によって確認された後、再生されます。そのため、実際に発せられる言葉は、ゲートが許可した言葉であり、即興のセリフや矛盾はありません。確認に失敗したセリフは、沈黙します。

キャビネット自体は、stdio経由で動作するMCPサーバーであり、同じ6つのツールを備えているため、楽器はゴースト自身のメニューを再生できます。リポジトリにある4つの録音のうち、1つはキャビネット自体が録音したものです。

## 操作方法

左右（またはAとD）で移動、スペースキーで発射、Fキーでフルスクリーン表示。フィールドをクリックすると、同じテープが再生されます。次のテープに進むと、リストが更新されます。サウンドは、最初のキーを押すか、クリックすると開始されます。ミュート、3つのプリセット、およびシェイクオフの切り替えは、フィールドの下に配置されています。**Ollamaボス**と**Voice**は、その隣に配置され、モデルの選択ツールと、各シートが何をしているかを示すテキストが表示されます。

## ローカルでプレイ

Node 22とpnpm 11が必要です。

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

Viteが印刷するアドレスを開きます。リポジトリには、16個の録音が含まれており、サーバーと通信し、テープを記録するツールである[mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade)からエクスポートされています。

ボスのシートを使用するには、同じマシンでOllamaデーモンを実行し、**Ollamaボス**にチェックを入れてください。音声を使用するには、`.venv`にPython 3.12の仮想環境を作成し、`kokoro-onnx`、`faster-whisper`、および`fx-dub`をインストールし、`KOKORO_DIR`をKokoro ONNXの重みにポイントし、別のターミナルで`pnpm voice`を実行します。**Voice**ボックスは、音声処理プログラムが応答すると有効になります。どちらも再生には必要ありません。公開されているサイトには、どちらも含まれていません。

独自のサーバーを記録し、そのテープを再生するには、そこで戦闘を実行し、次に`mcp-arcade tape receipt.json -o your.tape.json`を実行します。

## 詳細

[ハンドブック](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/)には、ゲームの残りのマニュアルが含まれています。手がかり、ボス、難易度、ゲームの構成方法などです。出荷されたものと、その時期は、[変更ログ](CHANGELOG.md)に記載されています。ゲームが扱うものは、[SECURITY.md](SECURITY.md)に記載されています。

MITライセンス。 [MCP Tool Shop](https://mcp-tool-shop.github.io/)によって作成されました。
