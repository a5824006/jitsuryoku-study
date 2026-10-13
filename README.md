# 実力試験の過去問分析

2022～2025年度の過去問のうち、指定された9科目を分析した。
今年はその9科目から4科目を選ぶというユーザー提示の条件に合わせ、科目選択と学習、試験対策サイトの設計に使う資料をまとめた。
32件のPDF、44ページから199設問を69テーマに分類した。

## レポート

- [過去問の傾向分析](reports/analysis.md)
- [科目別の全設問分析](reports/subjects/)
- [検証記録](reports/verification.md)

今回は分析レポートまでで終了する。
全問解答解説とサイトの実装、GitHubリポジトリの作成と公開実行は次の段階で行う。

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
