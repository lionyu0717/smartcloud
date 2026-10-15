const test = require('node:test');
const assert = require('node:assert');
const { buildSegments } = require('../src/popup/notes.js');

const say = (begin, text) => ({ begin, original: text, translate: '' });
const texts = segment => segment.items.map(item => item.original);

test('按时间把讲解文字分配到对应的 PPT 页', () => {
    // 第 0 页的动画截了两次（10s、20s），40s 换到第 1 页，60s 是空白过场，70s 翻回第 0 页
    const shots = [{ sec: 10, page: 0 }, { sec: 20, page: 0 }, { sec: 40, page: 1 }, { sec: 60, page: -1 }, { sec: 70, page: 0 }];
    const items = [say(2, '课前'), say(15, '第一页'), say(39.9, '还是第一页'), say(41, '第二页'), say(65, '过场也算第二页'), say(80, '回到第一页')];
    const segments = buildSegments(shots, items);
    assert.deepStrictEqual(segments.map(s => [s.page, s.start]), [[null, 0], [0, 10], [1, 40], [0, 70]]);
    assert.deepStrictEqual(segments.map(texts), [['课前'], ['第一页', '还是第一页'], ['第二页', '过场也算第二页'], ['回到第一页']]);
});

test('没有时间信息的文字放在最后', () => {
    const segments = buildSegments([{ sec: 5, page: 0 }], [{ begin: null, original: '旧版页面', translate: '' }]);
    assert.deepStrictEqual(segments.map(s => s.page), [0, null]);
    assert.deepStrictEqual(texts(segments[1]), ['旧版页面']);
});

test('没有 PPT 时所有文字归为一段', () => {
    const segments = buildSegments([], [say(1, 'a'), say(2, 'b')]);
    assert.strictEqual(segments.length, 1);
    assert.deepStrictEqual(texts(segments[0]), ['a', 'b']);
});

test('开头的空白过场被忽略，缺少时间的截图沿用前一张的时间', () => {
    const segments = buildSegments([{ sec: 0, page: -1 }, { sec: 5, page: 0 }, { sec: null, page: 1 }], [say(6, 'x')]);
    assert.deepStrictEqual(segments.map(s => [s.page, s.start]), [[0, 5], [1, 5]]);
    // 两段开始时间相同时，文字归到后一段
    assert.deepStrictEqual(segments.map(texts), [[], ['x']]);
});
