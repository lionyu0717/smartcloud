// 监听插件安装事件
chrome.runtime.onInstalled.addListener(() => {
    console.log('智云课堂字幕导出助手已安装');
});

// 监听标签页更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // 只在页面完全加载后执行
    if (changeInfo.status === 'complete' && tab.url?.includes('classroom.zju.edu.cn')) {
        // 更新插件图标状态
        chrome.action.setIcon({
            tabId: tabId,
            path: {
                "16": "assets/icons/icon16.png",
                "48": "assets/icons/icon48.png",
                "128": "assets/icons/icon128.png"
            }
        });
    }
});

// 处理跨域请求（content script 直接请求被 CORS 拦截时由这里代为请求）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchTranscript') {
        let url;
        try {
            url = new URL(request.url);
        } catch (e) {
            sendResponse({ success: false, error: '无效的地址' });
            return;
        }
        // 只允许请求浙大域名
        if (url.protocol !== 'https:' || !url.hostname.endsWith('.zju.edu.cn')) {
            sendResponse({ success: false, error: '不允许的地址' });
            return;
        }
        fetch(url.href, { credentials: 'include' })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // 保持消息通道开启
    }
});
