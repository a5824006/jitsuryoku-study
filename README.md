# 実力試験ノート

2022～2025年度の過去問のうち、指定された9科目を分析した。
今年はその9科目から4科目を選ぶというユーザー提示の条件に合わせ、科目選択と学習、試験対策サイトの設計に使う資料をまとめた。
32件のPDF、44ページから199設問を69テーマに分類した。

## レポート

- [過去問の傾向分析](reports/analysis.md)
- [科目別の全設問分析](reports/subjects/)
- [検証記録](reports/verification.md)
- [サイト実装の検証記録](reports/site-verification.md)

分析レポートをもとに、Vite・React・TypeScriptで静的サイトを実装した。
4科目の選択、科目別の年度表と学習テーマ、199設問の絞り込み、復習状況・お気に入り・答案メモ、記録のJSON書き出しと読み込みに対応する。
学習記録は各ブラウザーのlocalStorageに保存される。
設問は要約を掲載しているため、問題文・図は配布された原本と照合する。
全問解答解説と自動採点、GitHubリポジトリの作成と公開実行は後続作業とする。

## サイトの起動

Node.js 24以上で実行する。

```powershell
npm ci
npm run dev
```

ターミナルに表示されたローカルURLを開く。
起動時に分析データからサイト用JSONを生成する。
原本PDFを持たない環境でも、Gitで管理する分析データから起動できる。

```powershell
npm test
npm run build
npm run preview
```

本番成果物は `dist/` に生成する。
科目別データと分析レポートは必要な画面を開いたときに読み込む。
記録を別の端末へ移す場合は「書き出し」で保存し、移動先で「読み込み」を使う。
読み込むJSONのバージョン・科目・設問ID・状態を検査し、不正なファイルでは現在の記録を変更しない。

## GitHub Pagesの公開準備

`.github/workflows/pages.yml` にテスト・型チェック・ビルド・配信の手順を用意した。
将来リポジトリを作成し、GitHubのSettings → PagesでSourceをGitHub Actionsに設定する。
`main` へのpushまたは手動実行で配信する。
この段階ではリポジトリ作成・公開は実行していない。

`GITHUB_REPOSITORY` からリポジトリ配下の基準パスを設定し、画面はハッシュURLで遷移する。
独自の公開パスでは `SITE_BASE` で上書きできる。
バックアップは同じ公開元のブラウザーごとに独立するため、開発環境の記録を公開環境へ移す際にも書き出しと読み込みを使う。

## 分析データ

科目別の分類を `data/analysis/subjects/` に保存する。
`data/analysis/aggregate.json` はその分類から計算した出題頻度と全設問の索引。
`data/analysis/source_manifest.json` は対象32件のPDFの年度、ページ数、SHA-256を記録する。
集計単位と記録項目は [分析データの記録規則](data/analysis/CONTRACT.md) に従う。

問題のない解答用紙も含めて44ページを目視確認した。
頻度はテーマが登場した年度数を収録年度数で割った値とする。
非表示の解答文字列と配点は採用しない。

## 再生成

Python環境には `pypdf` と `pypdfium2` が必要。
Codexのワークスペース依存ライブラリに含まれるPythonで実行できる。

```powershell
python scripts/extract_exam_sources.py "原本ZIPの絶対パス"
python scripts/build_analysis.py
```

原本ZIP、抽出したPDFとページ画像、作業用ファイルはGitに含めない。
原本を変更せずに読み取り、科目別の分類データからレポートと集計を再生成する。

## Gitの作者情報

このフォルダのローカル設定は `user.name=a5824006`、`user.email=a5824006@aoyama.ac.jp`。
グローバル設定は保持する。
この指定はGitの作者情報であり、将来作成するGitHubリポジトリの所有者を自動的に決めるものではない。
