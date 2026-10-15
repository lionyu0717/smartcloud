// 弹窗与笔记页共用的浏览器端工具：与页面通信、下载文件、批量下载并解码 PPT 截图
(function (root) {
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    // 向智云页面的 content script 发送请求；未注入时（如插件安装前已打开的页面）先注入再重试
    async function callTab(tabId, action) {
        let response;
        try {
            response = await chrome.tabs.sendMessage(tabId, { action });
        } catch (error) {
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['src/content/content.js']
            });
            response = await chrome.tabs.sendMessage(tabId, { action });
        }
        if (!response || !response.success) {
            throw new Error(response?.error || '未收到页面响应，请刷新智云页面后重试');
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

    // 下载并解码一张截图：返回 JPEG/PNG 数据、尺寸，以及用于去重的灰度缩略图
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
            const w = root.SmartcloudSlides.WIDTH;
            const h = root.SmartcloudSlides.HEIGHT;
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

    // 下载全部截图；单张失败时跳过并计数。onProgress(done, total)
    async function loadSlides(slides, withThumbnail, onProgress) {
        let done = 0;
        let failed = 0;
        const loaded = await mapLimit(slides, 6, async slide => {
            try {
                return await loadSlide(slide, withThumbnail);
            } catch (error) {
                console.warn('截图下载失败:', slide.url, error);
                failed++;
                return null;
            } finally {
                done++;
                if (onProgress) onProgress(done, slides.length);
            }
        });
        return { slides: loaded.filter(Boolean), failed };
    }

    root.SmartcloudMedia = { sleep, callTab, downloadBlob, mapLimit, fetchImage, imageFormat, loadSlide, loadSlides };
})(typeof self !== 'undefined' ? self : this);
