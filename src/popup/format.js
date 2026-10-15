// 文字稿与文件名的格式化工具（纯函数，弹窗和 node 测试共用）
(function (root) {
    const LANGUAGE_SUFFIX = {
        chinese: '中文',
        english: '英文',
        bilingual: '中英双语'
    };

    function pad(num, width = 2) {
        return String(num).padStart(width, '0');
    }

    // 秒 → HH:MM:SS；srt 为 true 时输出 HH:MM:SS,mmm
    function formatTimestamp(seconds, srt = false) {
        const totalMs = Math.max(0, Math.round((Number(seconds) || 0) * 1000));
        const h = Math.floor(totalMs / 3600000);
        const m = Math.floor((totalMs % 3600000) / 60000);
        const s = Math.floor((totalMs % 60000) / 1000);
        const base = `${pad(h)}:${pad(m)}:${pad(s)}`;
        return srt ? `${base},${pad(totalMs % 1000, 3)}` : base;
    }

    function hasTimestamps(items) {
        return items.length > 0 && items.every(item => typeof item.begin === 'number');
    }

    // 按语言取一条文字稿的内容；没有对应内容时返回空字符串
    function itemText(item, language) {
        if (language === 'english') return item.translate || '';
        if (language === 'bilingual') {
            return item.translate ? `${item.original}\n${item.translate}` : item.original;
        }
        return item.original || '';
    }

    // 生成文字稿段落；timestamps 为 'plain' 或 'markdown' 时在段首加时间
    function buildTranscriptBlocks(items, language, timestamps = '') {
        const withTime = timestamps && hasTimestamps(items);
        return items
            .map(item => {
                const text = itemText(item, language);
                if (!text) return '';
                if (!withTime) return text;
                const time = formatTimestamp(item.begin);
                return timestamps === 'markdown' ? `**[${time}]** ${text}` : `[${time}] ${text}`;
            })
            .filter(Boolean);
    }

    function buildSrt(items, language) {
        if (!hasTimestamps(items)) {
            throw new Error('当前页面无法获取字幕时间，不能导出 SRT');
        }
        const entries = [];
        items.forEach((item, index) => {
            const text = itemText(item, language);
            if (!text) return;
            const next = items[index + 1];
            let end = typeof item.end === 'number' && item.end > item.begin ? item.end : null;
            if (end === null) end = next && next.begin > item.begin ? next.begin : item.begin + 3;
            entries.push(`${entries.length + 1}\n${formatTimestamp(item.begin, true)} --> ${formatTimestamp(end, true)}\n${text}\n`);
        });
        return entries.join('\n');
    }

    function sanitizeFilename(name) {
        return String(name || '')
            .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/^\.+/, '')
            .slice(0, 100);
    }

    // 课程信息里的 “2025-03-03 第3-5节” 拆成日期和节次
    function splitSubTitle(subTitle) {
        const match = String(subTitle || '').match(/^(\d{4}-\d{1,2}-\d{1,2})\s*(第[\d\-－~～]+节)?/);
        return match ? { date: match[1], period: match[2] || '' } : { date: '', period: '' };
    }

    // 文件名：课程名_课次（如 线性代数_2025-03-03 第3-5节），没有课程信息时用网页标题
    function baseFilename(context) {
        const parts = [context?.course, context?.subTitle].map(sanitizeFilename).filter(Boolean);
        if (parts.length) return parts.join('_');
        return sanitizeFilename(context?.pageTitle) || '智云课堂';
    }

    // 文档标题与课程信息行
    function documentHeading(context, label) {
        const title = [context?.course, context?.subTitle].filter(Boolean).join(' ') || context?.pageTitle || '课程';
        const meta = [];
        if (context?.teacher) meta.push(`教师：${context.teacher}`);
        const { date, period } = splitSubTitle(context?.subTitle);
        if (date) meta.push(`时间：${[date, period].filter(Boolean).join(' ')}`);
        return { title: `${title} ${label}`.trim(), meta };
    }

    const api = {
        LANGUAGE_SUFFIX,
        formatTimestamp,
        hasTimestamps,
        itemText,
        buildTranscriptBlocks,
        buildSrt,
        sanitizeFilename,
        splitSubTitle,
        baseFilename,
        documentHeading
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.SmartcloudFormat = api;
    }
})(typeof self !== 'undefined' ? self : this);
