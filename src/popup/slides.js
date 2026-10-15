// PPT 截图去重（纯函数，弹窗和 node 测试共用）
//
// 智云是对投影画面定时截图，同一页会因动画逐步出现、老师边讲边写、翻回前面而被截很多次。
// 思路参考 zju-learning-cli（MIT, https://github.com/geniucker-dev/zju-learning-cli）的 dedup_slides：
// 一页的“笔画”若全都还在后一页里，它就是后一页的子集，连续的一串只留最后、最完整的一张；
// 翻回已讲过的页（笔画全都在之前保留的某页里）也视为重复。
// “笔画”= 与邻域均值差别明显的像素，大片纯色背景不算；“全都还在”= 消失的笔画没有聚成块。
(function (root) {
    const WIDTH = 384;
    const HEIGHT = 216;
    const THRESHOLD = 40;     // 灰度差门槛
    const RADIUS = 7;         // 邻域半径（15×15）
    const CELL = 8;           // 统计“成块消失”的格子大小
    const CELL_MIN = 4;       // 一个格子里消失多少个笔画像素算“少了东西”
    const MAX_LOST_CELLS = 2; // 允许的零星消失格数（JPEG 噪声）
    const MIN_STROKES = 400;  // 判断“翻回旧页”时，笔画太少的近空白页不参与比较
    const LOOKBACK = 20;      // 翻回旧页时最多往回比较的页数

    // 用积分图计算每个像素邻域均值，得到笔画掩码
    function strokeMask(frame, width = WIDTH, height = HEIGHT) {
        const w1 = width + 1;
        const integral = new Float64Array(w1 * (height + 1));
        for (let y = 0; y < height; y++) {
            let rowSum = 0;
            for (let x = 0; x < width; x++) {
                rowSum += frame[y * width + x];
                integral[(y + 1) * w1 + x + 1] = integral[y * w1 + x + 1] + rowSum;
            }
        }
        const mask = new Uint8Array(width * height);
        let count = 0;
        for (let y = 0; y < height; y++) {
            const y0 = Math.max(0, y - RADIUS);
            const y1 = Math.min(height, y + RADIUS + 1);
            for (let x = 0; x < width; x++) {
                const x0 = Math.max(0, x - RADIUS);
                const x1 = Math.min(width, x + RADIUS + 1);
                const sum = integral[y1 * w1 + x1] - integral[y0 * w1 + x1] - integral[y1 * w1 + x0] + integral[y0 * w1 + x0];
                const mean = sum / ((y1 - y0) * (x1 - x0));
                if (Math.abs(frame[y * width + x] - mean) > THRESHOLD) {
                    mask[y * width + x] = 1;
                    count++;
                }
            }
        }
        return { mask, count };
    }

    function standardDeviation(frame) {
        let sum = 0;
        let sumSq = 0;
        for (let i = 0; i < frame.length; i++) {
            sum += frame[i];
            sumSq += frame[i] * frame[i];
        }
        const mean = sum / frame.length;
        return Math.sqrt(Math.max(0, sumSq / frame.length - mean * mean));
    }

    // a 的笔画在 b 中“成块消失”的格子数
    function lostCells(a, maskA, b, width = WIDTH, height = HEIGHT) {
        const cols = Math.ceil(width / CELL);
        const counts = new Uint16Array(cols * Math.ceil(height / CELL));
        let lost = 0;
        for (let y = 0; y < height; y++) {
            const row = Math.floor(y / CELL) * cols;
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                if (maskA[i] && Math.abs(a[i] - b[i]) > THRESHOLD) {
                    const cell = row + Math.floor(x / CELL);
                    if (++counts[cell] === CELL_MIN) lost++;
                }
            }
        }
        return lost;
    }

    // frames: 与截图顺序一致的灰度图（Uint8Array，WIDTH×HEIGHT）
    // 返回 keep（保留的截图下标）和 groupOf（每张截图并入了第几张保留页，空白过场为 -1）
    function dedupFrames(frames, width = WIDTH, height = HEIGHT) {
        const masks = frames.map(frame => strokeMask(frame, width, height));
        const blank = frames.map(frame => standardDeviation(frame) < 3);
        const keep = [];
        const groupOf = new Array(frames.length).fill(-1);
        const lost = (i, j) => lostCells(frames[i], masks[i].mask, frames[j], width, height);

        for (let j = 0; j < frames.length; j++) {
            if (blank[j]) continue;
            const last = keep.length - 1;
            // 前一张保留页是这张的子集（动画没放完、还没写完）→ 换成更完整的这张
            if (last >= 0 && lost(keep[last], j) <= MAX_LOST_CELLS) {
                keep[last] = j;
                groupOf[j] = last;
                continue;
            }
            // 翻回讲过的页，或擦掉板书后的干净版
            if (last >= 0 && masks[j].count >= MIN_STROKES) {
                let matched = -1;
                for (let k = last; k >= Math.max(0, keep.length - LOOKBACK); k--) {
                    if (lost(j, keep[k]) <= MAX_LOST_CELLS) { matched = k; break; }
                }
                if (matched >= 0) {
                    groupOf[j] = matched;
                    continue;
                }
            }
            keep.push(j);
            groupOf[j] = keep.length - 1;
        }

        // 全部是空白页时原样保留
        if (!keep.length) {
            frames.forEach((_, i) => { keep.push(i); groupOf[i] = i; });
        }
        return { keep, groupOf };
    }

    const api = { WIDTH, HEIGHT, strokeMask, lostCells, dedupFrames };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.SmartcloudSlides = api;
    }
})(typeof self !== 'undefined' ? self : this);
