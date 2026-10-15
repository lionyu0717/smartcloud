// 图文笔记：把 PPT 截图与讲解文字按时间对齐（纯函数，笔记页和 node 测试共用）
(function (root) {
    // shots：按时间排序的截图 [{ sec, page }]，page 为去重后保留页的下标，空白过场为 -1
    // items：文字稿条目 [{ begin, ... }]
    // 返回段落 [{ page, start, items }]：老师停留在同一页的连续时间合并为一段；
    // 翻回旧页时会再出现一段（page 相同），保持讲课顺序。page 为 null 表示没有对应的 PPT。
    function buildSegments(shots, items) {
        const runs = [];
        let lastSec = 0;
        shots.forEach(shot => {
            const sec = typeof shot.sec === 'number' ? shot.sec : lastSec;
            lastSec = sec;
            const prev = runs[runs.length - 1];
            // 空白过场并入前一页
            const page = shot.page >= 0 ? shot.page : (prev ? prev.page : -1);
            if (page < 0) return;
            if (prev && prev.page === page) return;
            runs.push({ page, start: sec, items: [] });
        });

        const leading = { page: null, start: 0, items: [] };
        const trailing = { page: null, start: null, items: [] };
        items.forEach(item => {
            if (typeof item.begin !== 'number') {
                trailing.items.push(item);
                return;
            }
            // 找到开始时间不晚于这句话的最后一段（runs 按时间递增）
            let lo = 0;
            let hi = runs.length - 1;
            let found = -1;
            while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                if (runs[mid].start <= item.begin) {
                    found = mid;
                    lo = mid + 1;
                } else {
                    hi = mid - 1;
                }
            }
            (found >= 0 ? runs[found] : leading).items.push(item);
        });

        return [
            ...(leading.items.length ? [leading] : []),
            ...runs,
            ...(trailing.items.length ? [trailing] : [])
        ];
    }

    const api = { buildSegments };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.SmartcloudNotes = api;
    }
})(typeof self !== 'undefined' ? self : this);
