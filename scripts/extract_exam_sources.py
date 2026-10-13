"""Read the supplied archive and render the 32 in-scope papers for review.

The archive and extracted PDFs / images are never tracked in Git.
Run with the bundled Python runtime (pypdf and pypdfium2).
"""
import argparse
import hashlib
import io
import json
import logging
import re
import zipfile
from pathlib import Path

import pypdfium2 as pdfium
from pypdf import PdfReader

SUBJECTS = {
    'データ構造とアルゴリズム': 'dsa',
    'デジタルメディア設計': 'digital-media',
    '数理モデル解析法': 'mathematical-modeling',
    '情報数学II': 'information-mathematics',
    'ヒューマンコンピュータ': 'hci',
    'マルチメディア': 'multimedia',
    'ロボット工学': 'robotics',
    'ソフトウェア設計': 'software-design',
    '情報ネットワーク': 'networks',
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('archive', type=Path)
    parser.add_argument('--work', type=Path, default=Path('work'))
    args = parser.parse_args()
    logging.getLogger('pypdf').setLevel(logging.CRITICAL)
    args.work.mkdir(parents=True, exist_ok=True)
    image_directory = args.work / 'pages'
    image_directory.mkdir(exist_ok=True)
    papers = []
    with zipfile.ZipFile(args.archive) as archive:
        for entry in archive.infolist():
            if not entry.filename.lower().endswith('.pdf'):
                continue
            subject = next((slug for name, slug in SUBJECTS.items() if name in entry.filename), None)
            if subject is None:
                continue
            year = int(re.search(r'(202\d)年度', entry.filename).group(1))
            blob = archive.read(entry)
            reader = PdfReader(io.BytesIO(blob))
            text_pages = [page.extract_text() or '' for page in reader.pages]
            document = pdfium.PdfDocument(blob)
            images = []
            for index in range(len(document)):
                page = document[index]
                bitmap = page.render(scale=1.6)
                image = bitmap.to_pil()
                target = image_directory / f'{subject}-{year}-p{index + 1}.png'
                image.save(target)
                images.append(target.as_posix())
                image.close()
                bitmap.close()
                page.close()
            document.close()
            papers.append({
                'id': f'{subject}-{year}', 'subjectId': subject, 'year': year,
                'archiveEntry': entry.filename, 'file': entry.filename.split('/')[-1],
                'sha256': hashlib.sha256(blob).hexdigest(), 'pageCount': len(text_pages),
                'pages': text_pages, 'images': images,
            })
    papers.sort(key=lambda paper: (paper['subjectId'], paper['year']))
    result = {'archive': args.archive.name, 'archiveSha256': hashlib.sha256(args.archive.read_bytes()).hexdigest(), 'papers': papers}
    (args.work / 'source_manifest.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    assert len(papers) == 32, f'Expected 32 in-scope PDFs, got {len(papers)}'
    assert sum(paper['pageCount'] for paper in papers) == 44
    print(json.dumps({'pdfs': len(papers), 'pages': sum(paper['pageCount'] for paper in papers), 'subjects': len({paper['subjectId'] for paper in papers})}))


if __name__ == '__main__':
    main()
