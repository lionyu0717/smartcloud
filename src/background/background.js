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

// 智云接口的登录凭证：classroom 域名下 _token cookie 中的 JWT
async function getBearerToken() {
    try {
        const cookies = await chrome.cookies.getAll({ domain: 'zju.edu.cn', name: '_token' });
        for (const cookie of cookies) {
            const match = decodeURIComponent(cookie.value || '').match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/);
            if (match) return match[0];
        }
    } catch (e) {
        console.warn('读取智云登录凭证失败:', e);
    }
    return '';
}

function isZjuUrl(raw) {
    try {
        const url = new URL(raw);
        return url.protocol === 'https:' && url.hostname.endsWith('.zju.edu.cn');
    } catch (e) {
        return false;
    }
}

// 代 content script 请求智云接口：不受 CORS 限制，并带上登录凭证
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchJson') {
        // 只允许请求浙大域名
        if (!isZjuUrl(request.url)) {
            sendResponse({ success: false, error: '不允许的地址' });
            return;
        }
        (async () => {
            const token = await getBearerToken();
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const response = await fetch(request.url, { credentials: 'include', headers });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })()
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // 保持消息通道开启
    }
});
