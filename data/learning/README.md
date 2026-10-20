# 教材データ

教材は出題分析と分離して管理する。科目別JSONのschemaVersionは2。
各科目のlessonsは既存69テーマ、solutionsは過去問199設問と対応する。
foundations.jsonの8補助教材は出題テーマや頻度へ加算しない。

## 基礎教材

各テーマにobjectives、prerequisiteTopicIds、prerequisiteFoundationIds、sections、examples（2件）、quizzes（5件）、retests（2件）、diagnostic（1件）、intensiveを記録する。
重点教材は26テーマ。examplesは問題、途中式、答案例、任意の独自SVGを持つ。

既存の-c1、-c2、-c3、-retestのIDは保持する。追加IDは-c4、-c5、-retest-2、-diagnostic。
診断は教材内の確認問題と別の問題・IDを使用する。
補助教材はfoundation-で始まる独立IDと、2例題、3確認問題、1再テストを持つ。
全学習問題は584件（診断を含む）。過去問の最終結果を自動確認する21件とは別に集計する。

## 確認方法

自動確認はchoice、multiple-choice、text、number、bits。許容表記と数値誤差は問題ごとに定義する。
self-checkは説明、証明、図示等の自己評価で、answer、checklist、explanation、pitfallを持つ。
自己評価の結果は自動確認の正答数に含めない。英語の答案例はenglishAnswerで記録する。

ビルド時にlearningIndexを生成し、科目、テーマ、役割、形式を記録する。役割をIDから推測しない。
学習記録v3のdraftsは答案、notesは復習メモ、quizAttemptsは自動確認、selfAssessmentsは自己評価である。
旧版の共通入力欄はdraftsとして保持し、ユーザーが必要な内容をnotesへコピーできる。

## 原本の解説

solutionsの問題条件、数式、年度、言語、検証状態は保持する。条件付き解説はassumptionsを必須とする。
自動確認はverifiedのautoCheckに限定する。非表示の解答文字列を根拠にしない。
問題図は解答前に、答案図は解説を開いた後に表示する。数式はKaTeX、図は独自SVGを使用する。
確認項目は教材の答案例に基づく自己評価で、公式の採点基準ではない。
