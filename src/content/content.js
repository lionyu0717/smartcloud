// 智云课堂字幕导出助手 - content script
// 运行在智云课堂页面中，负责调用智云接口（文字稿、课程信息、PPT 截图、原始课件），
// 改版后的回放页优先走接口，旧版页面回退到 DOM 解析。

// 避免重复注册：插件重新加载后旧脚本失效（chrome.runtime.id 为空），此时允许重新注册
if (!(window.__smartcloudAlive && window.__smartcloudAlive())) {
    window.__smartcloudAlive = () => {
        try { return Boolean(chrome.runtime && chrome.runtime.id); } catch (e) { return false; }
    };

    const CLASSROOM_ORIGIN = 'https://classroom.zju.edu.cn';
    const INTERACTIVE_ORIGIN = 'https://interactivemeta.cmc.zju.edu.cn';
    const TRANS_API_ORIGIN = 'https://yjapi.cmc.zju.edu.cn';
    const TRANS_API_PATH = '/courseapi/v3/web-socket/search-trans-result';

    // ---------- 参数与地址 ----------

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

    function withParams(base, path, params) {
        const url = new URL(path, base);
        Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
        return url.href;
    }

    // courseapi 在 classroom 与 interactivemeta 两个域名下都有，优先用当前页面所在域名
    function courseApiUrls(path, params) {
        const origins = [...new Set([location.origin, CLASSROOM_ORIGIN, INTERACTIVE_ORIGIN])];
        return origins.map(origin => withParams(origin, path, params));
    }

    function pptApiUrls(params) {
        const candidates = location.origin === CLASSROOM_ORIGIN
            ? [[CLASSROOM_ORIGIN, '/pptnote/v1/schedule/search-ppt'], [INTERACTIVE_ORIGIN, '/pptnoteapi/v1/schedule/search-ppt']]
            : [[location.origin, '/pptnoteapi/v1/schedule/search-ppt'], [INTERACTIVE_ORIGIN, '/pptnoteapi/v1/schedule/search-ppt'],
               [CLASSROOM_ORIGIN, '/pptnote/v1/schedule/search-ppt']];
        return [...new Set(candidates.map(([origin, path]) => withParams(origin, path, params)))];
    }

    // 只接受浙大域名下的图片/文件地址，并把 http 升级为 https
    function normalizeZjuUrl(raw) {
        if (typeof raw !== 'string' || !raw.trim()) return '';
        try {
            const url = new URL(raw.trim(), location.origin);
            if (!/(^|\.)zju\.edu\.cn$/.test(url.hostname)) return '';
            url.protocol = 'https:';
            return url.href;
        } catch (e) {
            return '';
        }
    }

    // ---------- 请求 ----------

    async function fetchJsonDirect(url) {
        const sameOrigin = new URL(url).origin === location.origin;
        const response = await fetch(url, { credentials: sameOrigin ? 'include' : 'omit' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }

    // 由 background 代为请求：不受 CORS 限制，并会带上智云登录凭证
    async function fetchJsonViaBackground(url) {
        const result = await chrome.runtime.sendMessage({ action: 'fetchJson', url });
        if (!result || !result.success) throw new Error(result?.error || '请求失败');
        return result.data;
    }

    function isAuthError(data) {
        return data && (data.code === 401 || data.code === 403);
    }

    async function fetchJson(url) {
        try {
            const data = await fetchJsonDirect(url);
            if (!isAuthError(data)) return data;
        } catch (error) {
            // 跨域或未登录，交给 background 重试
        }
        return fetchJsonViaBackground(url);
    }

    // 依次尝试候选地址，返回第一个被 accept 接受的响应
    async function fetchFirst(urls, accept) {
        let lastError = null;
        for (const url of urls) {
            try {
                const data = await fetchJson(url);
                if (accept(data)) return data;
                lastError = new Error(data?.msg || data?.message || '接口返回异常');
            } catch (error) {
                lastError = error;
            }
        }
        throw lastError || new Error('请求失败');
    }

    // ---------- 课程信息 ----------

    let subInfoCache = null;

    async function getSubInfo() {
        const courseId = findParam('course_id');
        const subId = findParam('sub_id');
        if (!courseId || !subId) return null;
        if (subInfoCache && subInfoCache.subId === subId) return subInfoCache.data;
        try {
            const data = await fetchFirst(
                courseApiUrls('/courseapi/v3/portal-home-setting/get-sub-info', { course_id: courseId, sub_id: subId }),
                res => res?.code === 0 && res.data
            );
            subInfoCache = { subId, data: data.data };
            return data.data;
        } catch (error) {
            console.warn('[智云字幕导出] 获取课程信息失败:', error);
            return null;
        }
    }

    async function getContext() {
        const info = await getSubInfo();
        const text = selector => document.querySelector(selector)?.textContent.trim() || '';
        return {
            courseId: findParam('course_id'),
            subId: findParam('sub_id'),
            course: String(info?.course_title || text('header .title') || ''),
            teacher: String(info?.lecturer_name || text('header .name') || ''),
            subTitle: String(info?.sub_title || text('header .sub') || ''),
            pageTitle: document.title || ''
        };
    }

    // ---------- 文字稿 ----------

    function transUrls() {
        const urls = performance.getEntriesByType('resource')
            .map(entry => entry.name)
            .filter(name => name.includes('search-trans-result'))
            .reverse(); // 页面自己请求过的地址最可靠
        const subId = findParam('sub_id');
        if (subId) {
            [location.origin, TRANS_API_ORIGIN].forEach(origin => {
                urls.push(withParams(origin, TRANS_API_PATH, { sub_id: subId, format: 'json' }));
            });
        }
        return [...new Set(urls)];
    }

    function toSeconds(value) {
        const num = Number(value);
        return Number.isFinite(num) && num >= 0 ? num : null;
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
                begin: toSeconds(item.BeginSec),
                end: toSeconds(item.EndSec),
                original: item.Text.trim(),
                translate: typeof item.TransText === 'string' ? item.TransText.trim() : ''
            }));
    }

    async function extractFromApi() {
        let lastError = null;
        for (const url of transUrls()) {
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

    // 旧版页面：从“语音识别”面板的 DOM 中读取（没有时间信息）
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
                    begin: null,
                    end: null,
                    original: originalText,
                    translate: translate ? translate.textContent.trim() : ''
                });
            }
        });
        return items;
    }

    async function extractTranscript() {
        const context = await getContext();
        const apiItems = await extractFromApi();
        if (apiItems && apiItems.length) return { items: apiItems, source: '智云接口', context };

        const domItems = extractFromDom();
        if (domItems.length) {
            const isNorthCampus = document.querySelector('.trans-lan') !== null;
            return { items: domItems, source: isNorthCampus ? '北教' : '东西教', context };
        }

        throw new Error('未找到文字稿。请在智云课堂的课程回放页面使用，并确认该课程已有“语音识别”文字稿');
    }

    // ---------- PPT 截图 ----------

    function parsePptRows(data) {
        const rows = [data?.list, data?.data?.list, data?.data].find(Array.isArray) || [];
        const slides = [];
        rows.forEach(row => {
            let content = row?.content;
            if (typeof content === 'string') {
                try { content = JSON.parse(content); } catch (e) { content = null; }
            }
            const url = normalizeZjuUrl(content?.pptimgurl || row?.pptimgurl);
            if (url) slides.push({ url, sec: toSeconds(row?.created_sec) });
        });
        return { slides, total: Number(data?.total ?? data?.data?.total) || 0, rowCount: rows.length };
    }

    async function getPptList() {
        const courseId = findParam('course_id');
        const subId = findParam('sub_id');
        if (!courseId || !subId) {
            throw new Error('当前页面缺少课程参数，请在智云课堂的课程回放页面使用');
        }

        const slides = [];
        let rowsSeen = 0;
        // 服务器可能限制每页条数，因此按 total 或空页判断是否结束
        for (let page = 1; page <= 50; page++) {
            const data = await fetchFirst(
                pptApiUrls({ course_id: courseId, sub_id: subId, page, per_page: 100 }),
                res => res && !isAuthError(res) && (res.code === undefined || res.code === 0)
            );
            const parsed = parsePptRows(data);
            slides.push(...parsed.slides);
            rowsSeen += parsed.rowCount;
            if (!parsed.rowCount || (parsed.total && rowsSeen >= parsed.total)) break;
        }

        // 按出现时间排序（保持同一时间的原始顺序）
        slides.sort((a, b) => (a.sec ?? Infinity) - (b.sec ?? Infinity));
        return { slides, context: await getContext() };
    }

    // ---------- 原始课件（PPT 文件） ----------

    async function getCoursewareStatus() {
        const subId = findParam('sub_id');
        const courseId = findParam('course_id');
        if (!subId) throw new Error('当前页面缺少课程参数，请在智云课堂的课程回放页面使用');

        let data = null;
        try {
            data = await fetchFirst(
                courseApiUrls('/courseapi/v2/export/get-courseware-status', { type: 1, sub_id: subId, get_source_url: 1 }),
                res => res && typeof res.code === 'number' && !isAuthError(res)
            );
        } catch (error) {
            console.warn('[智云字幕导出] 查询课件状态失败:', error);
        }

        if (data?.code === 0 && data.data?.path_name) {
            return { status: 'ready', url: normalizeZjuUrl(data.data.path_name) || data.data.path_name, fileName: data.data.file_name || '' };
        }

        // 课次信息里有时直接带有课件下载地址
        const info = courseId ? await getSubInfo() : null;
        const ppt = info?.content?.download?.ppt;
        if (ppt?.path_name) {
            return { status: 'ready', url: normalizeZjuUrl(ppt.path_name) || ppt.path_name, fileName: ppt.file_name || '' };
        }

        // code 1 / 200 表示课件尚未生成，可以发起生成
        if (data && (data.code === 1 || data.code === 200)) return { status: 'pending' };
        return { status: 'none', message: data?.msg || '' };
    }

    async function startCoursewareExport() {
        const subId = findParam('sub_id');
        const data = await fetchFirst(
            courseApiUrls('/courseapi/v2/export/export-async', { sub_id: subId, export_type: 'courseware', type: 1 }),
            res => res && typeof res.code === 'number' && !isAuthError(res)
        );
        if (data.code !== 0) throw new Error(data.msg || '发起课件生成失败');
        return { started: true };
    }

    // ---------- 消息 ----------

    const handlers = {
        getContext,
        extractTranscript,
        getPptList,
        getCoursewareStatus,
        startCoursewareExport
    };

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        const handler = handlers[request.action];
        if (!handler) return;
        handler()
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // 异步响应
    });
}
