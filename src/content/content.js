// 智云课堂字幕导出助手 - content script
// 优先通过智云的语音转写接口获取文字稿（适配改版后的回放页），失败时回退到旧版页面 DOM 解析。

// 避免重复注册：插件重新加载后旧脚本失效（chrome.runtime.id 为空），此时允许重新注册
if (!(window.__smartcloudAlive && window.__smartcloudAlive())) {
    window.__smartcloudAlive = () => {
        try { return Boolean(chrome.runtime && chrome.runtime.id); } catch (e) { return false; }
    };

    const TRANS_API_PATH = '/courseapi/v3/web-socket/search-trans-result';
    const TRANS_API_ORIGIN = 'https://yjapi.cmc.zju.edu.cn';

    // 从地址栏（含 hash 路由）或页面已加载的请求中查找参数
    function findParam(key) {
        const url = new URL(location.href);
        const hash = url.hash.includes('?') ? url.hash.slice(url.hash.indexOf('?') + 1) : '';
        const direct = url.searchParams.get(key) || new URLSearchParams(hash).get(key);
        if (direct) return direct;

        const resources = performance.getEntriesByType('resource').map(entry => entry.name);
        for (const resource of resources.reverse()) {
            try {
                const value = new URL(resource).searchParams.get(key);
                if (value) return value;
            } catch (e) { /* 忽略无法解析的地址 */ }
        }
        return '';
    }

    // 页面自己请求过的文字稿接口地址（最可靠）
    function findLoadedTransUrl() {
        const urls = performance.getEntriesByType('resource')
            .map(entry => entry.name)
            .filter(name => name.includes('search-trans-result'));
        return urls[urls.length - 1] || '';
    }

    function buildTransUrls() {
        const urls = [];
        const loaded = findLoadedTransUrl();
        if (loaded) urls.push(loaded);

        const subId = findParam('sub_id');
        if (subId) {
            const origins = new Set([location.origin, TRANS_API_ORIGIN]);
            origins.forEach(origin => {
                const url = new URL(TRANS_API_PATH, origin);
                url.searchParams.set('sub_id', subId);
                url.searchParams.set('format', 'json');
                urls.push(url.href);
            });
        }
        return [...new Set(urls)];
    }

    async function fetchJson(url) {
        try {
            const sameOrigin = new URL(url).origin === location.origin;
            const response = await fetch(url, { credentials: sameOrigin ? 'include' : 'omit' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            // 跨域被拦截时交给 background（拥有 zju.edu.cn 的 host 权限）去请求
            const result = await chrome.runtime.sendMessage({ action: 'fetchTranscript', url });
            if (!result || !result.success) throw new Error(result?.error || error.message);
            return result.data;
        }
    }

    function parseTransData(data) {
        if (data && data.code === 10002) {
            throw new Error('该课程暂无语音转写数据（当天的课程通常需要等待转写完成）');
        }
        const list = data?.list ?? data?.data?.list;
        if (!Array.isArray(list)) return null;
        const items = list[0]?.all_content;
        if (!Array.isArray(items)) return null;
        return items
            .filter(item => typeof item?.Text === 'string' && item.Text.trim())
            .map(item => ({
                original: item.Text.trim(),
                translate: typeof item.TransText === 'string' ? item.TransText.trim() : ''
            }));
    }

    async function extractFromApi() {
        const urls = buildTransUrls();
        let lastError = null;
        for (const url of urls) {
            try {
                const items = parseTransData(await fetchJson(url));
                if (items && items.length) return items;
            } catch (error) {
                lastError = error;
                // 明确的“暂无转写”无需再尝试其他地址
                if (error.message.includes('暂无语音转写')) throw error;
            }
        }
        if (lastError) console.warn('[智云字幕导出] 接口获取失败:', lastError);
        return null;
    }

    // 旧版页面：从“语音识别”面板的 DOM 中读取
    function extractFromDom() {
        const items = [];
        document.querySelectorAll('.trans-item').forEach(item => {
            let original = item.querySelector('.item-origin');
            let translate = item.querySelector('.item-tanslate-En, .item-translate-En');

            // 北教页面：中英文分别是 .trans-lan 下的第一个和最后一个 div
            const transLan = item.querySelector('.trans-lan');
            if (!original && transLan) {
                const divs = transLan.querySelectorAll(':scope > div');
                original = divs[0] || null;
                translate = divs.length > 1 ? divs[divs.length - 1] : null;
            }

            const originalText = original ? original.textContent.trim() : '';
            if (originalText) {
                items.push({
                    original: originalText,
                    translate: translate ? translate.textContent.trim() : ''
                });
            }
        });
        return items;
    }

    function buildResult(items, source) {
        const chinese = items.map(item => item.original);
        const english = items.map(item => item.translate).filter(Boolean);
        const bilingual = items.map(item =>
            item.translate ? `${item.original}\n${item.translate}` : item.original
        );
        return {
            chineseText: chinese.join('\n\n'),
            englishText: english.join('\n\n'),
            bilingualText: bilingual.join('\n\n'),
            count: items.length,
            title: document.title || '',
            location: source
        };
    }

    async function extractTranscript() {
        const apiItems = await extractFromApi();
        if (apiItems && apiItems.length) return buildResult(apiItems, '智云接口');

        const domItems = extractFromDom();
        if (domItems.length) {
            const isNorthCampus = document.querySelector('.trans-lan') !== null;
            return buildResult(domItems, isNorthCampus ? '北教' : '东西教');
        }

        throw new Error('未找到文字稿。请在智云课堂的课程回放页面使用，并确认该课程已有“语音识别”文字稿');
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action !== 'extractTranscript') return;
        extractTranscript()
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // 异步响应
    });
}
