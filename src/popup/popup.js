document.addEventListener('DOMContentLoaded', () => {
    const extractBtn = document.getElementById('extractBtn');
    const previewBtn = document.getElementById('previewBtn');
    const exportBtn = document.getElementById('exportBtn');
    const formatSelect = document.getElementById('formatSelect');
    const languageSelect = document.getElementById('languageSelect');
    const status = document.getElementById('status');
    const progress = document.getElementById('progress');
    const progressBar = document.getElementById('progressBar');
    const previewContainer = document.getElementById('previewContainer');

    const LANGUAGE_SUFFIX = {
        chinese: '中文',
        english: '英文',
        bilingual: '中英双语'
    };

    let currentTranscript = null;

    // 更新进度条
    function updateProgress(percent) {
        progress.style.display = 'block';
        progressBar.style.width = `${percent}%`;
        if (percent >= 100) {
            setTimeout(() => {
                progress.style.display = 'none';
            }, 500);
        }
    }

    // 向页面发送提取请求；content script 未注入时（如插件安装前已打开的页面）先注入再重试
    async function requestTranscript(tabId) {
        try {
            return await chrome.tabs.sendMessage(tabId, { action: 'extractTranscript' });
        } catch (error) {
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['src/content/content.js']
            });
            return await chrome.tabs.sendMessage(tabId, { action: 'extractTranscript' });
        }
    }

    // 提取文字稿
    async function extractTranscript() {
        try {
            status.textContent = '正在提取文字稿...';
            extractBtn.disabled = true;
            previewBtn.disabled = true;
            exportBtn.disabled = true;
            updateProgress(20);

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !/^https?:\/\/[^/]*zju\.edu\.cn\//.test(tab.url || '')) {
                throw new Error('请在智云课堂的课程回放页面使用本插件');
            }

            const response = await requestTranscript(tab.id);
            updateProgress(60);

            if (!response || !response.success) {
                throw new Error(response?.error || '未收到页面响应，请刷新页面后重试');
            }

            currentTranscript = {
                chinese: response.data.chineseText,
                english: response.data.englishText,
                bilingual: response.data.bilingualText,
                title: response.data.title
            };

            status.textContent = `提取成功！共 ${response.data.count} 段（${response.data.location}）`;
            previewBtn.disabled = false;
            exportBtn.disabled = false;
            updateProgress(100);

            if (previewContainer.style.display === 'block') {
                previewTranscript();
            }
        } catch (error) {
            status.textContent = `错误：${error.message}`;
            updateProgress(100);
        } finally {
            extractBtn.disabled = false;
        }
    }

    function sanitizeFilename(name) {
        return name.replace(/[\\/:*?"<>|\n\r]+/g, '_').trim().slice(0, 80);
    }

    async function buildDocx(content, heading) {
        const { Document, Paragraph, TextRun, Packer } = docx;
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [new TextRun({ text: heading, bold: true, size: 36 })],
                        spacing: { after: 200 }
                    }),
                    ...content.split('\n\n').map(block =>
                        new Paragraph({
                            children: block.split('\n').map((line, i) =>
                                new TextRun({ text: line.trim(), size: 24, break: i > 0 ? 1 : 0 })
                            ),
                            spacing: { after: 120 }
                        })
                    )
                ]
            }]
        });
        return Packer.toBlob(doc);
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

    // 导出文件
    async function exportFile() {
        if (!currentTranscript) return;
        try {
            const format = formatSelect.value;
            const language = languageSelect.value;
            const content = currentTranscript[language];
            const languageSuffix = LANGUAGE_SUFFIX[language];

            if (!content) {
                throw new Error(`该课程没有${languageSuffix}文字稿，请选择其他语言`);
            }

            status.textContent = '正在导出...';
            exportBtn.disabled = true;
            updateProgress(20);

            const title = sanitizeFilename(currentTranscript.title || '') || '文字稿';
            const heading = `课程文字稿（${languageSuffix}）`;
            const baseName = `${title}_${languageSuffix}`;
            let blob;
            let filename;

            switch (format) {
                case 'md':
                    blob = new Blob([`# ${heading}\n\n${content}\n`], { type: 'text/markdown;charset=utf-8' });
                    filename = `${baseName}.md`;
                    break;
                case 'docx':
                    status.textContent = '正在生成 Word 文档...';
                    updateProgress(40);
                    blob = await buildDocx(content, heading);
                    filename = `${baseName}.docx`;
                    break;
                case 'txt':
                default:
                    blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                    filename = `${baseName}.txt`;
                    break;
            }

            updateProgress(80);
            await downloadBlob(blob, filename);
            status.textContent = `导出成功：${filename}`;
            updateProgress(100);
        } catch (error) {
            console.error('导出错误:', error);
            status.textContent = `导出失败：${error.message}`;
            updateProgress(100);
        } finally {
            exportBtn.disabled = !currentTranscript;
        }
    }

    // 预览内容
    function previewTranscript() {
        if (!currentTranscript) return;
        const language = languageSelect.value;
        previewContainer.textContent = currentTranscript[language] || `（没有${LANGUAGE_SUFFIX[language]}文字稿）`;
        previewContainer.style.display = 'block';
    }

    extractBtn.addEventListener('click', extractTranscript);
    previewBtn.addEventListener('click', previewTranscript);
    exportBtn.addEventListener('click', exportFile);

    // 语言切换时更新预览
    languageSelect.addEventListener('change', () => {
        if (previewContainer.style.display === 'block') {
            previewTranscript();
        }
    });
});
