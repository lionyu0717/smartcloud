const test = require('node:test');
const assert = require('node:assert');
const { WIDTH, HEIGHT, dedupFrames } = require('../src/popup/slides.js');

// 白底上画若干黑色矩形，模拟幻灯片上的文字
function frame(rects, noise = 0) {
    const f = new Uint8Array(WIDTH * HEIGHT).fill(255);
    for (const [x0, y0, w, h] of rects) {
        for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) f[y * WIDTH + x] = 0;
    }
    if (noise) for (let i = 0; i < f.length; i += 97) f[i] = Math.max(0, f[i] - noise);
    return f;
}

const title = [[40, 20, 300, 12]];
const bullet1 = [[40, 60, 200, 4], [40, 70, 180, 4]];
const bullet2 = [[40, 110, 220, 4], [40, 120, 160, 4]];
const other = [[60, 40, 4, 140], [120, 40, 4, 140], [200, 150, 150, 6]];

test('动画逐步出现的页面只保留最完整的一张', () => {
    const frames = [frame([...title]), frame([...title, ...bullet1]), frame([...title, ...bullet1, ...bullet2])];
    const { keep, groupOf } = dedupFrames(frames);
    assert.deepStrictEqual(keep, [2]);
    assert.deepStrictEqual(groupOf, [0, 0, 0]);
});

test('不同页面都保留，翻回旧页和空白过场被去掉', () => {
    const a = frame([...title, ...bullet1, ...bullet2]);
    const b = frame(other);
    const blank = new Uint8Array(WIDTH * HEIGHT).fill(0);
    const frames = [a, frame([...title, ...bullet1, ...bullet2], 5), b, blank, frame([...title, ...bullet1, ...bullet2])];
    const { keep, groupOf } = dedupFrames(frames);
    assert.deepStrictEqual(keep, [1, 2]);
    assert.deepStrictEqual(groupOf, [0, 0, 1, -1, 0]);
});

test('标题相同但正文换了的页面不合并', () => {
    const frames = [frame([...title, ...bullet1]), frame([...title, ...bullet2])];
    assert.deepStrictEqual(dedupFrames(frames).keep, [0, 1]);
});

test('擦掉板书后的干净版并入之前的页面', () => {
    const frames = [frame([...title, ...bullet1, ...bullet2]), frame(other), frame([...title, ...bullet1])];
    const { keep, groupOf } = dedupFrames(frames);
    assert.deepStrictEqual(keep, [0, 1]);
    assert.deepStrictEqual(groupOf, [0, 1, 0]);
});
