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

// 处理跨域请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchTranscript') {
        fetch(request.url)
            .then(response => response.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // 保持消息通道开启
    }
}); 