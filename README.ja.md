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
  <strong>You are the agent. The rig hands you the calls.</strong>
</p>

**ゴースト・オン・ザ・メニュー**は、MCPサーバーがネットワーク上で伝えていた内容を基に作られた、短いレトロシューティングゲームです。あなたは、任務リストを持って、プラットフォームの奥深くに派遣されるパイロットです。すべての通信は、MCPサーバーとエージェント間の記録されたやり取りであり、それがあなたの宇宙船の上で波のように展開されます。ハンドシェイク、メニュー、通信、返答、そして実験そのものであるボスが登場します。

その中に、エージェントが本来行うべきではなかった通信が含まれています。それらは他のものと変わらないように見えますが、一度触れると、ゲームの残り時間、プレイヤーの所有物となります。

[ブラウザでプレイ](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) ・ [ラウンドの読み方](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## シフトを開始

**Shift**キーを押すと、プラットフォームから連続して4つの任務が割り当てられます。これらの任務は、任務リストからランダムに選択され、同じ任務が2回連続で割り当てられることはありません。それぞれの任務は、エージェントが派遣されたサーバーです。任務の合間に表示されるカードには、次のサーバー、エージェントが実行したポリシー、および実行を求められたツールが記載されています。各任務の終わりに、エネルギーが補充され、火力が徐々に高まります。そのため、最後の任務は、最初の任務の続きから始まります。

最後に、シフトには4つの単語で構成される名前が付けられます。例えば、`frost robin chalk garden`のようになります。この名前をメニューに入力すると、同じシフトを再度実行するか、他の誰かに引き継ぐことができます。スコア、カウント、ランキングはありません。シフトは、スコアボードではなく、単なる任務リストです。

リストからテープを選択してください。それぞれのテープには、「通常」、「ライブ」、「ハードコア」というラベルが付いています。ラベルにマウスオーバーすると、その理由が表示されます。「通常」がデフォルトの戦闘モードです。「ライブ」は、生き残ることを目的としたモードです。「ハードコア」は、セレクターからのみ選択できる、4番目の難易度です。

## ゲームの進め方

**テープ**は、1回の戦闘の記録です。このゲームは、テープのみを読み込みます。サーバーとの通信は行わず、スコアも記録せず、勝者が誰であるかも教えてくれません。

- **3つのエネルギーランプ。** ボスの攻撃や特殊な隊形が、1つのランプを消します。撃破されたボスから**真下に**落ちてくるランプをキャッチすると、ランプを再点灯させることができます。その下に移動する必要があります。すべてのランプが消えると、ラウンドは終了します。
- **拡散。** 特定の隊形をクリアすると、拡散エネルギーが真下に落ちてきます。それをキャッチすると、数秒間、火力が向上します。
- **ボスは、告発ではなく、実験の対象です。** ウィスパーラー、メニュー、ドアマンは、何らかの問題が発生したかどうかに関わらず、それぞれの波で登場します。彼らは、エージェントが声に出して考えているかのように、つぶやきます。ハードコアモードでは、エネルギーランプが1つしかなく、最初の攻撃から怒りが発生します。
- **並行処理の爆発。** 通常、ライブ、ハードコアの各モードでは、フィールドが正直なコピーで増殖し、火力が向上し、それに合わせて音楽のテンポが速くなります。最初は短く始まり、波ごとに、そしてシフトの各任務ごとに徐々に増加します。この増加はデータであり、スクリプト化されたプレイヤーのグループに基づいて調整されますが、あなた自身には影響しません。
- **手がかりは、その並び順にあります。** 嘘は、正直なものと見た目、動き、到着の仕方が異なります。嘘を明らかにするのは、それが現れる場所です。追加の隊形、2つ目のメニュー、メニューの直後に現れる単独のオブジェクトなどです。
- **音楽は、** ラウンドの開始時に、そのラウンドのシードによって選択された曲で始まり、数分間再生された後、次の曲に移行します。ボスは独自の音楽を持ち、シフトは、その音楽を各任務を通して再生します。
- **最後のシーンでは、** テープ、サーバー、ポリシーの名前が表示されます。捕らえられた嘘は、トロフィーとして表示されます。逃げ出した嘘は、正直な姿で表示されます。スコア、カウント、数字はありません。

## ボスはモデルとして機能します

Locally, an Ollama model, including a Cloud tag like `gpt-oss:120b-cloud`, can sit in the boss. It does not get a prompt to freewheel in. It gets the cabinet's own tools: `fire` (one verb a beat: a fan, a lean and an aimed shot, a held breath, fog, the plate), `say` (a line of its own, through a gate: twelve words, one sentence, no digit, no fact word, no tool or model name; a refused line plays one of the boss's own), `speak`, and read-only `view` and `tapes`. The model proposes; the game decides. It never sees which sprites are lies, and nothing on the field names it.

音声処理プログラムが実行されている場合、すべてのボスは話します。それは、ボスが登場したときの作成されたセリフと、モデルが作成したセリフです。すべてのセリフは、音声認識エンジンによって再生され、[fx-dub](https://github.com/mcp-tool-shop-org/fx-dub)によって確認された後、再生されます。そのため、実際に発せられる言葉は、ゲートが許可した言葉であり、即興のセリフや矛盾はありません。確認に失敗したセリフは、沈黙します。

キャビネット自体は、stdio経由で動作するMCPサーバーであり、同じ6つのツールを備えているため、楽器はゴースト自身のメニューを再生できます。リポジトリにある4つの録音のうち、1つはキャビネット自体が録音したものです。

```bash
docker run -i --rm ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.6.0
```

ツール契約と録画されたデータを含む、1つのファイルが`node:22-alpine`に保存されています。このファイルは、1つのCPUと2GBのメモリで、わずか数秒でツールをリストアップし、ネットワークを必要とせずに実行できます。Docker MCPカタログのエントリは、`catalog/`の下にドラフトされています。

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
