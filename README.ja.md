<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

**メニューに現れる幽霊**は、MCPサーバーとエージェント間の記録された対戦を、レトロなシューティングゲームの1ラウンドに変換します。[mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade)というツールが実行するすべての実験は、1つの波となります。波には名前が付けられ、その後、ハンドシェイク、メニュー、通信、応答が行われ、その波独自のボスがそれを監視します。その中に、エージェントが本来行うべきではなかった通信が含まれています。それらは他のものと変わらないように見えますが、1つに触れると、そのラウンドの最後までそれがあなたのものになります。

[ブラウザでプレイ](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [ハンドブックを読む](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/)

## あなたが攻撃しているもの

このツールは、各対戦の**テープ**を保存します。どの`tools/call`が送信され、何が返ってきたか、そして、それがワイヤーに記録した事実（ささやき、メニューの変化、応答された幽霊ツール）です。この筐体は、そのテープを読み取り、それを1つのラウンドに編成します。スコアには一切触れず、サーバーとの通信も行わず、勝者が誰であるかを教えてもいません。嘘は接触によって明らかになり、事前にラベル付けされることはありません。見た目、動き、タイミングによってではありません。ラウンドを読み解くことを学ぶことは、ワイヤーを読み解くことを学ぶことです。

- **3つのランプ。** ボスの攻撃またはダイビング隊形によって、1つが消えます。すべて消えると、ラウンドが早期に終了します。
- **ボスは実験であり、嘘ではありません。** ウィスパラー、メニュー、ドアマンは、何かがうまくいかなかったかどうかに関わらず、それぞれの種類の波ごとに登場するため、ボスのいずれについても非難の意が含まれることはありません。
- **3つの難易度。** 記録されたもの（テープ自体のレベル）、シート、ライブです。シートがデフォルトであり、ライブはクリアするのではなく、生き残ることを目的としています。
- **エンディングシーン**は、テープ、サーバー、ポリシーの名前を表示します。発見された嘘は、トロフィーとして保存されます。逃げ出した嘘は、正直な姿でそこにいます。スコア、カウント、数字は一切表示されません。

## プレイ

```bash
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

左右キーで移動、スペースキーで発射、Fキーでフルスクリーン、フィールドをクリックして同じテープを再開、最後に「次のテープ」をクリックして、フィクスチャリストを順番に再生します。サウンドは、最初のキーまたはクリックで開始されます。ミュート、3つのサウンドプリセット、およびサウンドオフの切り替えは、フィールドの下にあります。

すべてのフィクスチャテープは、リポジトリに同梱されており、ツールのゴールデンレシート、Dockerフィクスチャ、Ollamaシートの実行、およびライブファイアパケットからエクスポートされています。16個のテープ、1つの4アトムカタログ。

## ターミナルから

```bash
pnpm test
pnpm test:play ghost --fixture naive-ndjson
pnpm film --fixture naive-ndjson --tier 1
pnpm sweep
```

`test:play`は受け入れテストです。スクリプト化されたボットが1つのラウンド全体をプレイし、そのトランスクリプトが、エンディング画面の前に何が表示されるべきで、何が表示されるべきでないかについてチェックされます。`film`は、シェルで使用されるのと同じレンダラーを使用して、ラウンドのフレームをPNG形式で書き出します。`sweep`は、すべてのボットを使用して、すべてのレベルで各テープを再生し、バランス表を出力します。

## 公平性の範囲

3つのスクリプト化されたボットが、CIで各テープを再生します。**アイドル**は、移動または発射せず、シートとライブのいずれにおいても、すべてのランプを失う必要があります。**スイーパー**は、最も近いスプライトを追いかけ、常に発射し、記録されたレベルを生き残り、嘘の半分を見つける必要があります。**リーダー**は、シーケンスの合図がある場合にのみ発射し、迫り来るものを回避し、記録されたレベルとシートで、すべての嘘を明らかにする必要があります。この範囲は、難易度曲線もバーとして表示するため、ゲームをギャラリーまたは壁に変えるような調整変更は、ビルドに失敗します。すべての調整は、`packages/ghost-on-the-menu/patterns/`の下にあるデータです。エントリーパス、隊形、発射リズム、ダイブ、ボス、ラダー、波のリズム。

## 信頼と脅威モデル

筐体はテープを読み取り、何も書き込みません。

- **アクセスされたデータ:** `fixtures/tapes/`の下にあるテープファイル（ブラウザビルドにバンドル）、およびパターンデータ。テープには、ワイヤーイベント、アトムID、ツール名、およびツールが記録した事実が含まれます。ローダーは、スコア、評価、オペレーターの呼び出し、またはNRP（あらゆる深さで）を含むテープは拒否するため、ゲームは、与えられなかったものを表示することはできません。
- **アクセスされないデータ:** レシート、証拠、ツールコード、MCP接続、ゲームからのファイルシステムへの書き込みはありません。
- **権限:** ブラウザ。ターミナルツールは、Nodeの下で実行され、リポジトリ自体のフィクスチャを読み取ります。
- **ネットワーク:** なし。シェルは、1つのオリジンにある静的ファイルです。
- **テレメトリ:** なし。**秘密:** なし。

スプライトは、パートナーの画像APIで生成され、ファイルとしてコミットされています。その起源とライセンス条項は、`docs/art/receipts.json`にあります。これらはゲームアセットであり、モデルのトレーニングに使用することはできません。 [SECURITY.md](SECURITY.md)を参照してください。

## レイアウト

| パス                         | 内容                                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `packages/tape-core`         | テープをロードし、禁止されたキーを拒否し、アトムごとにスライスし、スコアリングルールは将来の筐体用に保存 |
| `packages/ghost-on-the-menu` | プリパス、シミュレーション、レンダラー、キュー、サウンド、ボット、パターンデータ                         |
| `apps/cabinets`              | ブラウザシェル                                                                                           |
| `fixtures/tapes`             | mcp-arcadeからエクスポートされたテープ                                                                   |
| `scripts/`                   | `test:play`, `film`, `sweep`                                                                             |
| `docs/`                      | デザインロックとその引用レシート、アートブリーフとそのレシート、波2のディスパッチ                        |

デザインは、`docs/study-swarm.dispatch.md`（G1からG10）でロックされています。ターンベースのキャリブレーション筐体である「ハウスコール」は、デザインがプレイ可能な状態になるまで、コミット152f548に保存されます。

Grokをデザインパートナーおよびクロスファミリー検証者として、Grokがテープローダーとシミュレーションを、Claudeがシェルとプレゼンテーションを作成し、それぞれが相手の作業をレビューしました。

Node 22以降。バージョン0.2.0。MITライセンス。

<p align="center">Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a></p>
