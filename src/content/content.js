console.log('content script 已加载');

// 避免重复声明
if (typeof window.transcriptExtractor === 'undefined') {
    class TranscriptExtractor {
        constructor() {
            this.loaded = false;
            this._init();
        }

        _init() {
            if (this.loaded) return;
            console.log('初始化中...');
            this.loaded = true;
        }

        async extractTranscript() {
            try {
                console.log('开始提取文字稿');
                
                // 查找文字稿容器
                const transcriptItems = document.querySelectorAll('.spoken-language-body .trans-item');
                if (!transcriptItems.length) {
                    throw new Error('未找到文字稿内容');
                }

                // 提取文字稿内容
                const transcriptData = Array.from(transcriptItems).map(item => {
                    const original = item.querySelector('.item-origin');
                    const translate = item.querySelector('.item-tanslate-En');
                    
                    return {
                        original: original ? original.textContent.trim() : '',
                        translate: translate ? translate.textContent.trim() : ''
                    };
                });

                // 处理提取的内容
                return this._processTranscript(transcriptData);

            } catch (error) {
                console.error('提取失败:', error);
                throw error;
            }
        }

        _processTranscript(transcriptData) {
            // 只返回中文原文
            return transcriptData
                .map(item => item.original)
                .filter(text => text.length > 0)
                .join('\n\n');
        }
    }

    // 创建全局实例
    window.transcriptExtractor = new TranscriptExtractor();
}

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('收到消息:', request);
    
    if (request.action === 'extractTranscript') {
        window.transcriptExtractor.extractTranscript()
            .then(transcript => {
                console.log('发送响应:', transcript);
                sendResponse({ 
                    success: true, 
                    data: { plainText: transcript }
                });
            })
            .catch(error => {
                console.error('发送错误:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message 
                });
            });
            
        return true;
    }
});

console.log('content script 加载完成'); 