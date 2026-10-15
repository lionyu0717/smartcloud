document.addEventListener('DOMContentLoaded', () => {
    const fmt = window.SmartcloudFormat;
    const slidesLib = window.SmartcloudSlides;

    const $ = id => document.getElementById(id);
    const courseInfo = $('courseInfo');
    const extractBtn = $('extractBtn');
    const previewBtn = $('previewBtn');
    const exportBtn = $('exportBtn');
    const pptPdfBtn = $('pptPdfBtn');
    const coursewareBtn = $('coursewareBtn');
    const formatSelect = $('formatSelect');
    const languageSelect = $('languageSelect');
    const timestampCheck = $('timestampCheck');
    const dedupCheck = $('dedupCheck');
    const status = $('status');
    const progress = $('progress');
    const progressBar = $('progressBar');
    const previewContainer = $('previewContainer');

    const actionButtons = [extractBtn, pptPdfBtn, coursewareBtn];
    let currentTranscript = null; // { items, source, context }
    let currentContext = null;
    let busy = false;

    // ---------- 通用 ----------

    function setStatus(text) {
        status.textContent = text;
    }

    function updateProgress(percent) {
        progress.style.display = 'block';
        progressBar.style.width = `${percent}%`;
        if (percent >= 100) {
            setTimeout(() => {
                progress.style.display = 'none';
            }, 500);
        }
    }

    function updateButtons() {
        actionButtons.forEach(btn => { btn.disabled = busy; });
        previewBtn.disabled = busy || !currentTranscript;
        exportBtn.disabled = busy || !currentTranscript;
        const srt = formatSelect.value === 'srt';
        const hasTime = currentTranscript ? fmt.hasTimestamps(currentTranscript.items) : true;
        timestampCheck.disabled = srt || !hasTime;
    }

    // 同一时间只执行一个耗时操作
    async function runTask(task) {
        if (busy) return;
        busy = true;
        updateButtons();
        try {
            await task();
        } catch (error) {
            console.error(error);
            setStatus(`错误：${error.message}`);
            updateProgress(100);
        } finally {
            busy = false;
            updateButtons();
        }
    }

    async function getZjuTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !/^https?:\/\/[^/]*zju\.edu\.cn\//.test(tab.url || '')) {
            throw new Error('请在智云课堂的课程回放页面使用本插件');
        }
        return tab;
    }

    // 向页面发送请求；content script 未注入时（如插件安装前已打开的页面）先注入再重试
    async function callPage(action) {
        const tab = await getZjuTab();
        let response;
        try {
            response = await chrome.tabs.sendMessage(tab.id, { action });
        } catch (error) {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['src/content/content.js']
            });
            response = await chrome.tabs.sendMessage(tab.id, { action });
        }
        if (!response || !response.success) {
            throw new Error(response?.error || '未收到页面响应，请刷新页面后重试');
        }
        return response.data;
    }

    async function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        try {
            await chrome.downloads.download({ url, filename, saveAs: false });
        } catch (error) {
            // downloads API 不可用时退回到 <a download>
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
        // 延迟释放，避免下载尚未开始就失效
        setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
    }

    // 限制并发执行异步任务，保持结果顺序
    async function mapLimit(list, limit, fn) {
        const results = new Array(list.length);
        let next = 0;
        const workers = Array.from({ length: Math.min(limit, list.length) }, async () => {
            while (next < list.length) {
                const index = next++;
                results[index] = await fn(list[index], index);
            }
        });
        await Promise.all(workers);
        return results;
    }

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    // ---------- 课程信息 ----------

    function renderContext(context) {
        courseInfo.textContent = '';
        const title = document.createElement('div');
        title.className = 'course-title';
        title.textContent = context.course || context.pageTitle || '智云课堂';
        courseInfo.appendChild(title);
        const metaText = [context.teacher, context.subTitle].filter(Boolean).join(' · ');
        if (metaText) {
            const meta = document.createElement('div');
            meta.className = 'course-meta';
            meta.textContent = metaText;
            courseInfo.appendChild(meta);
        }
    }

    async function loadContext() {
        try {
            currentContext = await callPage('getContext');
            renderContext(currentContext);
        } catch (error) {
            courseInfo.textContent = error.message;
        }
    }

    // ---------- 文字稿 ----------

    async function extractTranscript() {
        setStatus('正在提取文字稿...');
        updateProgress(20);
        const data = await callPage('extractTranscript');
        currentTranscript = data;
        currentContext = data.context || currentContext;
        if (currentContext) renderContext(currentContext);
        setStatus(`提取成功！共 ${data.items.length} 段（${data.source}）`);
        updateProgress(100);
        if (previewContainer.style.display === 'block') previewTranscript();
    }

    function transcriptBlocks(timestampStyle) {
        const language = languageSelect.value;
        const style = timestampCheck.checked && !timestampCheck.disabled ? timestampStyle : '';
        return fmt.buildTranscriptBlocks(currentTranscript.items, language, style);
    }

    function previewTranscript() {
        if (!currentTranscript) return;
        const blocks = transcriptBlocks('plain');
        previewContainer.textContent = blocks.length
            ? blocks.join('\n\n')
            : `（没有${fmt.LANGUAGE_SUFFIX[languageSelect.value]}文字稿）`;
        previewContainer.style.display = 'block';
    }

    async function buildDocx(blocks, heading) {
        const { Document, Paragraph, TextRun, Packer } = docx;
        const paragraph = (text, options = {}) => new Paragraph({
            children: text.split('\n').map((line, i) =>
                new TextRun({ text: line.trim(), size: options.size || 24, bold: options.bold, color: options.color, break: i > 0 ? 1 : 0 })
            ),
            spacing: { after: options.after ?? 120 }
        });
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    paragraph(heading.title, { size: 36, bold: true, after: 120 }),
                    ...heading.meta.map(line => paragraph(line, { size: 21, color: '5F6368', after: 60 })),
                    paragraph('', { after: 120 }),
                    ...blocks.map(block => paragraph(block))
                ]
            }]
        });
        return Packer.toBlob(doc);
    }

    async function exportTranscript() {
        if (!currentTranscript) return;
        const format = formatSelect.value;
        const language = languageSelect.value;
        const languageSuffix = fmt.LANGUAGE_SUFFIX[language];
        const context = currentTranscript.context || currentContext || {};
        const baseName = `${fmt.baseFilename(context)}_${languageSuffix}`;
        const heading = fmt.documentHeading(context, `文字稿（${languageSuffix}）`);

        setStatus('正在导出...');
        updateProgress(20);

        let blob;
        let filename;
        if (format === 'srt') {
            const srt = fmt.buildSrt(currentTranscript.items, language);
            if (!srt) throw new Error(`该课程没有${languageSuffix}文字稿，请选择其他语言`);
            blob = new Blob([srt], { type: 'application/x-subrip;charset=utf-8' });
            filename = `${baseName}.srt`;
        } else {
            const blocks = transcriptBlocks(format === 'md' ? 'markdown' : 'plain');
            if (!blocks.length) throw new Error(`该课程没有${languageSuffix}文字稿，请选择其他语言`);
            if (format === 'md') {
                const meta = heading.meta.map(line => `- ${line}`).join('\n');
                const md = `# ${heading.title}\n\n${meta ? meta + '\n\n' : ''}${blocks.join('\n\n')}\n`;
                blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
                filename = `${baseName}.md`;
            } else if (format === 'docx') {
                setStatus('正在生成 Word 文档...');
                updateProgress(40);
                blob = await buildDocx(blocks, heading);
                filename = `${baseName}.docx`;
            } else {
                blob = new Blob([blocks.join('\n\n')], { type: 'text/plain;charset=utf-8' });
                filename = `${baseName}.txt`;
            }
        }

        updateProgress(80);
        await downloadBlob(blob, filename);
        setStatus(`导出成功：${filename}`);
        updateProgress(100);
    }

    // ---------- PPT 截图 → PDF ----------

    async function fetchImage(url) {
        let lastError = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const response = await fetch(url, { credentials: 'include' });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const blob = await response.blob();
                if (!blob.size) throw new Error('空文件');
                return blob;
            } catch (error) {
                lastError = error;
                await sleep(300 * 2 ** attempt);
            }
        }
        throw lastError;
    }

    function imageFormat(bytes) {
        if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'JPEG';
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'PNG';
        return '';
    }

    // 下载并解码一张截图：返回 PDF 可用的数据、尺寸和用于去重的灰度缩略图
    async function loadSlide(slide, withThumbnail) {
        const blob = await fetchImage(slide.url);
        const bitmap = await createImageBitmap(blob);
        const { width, height } = bitmap;
        let bytes = new Uint8Array(await blob.arrayBuffer());
        let format = imageFormat(bytes);

        // 非 JPEG/PNG（如 webp）转成 JPEG
        if (!format) {
            const canvas = new OffscreenCanvas(width, height);
            canvas.getContext('2d').drawImage(bitmap, 0, 0);
            const jpeg = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
            bytes = new Uint8Array(await jpeg.arrayBuffer());
            format = 'JPEG';
        }

        let thumbnail = null;
        if (withThumbnail) {
            const w = slidesLib.WIDTH;
            const h = slidesLib.HEIGHT;
            const canvas = new OffscreenCanvas(w, h);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(bitmap, 0, 0, w, h);
            const rgba = ctx.getImageData(0, 0, w, h).data;
            thumbnail = new Uint8Array(w * h);
            for (let i = 0, p = 0; i < thumbnail.length; i++, p += 4) {
                thumbnail[i] = Math.round(0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]);
            }
        }
        bitmap.close();
        return { ...slide, bytes, format, width, height, thumbnail };
    }

    async function exportPptPdf() {
        setStatus('正在获取 PPT 列表...');
        updateProgress(5);
        const { slides, context } = await callPage('getPptList');
        if (!slides.length) throw new Error('该课次没有 PPT 截图');
        currentContext = context || currentContext;

        const dedup = dedupCheck.checked;
        let done = 0;
        let failed = 0;
        const loaded = await mapLimit(slides, 6, async slide => {
            try {
                return await loadSlide(slide, dedup);
            } catch (error) {
                console.warn('截图下载失败:', slide.url, error);
                failed++;
                return null;
            } finally {
                done++;
                setStatus(`正在下载 PPT 截图（${done}/${slides.length}）...`);
                updateProgress(5 + Math.round((done / slides.length) * 75));
            }
        });

        let pages = loaded.filter(Boolean);
        if (!pages.length) throw new Error('PPT 截图全部下载失败，请确认已登录智云课堂');

        if (dedup && pages.length > 1) {
            setStatus('正在合并重复截图...');
            await sleep(0);
            const { keep } = slidesLib.dedupFrames(pages.map(page => page.thumbnail));
            pages = keep.map(index => pages[index]);
        }

        setStatus(`正在生成 PDF（${pages.length} 页）...`);
        updateProgress(85);
        await sleep(0);

        const { jsPDF } = window.jspdf;
        const orientation = page => (page.width >= page.height ? 'landscape' : 'portrait');
        const first = pages[0];
        const pdf = new jsPDF({
            unit: 'px',
            format: [first.width, first.height],
            orientation: orientation(first),
            hotfixes: ['px_scaling'],
            compress: true
        });
        pages.forEach((page, index) => {
            if (index > 0) pdf.addPage([page.width, page.height], orientation(page));
            pdf.addImage(page.bytes, page.format, 0, 0, page.width, page.height);
        });
        const heading = fmt.documentHeading(currentContext, 'PPT');
        pdf.setProperties({ title: heading.title, subject: heading.meta.join('；'), creator: '智云课堂字幕导出助手' });

        const filename = `${fmt.baseFilename(currentContext)}_PPT.pdf`;
        await downloadBlob(pdf.output('blob'), filename);
        const removed = slides.length - failed - pages.length;
        const notes = [removed > 0 ? `已合并 ${removed} 张重复截图` : '', failed > 0 ? `${failed} 张下载失败` : '']
            .filter(Boolean).join('，');
        setStatus(`导出成功：${filename}（共 ${pages.length} 页${notes ? '，' + notes : ''}）`);
        updateProgress(100);
    }

    // ---------- 原始课件 ----------

    const COURSEWARE_POLL_INTERVAL = 10 * 1000;
    const COURSEWARE_TIMEOUT = 5 * 60 * 1000;

    async function downloadCourseware() {
        setStatus('正在查询课件...');
        updateProgress(10);
        let result = await callPage('getCoursewareStatus');

        if (result.status === 'pending') {
            // 课件尚未生成：与智云网页端“导出课件”相同，发起生成后定时查询
            await callPage('startCoursewareExport');
            const startedAt = Date.now();
            while (result.status === 'pending') {
                if (Date.now() - startedAt > COURSEWARE_TIMEOUT) {
                    throw new Error('课件生成超时（较长的课可能需要几分钟），请稍后再试');
                }
                const waited = Math.round((Date.now() - startedAt) / 1000);
                setStatus(`智云正在生成课件，请稍候（已等待 ${waited} 秒）...`);
                updateProgress(Math.min(90, 10 + waited / 3));
                await sleep(COURSEWARE_POLL_INTERVAL);
                result = await callPage('getCoursewareStatus');
            }
        }

        if (result.status !== 'ready') {
            throw new Error(`该课次没有可下载的原始课件${result.message ? `（${result.message}）` : ''}，可以改用“导出 PPT 截图”`);
        }

        let filename = fmt.sanitizeFilename(result.fileName) || `${fmt.baseFilename(currentContext)}_课件`;
        if (!/\.[a-z0-9]{2,5}$/i.test(filename)) filename += '.pptx';
        await chrome.downloads.download({ url: result.url, filename, saveAs: false });
        setStatus(`已开始下载：${filename}`);
        updateProgress(100);
    }

    // ---------- 事件 ----------

    extractBtn.addEventListener('click', () => runTask(extractTranscript));
    exportBtn.addEventListener('click', () => runTask(exportTranscript));
    previewBtn.addEventListener('click', previewTranscript);
    pptPdfBtn.addEventListener('click', () => runTask(exportPptPdf));
    coursewareBtn.addEventListener('click', () => runTask(downloadCourseware));

    formatSelect.addEventListener('change', updateButtons);
    [languageSelect, timestampCheck].forEach(el => el.addEventListener('change', () => {
        if (previewContainer.style.display === 'block') previewTranscript();
    }));

    updateButtons();
    loadContext();
});
