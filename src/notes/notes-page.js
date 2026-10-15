// 图文笔记页：读取当前课次的 PPT 截图与文字稿，按时间对齐后展示，并导出 Word / Markdown / PDF
document.addEventListener('DOMContentLoaded', () => {
    const fmt = window.SmartcloudFormat;
    const slidesLib = window.SmartcloudSlides;
    const media = window.SmartcloudMedia;
    const notesLib = window.SmartcloudNotes;

    const $ = id => document.getElementById(id);
    const notesEl = $('notes');
    const status = $('status');
    const languageSelect = $('languageSelect');
    const timestampCheck = $('timestampCheck');
    const dedupCheck = $('dedupCheck');
    const exportButtons = [$('docxBtn'), $('mdBtn'), $('printBtn')];

    const params = new URLSearchParams(location.search);
    const tabId = Number(params.get('tab'));
    if (['chinese', 'english', 'bilingual'].includes(params.get('lang'))) languageSelect.value = params.get('lang');
    dedupCheck.checked = params.get('dedup') !== '0';

    const state = {
        context: {},
        items: [],      // 文字稿
        shots: [],      // 下载成功的全部截图（按时间）
        pages: [],      // 当前去重设置下保留的页
        segments: [],
        imageUrls: new Map()
    };

    function setStatus(text) {
        status.textContent = text;
    }

    function setBusy(busy) {
        exportButtons.forEach(btn => { btn.disabled = busy || !state.segments.length; });
    }

    // ---------- 数据 ----------

    function computeSegments() {
        const shots = state.shots;
        let keep = shots.map((_, i) => i);
        let groupOf = keep.slice();
        if (dedupCheck.checked && shots.length > 1) {
            ({ keep, groupOf } = slidesLib.dedupFrames(shots.map(shot => shot.thumbnail)));
        }
        state.pages = keep.map(index => shots[index]);
        state.segments = notesLib.buildSegments(
            shots.map((shot, i) => ({ sec: shot.sec, page: groupOf[i] })),
            state.items
        );
    }

    function imageUrl(page) {
        if (!state.imageUrls.has(page)) {
            const type = page.format === 'PNG' ? 'image/png' : 'image/jpeg';
            state.imageUrls.set(page, URL.createObjectURL(new Blob([page.bytes], { type })));
        }
        return state.imageUrls.get(page);
    }

    // 段落标题：第 N 页 · 时间；翻回旧页时注明
    function segmentTitles() {
        const seen = new Set();
        return state.segments.map((segment, index) => {
            if (segment.page === null) {
                return index === 0 && state.segments.length > 1 ? '开始上课' : '讲解文字';
            }
            const label = `第 ${segment.page + 1} 页`;
            const again = seen.has(segment.page) ? '（再次讲到）' : '';
            seen.add(segment.page);
            return `${label}${again} · ${fmt.formatTimestamp(segment.start)}`;
        });
    }

    function segmentLines(segment) {
        const language = languageSelect.value;
        const withTime = timestampCheck.checked;
        return segment.items
            .map(item => ({ time: withTime && typeof item.begin === 'number' ? fmt.formatTimestamp(item.begin) : '', text: fmt.itemText(item, language) }))
            .filter(line => line.text);
    }

    // ---------- 展示 ----------

    function render() {
        const heading = fmt.documentHeading(state.context, '图文笔记');
        document.title = heading.title;
        notesEl.textContent = '';

        const h1 = document.createElement('h1');
        h1.textContent = heading.title;
        notesEl.appendChild(h1);
        if (heading.meta.length) {
            const meta = document.createElement('p');
            meta.className = 'meta';
            meta.textContent = heading.meta.join('　');
            notesEl.appendChild(meta);
        }

        const titles = segmentTitles();
        state.segments.forEach((segment, index) => {
            const section = document.createElement('section');
            section.className = 'segment';
            const h2 = document.createElement('h2');
            h2.textContent = titles[index];
            section.appendChild(h2);

            if (segment.page !== null) {
                const page = state.pages[segment.page];
                const img = document.createElement('img');
                img.src = imageUrl(page);
                img.alt = titles[index];
                img.width = page.width;
                img.height = page.height;
                img.style.height = 'auto';
                section.appendChild(img);
            }

            const lines = segmentLines(segment);
            lines.forEach(line => {
                const p = document.createElement('p');
                if (line.time) {
                    const time = document.createElement('span');
                    time.className = 'time';
                    time.textContent = line.time;
                    p.appendChild(time);
                }
                p.appendChild(document.createTextNode(line.text));
                section.appendChild(p);
            });
            if (!lines.length && segment.page !== null) {
                const p = document.createElement('p');
                p.className = 'empty';
                p.textContent = '（这一页没有讲解文字）';
                section.appendChild(p);
            }
            notesEl.appendChild(section);
        });
    }

    // ---------- 导出 ----------

    function baseName() {
        return `${fmt.baseFilename(state.context)}_图文笔记`;
    }

    async function exportDocx() {
        const { Document, Paragraph, TextRun, ImageRun, HeadingLevel, Packer, AlignmentType } = docx;
        const heading = fmt.documentHeading(state.context, '图文笔记');
        const titles = segmentTitles();
        const children = [
            new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: heading.title, size: 36, bold: true })] }),
            ...heading.meta.map(line => new Paragraph({ children: [new TextRun({ text: line, size: 21, color: '5F6368' })] }))
        ];
        const maxWidth = 600; // 约 A4 版心宽度（像素）

        state.segments.forEach((segment, index) => {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 240, after: 120 },
                children: [new TextRun({ text: titles[index], size: 24, bold: true, color: '5F6368' })]
            }));
            if (segment.page !== null) {
                const page = state.pages[segment.page];
                const scale = Math.min(1, maxWidth / page.width);
                children.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120 },
                    children: [new ImageRun({
                        type: page.format === 'PNG' ? 'png' : 'jpg',
                        data: page.bytes,
                        transformation: { width: Math.round(page.width * scale), height: Math.round(page.height * scale) }
                    })]
                }));
            }
            segmentLines(segment).forEach(line => {
                const runs = [];
                if (line.time) runs.push(new TextRun({ text: `${line.time}  `, size: 20, color: '1A73E8' }));
                line.text.split('\n').forEach((text, i) => runs.push(new TextRun({ text, size: 22, break: i > 0 ? 1 : 0 })));
                children.push(new Paragraph({ spacing: { after: 80 }, children: runs }));
            });
        });

        const doc = new Document({ sections: [{ properties: {}, children }] });
        const filename = `${baseName()}.docx`;
        await media.downloadBlob(await Packer.toBlob(doc), filename);
        return filename;
    }

    async function exportMarkdownZip() {
        const heading = fmt.documentHeading(state.context, '图文笔记');
        const titles = segmentTitles();
        const zip = new JSZip();
        const imageNames = new Map();
        const lines = [`# ${heading.title}`, ''];
        if (heading.meta.length) lines.push(...heading.meta.map(line => `- ${line}`), '');

        state.segments.forEach((segment, index) => {
            lines.push(`## ${titles[index]}`, '');
            if (segment.page !== null) {
                const page = state.pages[segment.page];
                if (!imageNames.has(page)) {
                    const name = `images/p${String(segment.page + 1).padStart(3, '0')}.${page.format === 'PNG' ? 'png' : 'jpg'}`;
                    imageNames.set(page, name);
                    zip.file(name, page.bytes);
                }
                lines.push(`![第 ${segment.page + 1} 页](${imageNames.get(page)})`, '');
            }
            segmentLines(segment).forEach(line => {
                const text = line.text.replace(/\n/g, '  \n');
                lines.push(line.time ? `**[${line.time}]** ${text}` : text, '');
            });
        });

        const name = baseName();
        zip.file(`${name}.md`, lines.join('\n'));
        const filename = `${name}.zip`;
        await media.downloadBlob(await zip.generateAsync({ type: 'blob' }), filename);
        return filename;
    }

    async function runExport(task) {
        setBusy(true);
        setStatus('正在生成文件...');
        try {
            const filename = await task();
            setStatus(`导出成功：${filename}`);
        } catch (error) {
            console.error(error);
            setStatus(`导出失败：${error.message}`);
        } finally {
            setBusy(false);
        }
    }

    // ---------- 初始化 ----------

    async function load() {
        if (!tabId) throw new Error('缺少课程页面信息，请从插件弹窗中打开图文笔记');
        setBusy(true);

        setStatus('正在读取 PPT 和文字稿...');
        const [pptResult, transcriptResult] = await Promise.allSettled([
            media.callTab(tabId, 'getPptList'),
            media.callTab(tabId, 'extractTranscript')
        ]);
        if (pptResult.status === 'rejected' && transcriptResult.status === 'rejected') {
            throw pptResult.reason;
        }

        const warnings = [];
        if (transcriptResult.status === 'fulfilled') {
            state.items = transcriptResult.value.items;
            state.context = transcriptResult.value.context || {};
            if (!fmt.hasTimestamps(state.items)) warnings.push('文字稿没有时间信息，文字统一放在最后');
        } else {
            warnings.push(`未获取到文字稿（${transcriptResult.reason.message}）`);
        }

        let slides = [];
        if (pptResult.status === 'fulfilled') {
            slides = pptResult.value.slides;
            state.context = pptResult.value.context || state.context;
            if (!slides.length) warnings.push('该课次没有 PPT 截图');
        } else {
            warnings.push(`未获取到 PPT（${pptResult.reason.message}）`);
        }

        if (slides.length) {
            const { slides: loaded, failed } = await media.loadSlides(slides, true, (done, total) => {
                setStatus(`正在下载 PPT 截图（${done}/${total}）...`);
            });
            state.shots = loaded;
            if (failed) warnings.push(`${failed} 张截图下载失败`);
        }

        setStatus('正在整理笔记...');
        await media.sleep(0);
        computeSegments();
        render();
        setBusy(false);
        setStatus([`共 ${state.pages.length} 页 PPT、${state.items.length} 段文字`, ...warnings].join('；'));
    }

    languageSelect.addEventListener('change', render);
    timestampCheck.addEventListener('change', render);
    dedupCheck.addEventListener('change', () => {
        computeSegments();
        render();
        setStatus(`共 ${state.pages.length} 页 PPT、${state.items.length} 段文字`);
    });
    $('docxBtn').addEventListener('click', () => runExport(exportDocx));
    $('mdBtn').addEventListener('click', () => runExport(exportMarkdownZip));
    $('printBtn').addEventListener('click', () => window.print());

    load().catch(error => {
        console.error(error);
        setStatus(`错误：${error.message}`);
    });
});
