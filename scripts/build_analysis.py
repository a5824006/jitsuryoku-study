"""Validate source coverage and regenerate the analysis reports from JSON."""
from collections import Counter
from fractions import Fraction
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data' / 'analysis'
REPORTS = ROOT / 'reports'
IDS = ['dsa', 'digital-media', 'mathematical-modeling', 'information-mathematics', 'hci', 'multimedia', 'robotics', 'software-design', 'networks']
FORMAT_NAMES = {'term': '用語と空欄', 'choice': '単一選択', 'multiple-choice': '複数選択', 'calculation': '計算と導出', 'proof': '証明', 'essay': '説明と論述', 'diagram': '図示と図の読解', 'structured': '形式記述と表作成', 'pseudocode': '疑似コード', 'example': '具体例の作成'}


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def dump(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


def table_cell(value):
    return str(value).replace('|', '\\|').replace('\r', '').replace('\n', '<br>')


def table(headers, rows):
    lines = ['| ' + ' | '.join(headers) + ' |', '| ' + ' | '.join(['---'] * len(headers)) + ' |']
    lines += ['| ' + ' | '.join(table_cell(value) for value in row) + ' |' for row in rows]
    return '\n'.join(lines)


def number_label(number):
    return number if '問' in number else '問' + number.rstrip('.．')


def ref(question, subject):
    return f"{subject['name']} {question['year']}年度 {number_label(question['number'])}（p.{question['page']}）"


def save_markdown(path, lines):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('\n'.join(lines).strip() + '\n', encoding='utf-8', newline='\n')


def validate(subject, sources):
    subject_id = subject['subjectId']
    assert subject_id in IDS
    assert subject['schemaVersion'] == 1
    source_papers = {p['year']: p for p in sources if p['subjectId'] == subject_id}
    assert sorted(subject['availableYears']) == sorted(source_papers), (subject_id, 'availableYears')
    assert len(subject['papers']) == len(source_papers)
    assert sorted(p['year'] for p in subject['papers']) == sorted(source_papers)
    topics = {t['id'] for t in subject['topics']}
    assert len(topics) == len(subject['topics'])
    seen_ids = set()
    questions = []
    for paper in subject['papers']:
        source = source_papers[paper['year']]
        assert paper['sourceFile'] == source['file'], (subject_id, paper['year'], 'sourceFile')
        assert paper['pageCount'] == source['pageCount']
        assert paper['answerLanguage'] in ('ja', 'en', 'ja-or-en', 'unspecified')
        assert paper['questions'], (subject_id, paper['year'], 'empty paper')
        for original in paper['questions']:
            q = {**original, 'year': paper['year'], 'sourceFile': paper['sourceFile']}
            assert q['id'] not in seen_ids, q['id']
            assert q['id'].startswith(f'{subject_id}-{paper["year"]}-q'), q['id']
            seen_ids.add(q['id'])
            assert 1 <= q['page'] <= paper['pageCount'], q['id']
            assert q['topics'] and set(q['topics']) <= topics, q['id']
            assert len(q['topics']) == len(set(q['topics']))
            assert q['formats'] and set(q['formats']) <= set(FORMAT_NAMES), q['id']
            assert q['minimumCharacters'] is None or isinstance(q['minimumCharacters'], int)
            assert q['points'] is None or isinstance(q['points'], (int, float))
            for key in ('number', 'title', 'summary', 'family'):
                assert isinstance(q[key], str) and q[key].strip(), (q['id'], key)
            assert isinstance(q['changeNote'], str), (q['id'], 'changeNote')
            questions.append(q)
    for insight in subject['insights']:
        assert insight['evidence'] and set(insight['evidence']) <= seen_ids, (subject_id, insight['claim'])
    for caution in subject['cautions']:
        assert caution['year'] in source_papers
        assert 1 <= caution['page'] <= source_papers[caution['year']]['pageCount']
    expected_review = {(p['year'], page) for p in source_papers.values() for page in range(1, p['pageCount'] + 1)}
    actual_review = {(p['year'], p['page']) for p in subject['reviewedPages']}
    assert actual_review == expected_review, (subject_id, 'reviewed pages', expected_review - actual_review)
    return questions


def topic_statistics(subject, questions):
    total = len(subject['availableYears'])
    latest = max(subject['availableYears'])
    result = []
    for topic in subject['topics']:
        matching = [q for q in questions if topic['id'] in q['topics']]
        years = sorted({q['year'] for q in matching})
        assert years, (subject['subjectId'], topic['id'], 'unused topic')
        result.append({
            **topic, 'subjectId': subject['subjectId'], 'years': years,
            'appearanceYears': len(years), 'availableYears': total,
            'ratio': len(years) / total, 'questionCount': len(matching),
            'questionIds': [q['id'] for q in matching], 'inLatestAvailableYear': latest in years,
        })
    result.sort(key=lambda t: (-Fraction(t['appearanceYears'], total), -t['inLatestAvailableYear'], -t['prerequisite'], t['id']))
    return result


def main():
    manifest = read(ROOT / 'work' / 'source_manifest.json')
    sources = manifest['papers']
    assert len(sources) == 32
    assert sum(p['pageCount'] for p in sources) == 44
    subjects = [read(DATA / 'subjects' / f'{subject_id}.json') for subject_id in IDS]
    all_questions, all_topics, subject_summary = [], [], []
    checks = []
    for subject in subjects:
        questions = validate(subject, sources)
        topics = topic_statistics(subject, questions)
        all_questions += questions
        all_topics += topics
        format_counts = Counter(f for q in questions for f in q['formats'])
        subject_summary.append({
            'subjectId': subject['subjectId'], 'name': subject['name'],
            'availableYears': subject['availableYears'], 'paperCount': len(subject['papers']),
            'pageCount': sum(p['pageCount'] for p in subject['papers']),
            'questionCount': len(questions), 'topicCount': len(topics),
            'formatCounts': dict(format_counts),
            'minimumCharacterQuestions': [q['id'] for q in questions if q['minimumCharacters'] is not None],
            'cautionCount': len(subject['cautions']),
        })
        checks.append(f"- {subject['name']}：{len(subject['papers'])}件、{sum(p['pageCount'] for p in subject['papers'])}ページ、{len(questions)}設問。原本の対応、ID、テーマ参照、目視確認の網羅性を検証。")
        question_lookup = {q['id']: q for q in questions}
        lines = [f"# {subject['name']}の出題分析", '', f"対象年度：{', '.join(map(str, subject['availableYears']))}。", '', '## 答案の特徴', '']
        lines += [f'- {trait}' for trait in subject['answerTraits']]
        lines += ['', '## 学習の準備', '', subject['preparation'], '', '前提知識：' + '、'.join(subject['prerequisites']) + '。', '', '## テーマごとの出題実績', '', '頻度は、そのテーマが登場した年度数を、その科目の収録年度数で割った値。', '複数タグを持つ設問があるため、テーマ別の設問数は合計しない。', '']
        rows = [[t['name'], f"{t['appearanceYears']}/{t['availableYears']}年", '、'.join(map(str, t['years'])), t['studyAdvice']] for t in topics]
        lines += [table(['テーマ', '出題年度数', '年度', '準備する内容'], rows), '', '## 傾向と根拠', '']
        for insight in subject['insights']:
            lines += [f"### {insight['claim']}", '', insight['interpretation'], '', '根拠：' + '、'.join(ref(question_lookup[qid], subject) for qid in insight['evidence']) + '。', '']
        lines += ['## 年度別の設問一覧', '']
        for paper in subject['papers']:
            language = {'ja': '日本語', 'en': '英語', 'ja-or-en': '日本語または英語', 'unspecified': '原本に明示指定なし'}[paper['answerLanguage']]
            lines += [f"### {paper['year']}年度", '', f"原本：{paper['sourceFile']}（{paper['pageCount']}ページ）。", f'回答言語：{language}。']
            lines += [''] + [f'- {rule}' for rule in paper['rules']] + ['']
            paper_questions = [q for q in questions if q['year'] == paper['year']]
            rows = []
            for q in paper_questions:
                constraints = []
                if q['minimumCharacters'] is not None:
                    constraints.append(f"{q['minimumCharacters']}字以上")
                if q['keywords']:
                    constraints.append('指定語句：' + '、'.join(q['keywords']))
                if q['points'] is not None:
                    constraints.append(f"{q['points']:g}点")
                rows.append([q['number'], q['page'], q['summary'], '、'.join(FORMAT_NAMES[f] for f in q['formats']), '／'.join(constraints) or '明記なし', q['changeNote'] or '比較注記なし'])
            lines += [table(['設問', '頁', '出題内容', '答案形式', '明記された条件', '比較と変化'], rows), '']
        lines += ['## 原本の確認事項', '']
        if not subject['cautions']:
            lines += ['分析を左右する原本の不整合は確認していない。', '']
        for caution in subject['cautions']:
            lines += [f"- {caution['year']}年度 {number_label(caution['number'])}（p.{caution['page']}）：{caution['description']} 対応：{caution['handling']}"]
        lines += ['', '## サイトに必要な教材と機能', '']
        lines += [f'- {recommendation}' for recommendation in subject['siteRecommendations']]
        lines += ['', '## 他科目との共通知識', '']
        names = {s['subjectId']: s['name'] for s in subjects}
        lines += [f"- {names[overlap['subjectId']]}：{overlap['knowledge']}" for overlap in subject['overlaps']]
        lines += ['', '## 一般知識を確認した一次資料', '', '下記は技術的な解釈の確認資料であり、試験の出題実績を証明する資料ではない。', '']
        lines += [f"- [{reference['title']}]({reference['url']})" for reference in subject['references']]
        save_markdown(REPORTS / 'subjects' / f"{subject['subjectId']}.md", lines)

    assert len({q['id'] for q in all_questions}) == len(all_questions)
    global_unchanged = None
    git_check = ROOT / 'work' / 'git-check.json'
    if git_check.exists():
        baseline = read(git_check)
        global_path = Path.home() / '.gitconfig'
        current_hash = hashlib.sha256(global_path.read_bytes()).hexdigest().upper() if global_path.exists() else 'absent'
        global_unchanged = current_hash == baseline['beforeSha256']
        assert global_unchanged, 'Global Git config changed since the initial check'
    source_metadata = {**manifest, 'papers': [{key: value for key, value in paper.items() if key not in ('pages', 'images', 'archiveEntry')} for paper in sources]}
    dump(DATA / 'source_manifest.json', source_metadata)
    aggregate = {'schemaVersion': 1, 'analyzedAt': '2026-10-13', 'questionUnit': '原本にある最小の番号付き設問。番号のない要求と空欄の集まりは分割しない。', 'subjects': subject_summary, 'topics': all_topics, 'questions': all_questions}
    dump(DATA / 'aggregate.json', aggregate)
    evidence = {'schemaVersion': 1, 'pdfCount': len(sources), 'pageCount': sum(p['pageCount'] for p in sources), 'subjectCount': len(subjects), 'questionCount': len(all_questions), 'topicCount': len(all_topics), 'allReviewedPagesCovered': True, 'allSourceReferencesValid': True, 'globalGitConfigUnchanged': global_unchanged}
    dump(DATA / 'verification.json', evidence)
    save_markdown(REPORTS / 'verification.md', ['# 分析データの検証記録', '', '実施日：2026年10月13日。', '', '## 検証の対象', '', f"9科目、32件のPDF、44ページ、{len(all_questions)}設問、{len(all_topics)}テーマ。", '', '## 科目別の確認', ''] + checks + ['', '## 集計と追跡可能性', '', '- 各テーマの出題年は設問のタグから集合として計算し、一年度内の反復を重複して数えていない。', '- 全設問のIDの一意性、テーマの参照先、原本ファイル名、ページ範囲、年度の一致を検証した。', '- 各科目の目視確認記録が、収録原本の全ページと一致することを確認した。', '- 原本PDFごとのSHA-256とZIPのSHA-256を記録した。', '- 配点と字数条件の不明値はnullとし、非表示の解答や配点を採用しない。', '', '## 今回の検証範囲', '', '今回は出題内容の分類と傾向を検証した。', '全問の解答解説、数値解の検算、サイトの操作とビルドは次の段階で実施する。', '', '## 再生成', '', 'scripts/extract_exam_sources.py で原本を読み取り、scripts/build_analysis.py で分類データの検証と再集計を行う。'])
    generate_main_report(subjects, subject_summary, all_topics, evidence)
    print(json.dumps(evidence, ensure_ascii=False))


def generate_main_report(subjects, summaries, topics, evidence):
    names = {s['subjectId']: s['name'] for s in subjects}
    lines = ['# 実力試験過去問の傾向分析', '', '分析日：2026年10月13日。', '', '指定された9科目の過去問を比較し、4科目の選択と学習、試験対策サイトの設計に使うための分析をまとめた。', '同じテーマが繰り返される科目でも、答案には理由、導出、具体例が求められる。', '対策では用語の暗記に加え、条件を変えても説明できる解法と答案の構成を練習する。', '', '## 対象と分析方法', '', '2022～2025年度のZIPに含まれる34件の問題PDFから、対象外の計算機概論2件を除き、32件、44ページを確認した。', '今年の受験科目はユーザー提示の9科目から4科目を選ぶ条件を採用する。', '過去問の収録科目と今年の選択科目は一致するとは限らないため、情報数学Ⅱを2025年度に出題がなかった理由で対象外にはしない。', '', '原本のテキスト抽出とページ画像の目視確認を併用した。', '数式、図表、問題番号、回答言語、字数条件は可視原本で確認し、非表示の解答や配点は採用していない。', f"集計単位は原本の最小の番号付き設問で、全{evidence['questionCount']}設問を分類した。", '番号のない複数の説明要求や空欄の集まりは一設問として扱う。', 'テーマと答案形式は複数付与できるため、その件数を合計して総設問数とはしない。', 'テーマ数は科目内の分類単位の数であり、科目間の必要時間や難度を示す値ではない。', '', '頻度は「テーマが登場した年度数／その科目の収録年度数」で表示する。', '2/2年と4/4年では観察した年度数が異なるため、同じ確実さの予測として扱わない。', 'ここで示すのは4年以内の出題実績と教材の準備順位であり、次回の出題確率ではない。', '', table(['科目', '収録年度', 'PDF／ページ', '設問数', '分析したテーマ数'], [[s['name'], '、'.join(map(str, s['availableYears'])), f"{s['paperCount']}件／{s['pageCount']}頁", s['questionCount'], s['topicCount']] for s in summaries]), '', '注意事項のWord文書には、情報ネットワークは2024年度に新設、マルチメディア工学は2024年度に試験科目なし、情報数学Ⅱは2025年度に試験科目なしと記されている。', 'この資料のあるなしを、個々のテーマの未出題と区別する。', '', '## 科目別の頻出テーマと答案の特徴', '']
    insertion = lines.index('## 対象と分析方法')
    lines[insertion:insertion] = [
        '## 主な結果', '',
        '- デジタルメディア設計は、回転の線型性、座標変換、逆関数法を4/4年度で出題。数値や指数、並進の有無が変わるため、共通の導出手順を練習する。',
        '- ソフトウェア設計は、データ辞書とUMLのクラス図、オブジェクト図を4/4年度で出題。2025年度は自分で例や構造を作る要求が増える。',
        '- 情報数学Ⅱのハミング符号は3/3年度。マルチメディア工学の標本化、量子化、正規化も3/3年度に登場する。',
        '- 情報ネットワークは7テーマを2/2年度で反復するが、選択数、サブネット、CRCの入力、TCPの説明要求が変わる。観察年度が2年であることを併記する。',
        '- 数理モデル解析法の固有値問題は3/4年度。2024年度は逆行列の証明と計算へ切り替わる。DSAは全8設問で文章説明を求め、うち4設問に300字以上の条件がある。',
        '', '下記の科目別分析と設問一覧で、出題年度と原本の根拠を確認できる。', '',
    ]
    for subject in subjects:
        subset = [t for t in topics if t['subjectId'] == subject['subjectId']]
        lines += [f"### {subject['name']}", '', subject['preparation'], '', table(['テーマ', '出題年度数', '年度'], [[t['name'], f"{t['appearanceYears']}/{t['availableYears']}年", '、'.join(map(str, t['years']))] for t in subset]), '']
        lines += [f'- {trait}' for trait in subject['answerTraits'][:3]]
        if subject['subjectId'] == 'digital-media':
            lines += ['- 収録4年度の原本はいずれも6問への解答を求め、点数の高い上位5問の合計を採用すると明記する。これは原本当時の採点方式。']
        if subject['subjectId'] == 'multimedia':
            lines += ['- 全体の回答言語指定は2022年度と2023年度が英語、2025年度が日本語または英語。2022年度問10は成分名に英語または日本語を認める個別指定がある。']
        lines += ['']
        for insight in subject['insights'][1:2]:
            lookup = {q['id']: {**q, 'year': p['year']} for p in subject['papers'] for q in p['questions']}
            lines += [insight['claim'].rstrip('。') + '。', insight['interpretation'], '根拠：' + '、'.join(ref(lookup[qid], subject) for qid in insight['evidence']) + '。', '']
        lines += [f"全設問と原本の確認事項：[科目別分析](subjects/{subject['subjectId']}.md)。", '']

    lines += ['## 4科目を選ぶための比較', '', '科目の選択は、現在説明できる内容と答案形式への適性を確認して決める。', '下表の前提知識、準備内容、共通知識を組み合わせ、学習量だけから得点しやすさを断定しない。', '', table(['科目', '前提知識', '答案の練習', '他科目と共通する知識'], [[s['name'], '、'.join(s['prerequisites']), '／'.join(s['answerTraits'][:2]), '／'.join(f"{names[o['subjectId']]}：{o['knowledge']}" for o in s['overlaps'])] for s in subjects]), '', '選択前には、候補科目の直近収録年度を一度解き、①用語を説明できるか、②計算や導出を再現できるか、③指定字数と図示の要求を満たせるかを確認する。', '計算中心の科目と説明中心の科目をどう組み合わせるかは、この結果と残りの学習時間から判断する。', '公式の試験時間、今年の配点、合格基準は今回の資料だけでは確定していないため、所要時間や合格点の推定は行わない。', '', '## 学習の進め方', '', '1. 科目別の頻出テーマから、必要な前提知識を確認する。', '2. 同じ解法の問題群を比較し、数値、条件、問われ方が変わった部分を説明する。', '3. 計算結果だけでなく、途中式、根拠、用語の関係、具体例を含む答案を作る。', '4. 解答を見ずに再現できたかを記録し、説明できない部分を復習する。', '', '表のテーマ順は出題年度の割合、直近収録年度での出題、基礎としての必要性で決めた。', '実際に学ぶ際には前提知識を先に補い、その後で頻出テーマを練習する。', '', '## サイトでのまとめ方', '', table(['画面', '掲載する内容', '分析データから得られるもの'], [['科目選び', '9科目の比較と4科目の選択', '収録年度、頻出テーマ、答案形式、前提知識、共通知識'], ['科目別の傾向', '年度別出題表と問題の変化', 'テーマごとの出題年、同じ解法の問題群、変更条件'], ['テーマ別の学習', '基礎説明、解法、答案例、関連問題', 'テーマと前提知識、教材を作るべき項目'], ['過去問演習', '科目、年度、テーマ、形式による絞り込み', '原本の設問番号、回答言語、字数と指定語句の条件'], ['復習', '未着手、復習が必要、説明できるの記録', '安定した問題IDとテーマID']]), '', '年度別の出題表では、テーマが出題されなかった年と、科目自体が試験になかった年を異なる表示にする。', '全問解説は基礎説明、解法と途中式、試験用の答案例、確認すべき要点の順に作る。', '単純な一致で判定できる選択、用語、単一数値は自動確認に対応し、証明、長文、図示は答案例と確認項目で自己評価する。', '自動確認の対象と許容解は、解答の検証が終わってから決める。', '', '科目ごとに用意する教材と機能は次のとおり。', '']
    for s in subjects:
        lines += [f"### {s['name']}の教材", ''] + [f'- {x}' for x in s['siteRecommendations']] + ['']
    lines += ['## 実装に引き継ぐ条件', '', '- Vite、React、TypeScriptによる静的サイトを想定し、数式はKaTeXで表示する。', '- 科目データを必要な時に読み込み、分析と画面表示で共通のデータを使う。', '- 画面遷移はハッシュ形式とし、GitHub Pagesのリポジトリ配下のURLに対応する。', '- 選択科目と復習状況は各自のブラウザーに保存し、バージョン付きJSONでバックアップする。', '- 全問解答解説と答案の検証状態を追加してから、演習画面と自動確認を実装する。', '- GitHubのリポジトリ作成と公開実行は後続作業とする。', '', '公開方式の確認資料：[Vite公式のGitHub Pages公開手順](https://vite.dev/guide/static-deploy#github-pages)。', '', '## 分析の限界と次の段階', '', '原本には定義域の省略、記憶モデルの空欄番号の不整合、非表示テキストなどがある。', '科目別分析に該当年度と設問を記録しており、全問解答解説では原文と補った条件を区別する必要がある。', '公式解答を提供された前提で分析していないため、原本に残る非表示の解答文字列も正解の根拠にしない。', '', '今回は出題傾向の分析を完了する段階であり、全問解答解説とサイトのコードは作成していない。', '次の段階では、このレポートと分類データをもとに解答解説を作成して検算し、その後でサイトを実装する。', '', '分類データは data/analysis/subjects 以下、再集計結果は data/analysis/aggregate.json、出典情報は data/analysis/source_manifest.json に保存した。', '検証内容は [検証記録](verification.md) を参照。']
    save_markdown(REPORTS / 'analysis.md', lines)


if __name__ == '__main__':
    main()
