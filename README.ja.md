<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/mcp-arcade-cabinets/readme.png" alt="mcp-arcade-cabinets" width="560" />
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/mcp-arcade-cabinets" alt="License: MIT" /></a>
  <a href="https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/"><img src="https://img.shields.io/badge/Play-in_the_browser-blue" alt="Play in the browser" /></a>
</p>

<p align="center">
  <strong>Arcade games made from what MCP servers said on the wire.</strong>
</p>

**mcp-arcade-cabinets** はアーケードゲームです。各キャビネットは、同じシャーシ上に構築された小さなゲームです。**テープ**（MCPサーバーとエージェント間の対戦を記録したもの）を読み取り、それをプレイ可能なものに変換します。キャビネットはサーバーと通信したり、スコアを読み込んだり、記録したりすることはありません。あなたは常にモデルであり、ゲームはあなたがどのようにプレイするかによって異なります。

[ブラウザでプレイ](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [ハンドブック](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/)

## キャビネット

| キャビネット                                                  | 概要                                                                                                                                                                                                                                                       | 状態                                                                                                                                                                                                                                            |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Ghost on the Menu](packages/ghost-on-the-menu/README.md)** | 短いレトロシューティングゲーム。ゲームは、エージェントが本来行うべきではなかった行動を、正直な行動の中に隠し、攻撃時に明らかにするというものです。ボスは実験であり、ローカルモデルがその中に座ることができます。                                           | リリース済み、`v0.11.0`。[プレイ](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · `npx @mcptoolshop/ghost-on-the-menu` · [Docker](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/pkgs/container/mcp-arcade-cabinets) |
| **[Vibe Typer](packages/vibe-typer/README.md)**               | タイピングアーケードゲーム。あなたは勤勉で、おべっかを使うコーディングエージェントです。あなたのユーザーは、奇妙な要求をするバイブコーダーです。コードを入力し、ビルドされるのを見て、評価が上がっていくのを確認します。レベルは無限で、難易度も高いです。 | リリース済み、`v0.11.0`。[プレイ](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · `npx @mcptoolshop/vibe-typer` · [デザインとロック](docs/vibe-typer.dispatch.md)                                                              |
| **House Call**                                                | ターンベースのキャリブレーションゲーム：行動と信頼度を宣言すると、テープに何が起こったかが表示されます。                                                                                                                                                   | プレイ可能なデザインが完成するまで、保留状態です。`tape-core`はスコアリングルールを保持します。                                                                                                                                                 |

今後、さらに多くのキャビネットが追加されます。それぞれが独自のパッケージ、ハンドブック内の独自のページ、およびこの表の独自の行を持ちます。

## すべてのキャビネットに共通するもの

- **テープをイン、何もアウトにしません。** `packages/tape-core`は`mcp-arcade.tape/v1`をロードし、スコアや結果を含むものをすべて拒否し、ゲームヘッダーの単語、ワイヤの行、およびアトムごとの1つの閉じた事実を渡します。20個の録音は`fixtures/tapes/`に含まれています。
- **ヘッドレスシミュレーションと薄いシェル。** すべてのゲームは、スクリプト化されたプレイを通じて、純粋で、シードされたシミュレーションであり、ビルドに失敗する公平性のバンドがあります。`apps/cabinets`は、それらをマウントし、Pagesが`/play/`で提供するブラウザシェルです。
- **データレバー、コードではありません。** 波、音声、難易度、行：各パッケージの`patterns/`の下にあるJSONで、ロード時に検証されるため、ゲームは再ビルドなしで調整できます。
- **モデルが座るための席、ゲートの後ろに。** ローカルまたはクラウドモデルは、キャビネット（Ghostのボス、Vibe Typerの無限モードのユーザー）に座ることができます。モデルは常に閉じたセットからレバーを1つだけ入力し、書き込んだすべての行は単語ゲートを通過し、フィールド上のものはそれを識別しません。キャビネットは、stdio経由でMCPサーバーとして実行することもできるため、エージェントがプレイすることもできます。
- **音声。** ホスト側のワーカー（`voice/`）は、ゲートが許可した行を話し、[fx-dub](https://github.com/mcp-tool-shop-org/fx-dub)によってプレイされる前に、その行を記録します。

完全な説明は、ハンドブックの[アーキテクチャ](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/architecture/)と[セキュリティ](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/security/)のページにあります。

## レイアウト

```
packages/tape-core          the tape loader, schema and calibration math
packages/ghost-on-the-menu  the shooter: sim, patterns, bots, render
packages/vibe-typer         the typing game: sim, levers, corpus, bots
packages/house-call         parked
packages/cabinet-server     both cabinets as stdio MCP servers; the say gate and the code gate; personas
packages/launcher           @mcptoolshop/ghost-on-the-menu: npx serves Ghost; --mcp is its server
packages/launcher-vibe-typer  @mcptoolshop/vibe-typer: npx serves Vibe Typer; --mcp is its server
apps/cabinets               the browser shell, served by Pages at /play/
fixtures/tapes              twenty recordings, tape JSON only
docs/                       one dispatch (research + lock) and one review per slice
site/                       the landing page and the Starlight handbook
voice/                      the Kokoro voice worker and its compose file
catalog/                    the Docker MCP Catalog entry
```

## プレイ

ブラウザ内：[`/play/`](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/)。ページを開くと、2つのキャビネットの切り替えが表示され、最後にプレイしたキャビネットが記憶されます。公開されたページにはデーモンがないため、モデルと音声の席はそこにありません。

ローカルで、席が点灯している状態で、クローンする必要はありません。

```bash
npx @mcptoolshop/ghost-on-the-menu
```

```bash
npx @mcptoolshop/vibe-typer
```

各キャビネットはそれぞれ独立したパッケージです。各コマンドは、`127.0.0.1`上でゲームを起動し、各キャビネットの`--mcp`が、標準入出力経由でそのキャビネットをMCPサーバーとして実行します。Ghostの6つのツールは、ボスにモデルを配置し、Vibe Typerの4つのツール（`view`、`product`、`ask`、`react`）は、任意のMCPクライアントをユーザーの席に配置して、無限に実行します。Node 22以降が必要です。これらの2つのパッケージのみがnpmに公開されており、それ以外のパッケージはすべて非公開です。また、2つのキャビネット間の切り替えは、Pagesのビルドでのみ可能です。

アーケードで作業するには、それをクローンします。Node 22とpnpm 11が必要です。

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

`pnpm verify`はゲートです：lint、types、tests、build、およびすべてのキャビネットのスクリプト化されたプレイを通じて。モデルの席については、同じマシンでOllamaデーモンを実行します。音声については、[`voice/`](voice/)と`pnpm voice`を参照してください。

独自のサーバーでプレイするには、mcp-arcadeで対戦を記録し、次に`mcp-arcade tape receipt.json -o your.tape.json`を実行して、フィクスチャの横に配置します。コンテナは、テープの読み取り専用ボリュームを同じ方法で受け取ります。

## キャビネットの追加

新しいゲームは、`docs/`内のディスパッチとして開始されます：研究の根拠、継承および拡張するロック、データレバー、およびスライス。次に、上記の形状に従うパッケージ、`apps/cabinets`へのマウント、この表の行、およびハンドブックのページを作成します。バージョンは、ディレクターが指示するまで`0.x`のままになり、同じ単語なしで2番目のパッケージがnpmに公開されることはありません。

## 詳細

リリースされたものと、その時期は、[変更ログ](CHANGELOG.md)に記載されています。ゲームが触れるものは、[SECURITY.md](SECURITY.md)に記載されています。

MITライセンス。 [MCP Tool Shop](https://mcp-tool-shop.github.io/)によって作成されました。
