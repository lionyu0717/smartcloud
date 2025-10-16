// 导入 docx 相关依赖
import { Document, Paragraph, HeadingLevel, AlignmentType, Packer } from 'docx';

let currentTranscript = '';
let currentCourseName = '';

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 提取文字稿按钮
    document.getElementById('extractText').addEventListener('click', async () => {
        const hasTranscript = await getTranscript();
        if (hasTranscript) {
            // 启用导出按钮
            document.querySelectorAll('.export-button').forEach(btn => {
                btn.disabled = false;
            });
        }
    });

    // 导出按钮点击事件
    document.getElementById('exportButton').addEventListener('click', async () => {
        const format = document.getElementById('formatSelect').value;
        await exportFile(format);
    });
});

// 获取文字稿
async function getTranscript() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const response = await chrome.tabs.sendMessage(tab.id, { action: "extractTranscript" });
        
        if (response && response.success) {
            currentTranscript = response.data.plainText;
            return true;
        }
        return false;
    } catch (error) {
        console.error('获取文字稿失败:', error);
        return false;
    }
}

// 导出文件
async function exportFile(format) {
    if (!currentTranscript) {
        alert('请先提取文字稿！');
        return;
    }

    let blob;
    let filename = `${currentCourseName || '课程文字稿'}.${format}`;

    switch (format) {
        case 'txt':
            blob = new Blob([currentTranscript], { type: 'text/plain;charset=utf-8' });
            break;
            
        case 'docx':
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            text: currentCourseName || '课程文字稿',
                            heading: HeadingLevel.HEADING_1,
                            alignment: AlignmentType.CENTER
                        }),
                        ...currentTranscript.split('\n\n').map(text => 
                            new Paragraph({ text: text.trim() })
                        )
                    ],
                }],
            });
            blob = await Packer.toBlob(doc);
            break;
            
        case 'md':
            const mdContent = `# ${currentCourseName || '课程文字稿'}\n\n${currentTranscript}`;
            blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
            break;
    }

    // 下载文件
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

