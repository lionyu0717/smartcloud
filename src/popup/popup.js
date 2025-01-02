console.log('Libraries:', {
    docx: window.docx,
    pdfMake: window.pdfMake
});

document.addEventListener('DOMContentLoaded', () => {
    const extractBtn = document.getElementById('extractBtn');
    const previewBtn = document.getElementById('previewBtn');
    const formatSelect = document.getElementById('formatSelect');
    const languageSelect = document.getElementById('languageSelect');
    const status = document.getElementById('status');
    const progress = document.getElementById('progress');
    const progressBar = document.getElementById('progressBar');
    const previewContainer = document.getElementById('previewContainer');
    const previewContent = document.getElementById('previewContent');
    
    let currentTranscript = {
        chinese: null,
        english: null,
        bilingual: null
    };

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

    // 提取文字稿
    async function extractTranscript() {
        try {
            status.textContent = '正在提取文字稿...';
            extractBtn.disabled = true;
            previewBtn.disabled = true;
            progress.style.display = 'block';
            updateProgress(20);

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const response = await chrome.tabs.sendMessage(tab.id, { 
                action: 'extractTranscript',
                includeEnglish: true
            });

            updateProgress(60);

            if (!response.success) {
                throw new Error(response.error);
            }

            currentTranscript = {
                chinese: response.data.chineseText,
                english: response.data.englishText,
                bilingual: response.data.bilingualText
            };
            
            status.textContent = `提取成功！(${response.data.location})`;
            extractBtn.textContent = '导出文字稿';
            previewBtn.disabled = false;
            updateProgress(100);

        } catch (error) {
            status.textContent = `错误：${error.message}`;
            updateProgress(100);
        } finally {
            extractBtn.disabled = false;
        }
    }

    // 导出文件
    async function exportFile() {
        try {
            status.textContent = '正在导出...';
            extractBtn.disabled = true;
            updateProgress(20);

            const format = formatSelect.value;
            const language = languageSelect.value;
            const content = currentTranscript[language];
            
            let blob;
            let filename;
            const languageSuffix = {
                chinese: '中文',
                english: '英文',
                bilingual: '中英双语'
            }[language];

            switch (format) {
                case 'txt':
                    blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                    filename = `文字稿_${languageSuffix}.txt`;
                    break;
                    
                case 'md':
                    const mdContent = `# 课程文字稿（${languageSuffix}）\n\n${content}`;
                    blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
                    filename = `文字稿_${languageSuffix}.md`;
                    break;
                    
                case 'docx':
                    status.textContent = '正在生成 Word 文档...';
                    updateProgress(40);
                    
                    const { Document, Paragraph, TextRun, Packer } = docx;
                    
                    const doc = new Document({
                        sections: [{
                            properties: {},
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: `课程文字稿（${languageSuffix}）`,
                                            bold: true,
                                            size: 36
                                        })
                                    ],
                                    spacing: { after: 200 }
                                }),
                                ...content.split('\n\n').map(text => 
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: text.trim(),
                                                size: 24
                                            })
                                        ],
                                        spacing: { after: 120 }
                                    })
                                )
                            ]
                        }]
                    });
                    
                    updateProgress(60);
                    
                    blob = await Packer.toBlob(doc);
                    filename = `文字稿_${languageSuffix}.docx`;
                    break;
            }

            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
                
                status.textContent = '导出成功！';
                updateProgress(100);
            }

        } catch (error) {
            console.error('导出错误:', error);
            status.textContent = `导出失败：${error.message}`;
            updateProgress(100);
        } finally {
            extractBtn.disabled = false;
        }
    }

    // 预览内容
    function previewTranscript() {
        if (!currentTranscript) return;
        const language = languageSelect.value;
        previewContent.textContent = currentTranscript[language];
        previewContainer.style.display = 'block';
    }

    // 事件监听
    extractBtn.addEventListener('click', () => {
        if (currentTranscript.chinese || currentTranscript.english || currentTranscript.bilingual) {
            exportFile();
        } else {
            extractTranscript();
        }
    });

    // 语言切换时更新预览
    languageSelect.addEventListener('change', () => {
        if (previewContainer.style.display === 'block') {
            previewTranscript();
        }
    });

    previewBtn.addEventListener('click', previewTranscript);

    // 添加预览状态管理
    const previewState = {
        currentPage: 1,
        totalPages: 1,
        zoomLevel: 1,
        pages: []
    };

    // 更新预览函数
    function updatePreview(settings) {
        const previewPages = document.getElementById('previewPages');
        const content = currentTranscript.split('\n\n');
        
        // 计算每页内容
        previewState.pages = [];
        let currentPageContent = [];
        let currentHeight = 0;
        const maxHeight = 900; // 大约A4纸高度的像素值
        
        content.forEach(text => {
            const textHeight = estimateTextHeight(text, settings);
            if (currentHeight + textHeight > maxHeight) {
                previewState.pages.push(currentPageContent);
                currentPageContent = [text];
                currentHeight = textHeight;
            } else {
                currentPageContent.push(text);
                currentHeight += textHeight;
            }
        });
        
        if (currentPageContent.length > 0) {
            previewState.pages.push(currentPageContent);
        }
        
        previewState.totalPages = previewState.pages.length;
        document.getElementById('totalPages').textContent = previewState.totalPages;
        
        // 渲染预览页面
        renderPreviewPages();
    }

    // 渲染预览页面
    function renderPreviewPages() {
        const previewPages = document.getElementById('previewPages');
        previewPages.innerHTML = '';
        
        previewState.pages.forEach((pageContent, index) => {
            const page = document.createElement('div');
            page.className = 'preview-page';
            page.style.transform = `scale(${previewState.zoomLevel})`;
            
            const content = document.createElement('div');
            content.className = 'preview-content';
            content.innerHTML = `
                <h1 style="text-align: center; margin-bottom: 20px;">课程文字稿</h1>
                ${pageContent.map(text => `<p style="margin-bottom: 10px;">${text}</p>`).join('')}
            `;
            
            // 添加页码
            if (document.getElementById('showPageNumber').checked) {
                const pageNumber = document.createElement('div');
                pageNumber.className = 'page-number';
                pageNumber.textContent = `第 ${index + 1} 页`;
                content.appendChild(pageNumber);
            }
            
            page.appendChild(content);
            previewPages.appendChild(page);
        });
    }

    // 缩放控制
    document.getElementById('zoomIn').onclick = () => {
        previewState.zoomLevel = Math.min(previewState.zoomLevel + 0.25, 2);
        updateZoomUI();
        renderPreviewPages();
    };

    document.getElementById('zoomOut').onclick = () => {
        previewState.zoomLevel = Math.max(previewState.zoomLevel - 0.25, 0.5);
        updateZoomUI();
        renderPreviewPages();
    };

    document.getElementById('zoomLevel').onchange = (e) => {
        const value = e.target.value;
        if (value === 'fit') {
            fitToPage();
        } else {
            previewState.zoomLevel = parseFloat(value);
            renderPreviewPages();
        }
    };

    // 页面导航
    document.getElementById('prevPage').onclick = () => {
        if (previewState.currentPage > 1) {
            previewState.currentPage--;
            updatePageNavigation();
        }
    };

    document.getElementById('nextPage').onclick = () => {
        if (previewState.currentPage < previewState.totalPages) {
            previewState.currentPage++;
            updatePageNavigation();
        }
    };

    document.getElementById('currentPage').onchange = (e) => {
        const page = parseInt(e.target.value);
        if (page >= 1 && page <= previewState.totalPages) {
            previewState.currentPage = page;
            updatePageNavigation();
        }
    };

    // 更新页面导航 UI
    function updatePageNavigation() {
        document.getElementById('currentPage').value = previewState.currentPage;
        document.getElementById('prevPage').disabled = previewState.currentPage === 1;
        document.getElementById('nextPage').disabled = previewState.currentPage === previewState.totalPages;
        
        // 滚动到当前页
        const pages = document.querySelectorAll('.preview-page');
        pages[previewState.currentPage - 1]?.scrollIntoView({ behavior: 'smooth' });
    }

    // 更新缩放 UI
    function updateZoomUI() {
        const zoomSelect = document.getElementById('zoomLevel');
        zoomSelect.value = previewState.zoomLevel;
    }

    // 适应页面大小
    function fitToPage() {
        const container = document.querySelector('.preview-scroll-container');
        const page = document.querySelector('.preview-page');
        if (container && page) {
            const scale = Math.min(
                (container.clientWidth - 40) / page.clientWidth,
                (container.clientHeight - 40) / page.clientHeight
            );
            previewState.zoomLevel = scale;
            updateZoomUI();
            renderPreviewPages();
        }
    }

    // 估算文本高度
    function estimateTextHeight(text, settings) {
        const fontSize = parseInt(settings.fontSize);
        const lineHeight = 1.5;
        const charsPerLine = 50;
        const lines = Math.ceil(text.length / charsPerLine);
        return fontSize * lineHeight * lines;
    }
});

