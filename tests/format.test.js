const test = require('node:test');
const assert = require('node:assert');
const fmt = require('../src/popup/format.js');

const items = [
    { begin: 1.2, end: 4, original: '同学们好', translate: 'Hello everyone' },
    { begin: 65, end: null, original: '复习矩阵', translate: '' },
    { begin: 3725.5, end: 3726, original: '下课', translate: 'Class dismissed' }
];

test('formatTimestamp', () => {
    assert.strictEqual(fmt.formatTimestamp(0), '00:00:00');
    assert.strictEqual(fmt.formatTimestamp(3725.5), '01:02:05');
    assert.strictEqual(fmt.formatTimestamp(3725.5, true), '01:02:05,500');
    assert.strictEqual(fmt.formatTimestamp(-3, true), '00:00:00,000');
});

test('buildTranscriptBlocks 按语言和时间戳输出', () => {
    assert.deepStrictEqual(fmt.buildTranscriptBlocks(items, 'chinese'), ['同学们好', '复习矩阵', '下课']);
    assert.deepStrictEqual(fmt.buildTranscriptBlocks(items, 'english'), ['Hello everyone', 'Class dismissed']);
    assert.deepStrictEqual(fmt.buildTranscriptBlocks(items, 'bilingual', 'plain'),
        ['[00:00:01] 同学们好\nHello everyone', '[00:01:05] 复习矩阵', '[01:02:05] 下课\nClass dismissed']);
    assert.strictEqual(fmt.buildTranscriptBlocks(items, 'chinese', 'markdown')[0], '**[00:00:01]** 同学们好');
});

test('没有时间信息时忽略时间戳', () => {
    const domItems = [{ begin: null, end: null, original: '旧版', translate: '' }];
    assert.deepStrictEqual(fmt.buildTranscriptBlocks(domItems, 'chinese', 'plain'), ['旧版']);
    assert.throws(() => fmt.buildSrt(domItems, 'chinese'), /SRT/);
});

test('buildSrt 补全缺失的结束时间并跳过空条目', () => {
    const srt = fmt.buildSrt(items, 'english');
    assert.strictEqual(srt,
        '1\n00:00:01,200 --> 00:00:04,000\nHello everyone\n\n' +
        '2\n01:02:05,500 --> 01:02:06,000\nClass dismissed\n');
    const zh = fmt.buildSrt(items, 'chinese');
    assert.match(zh, /2\n00:01:05,000 --> 01:02:05,500\n复习矩阵/);
});

test('文件名与标题', () => {
    const context = { course: '线性代数', teacher: '张三', subTitle: '2025-03-03 第3-5节', pageTitle: '智云课堂' };
    assert.strictEqual(fmt.baseFilename(context), '线性代数_2025-03-03 第3-5节');
    assert.strictEqual(fmt.baseFilename({ pageTitle: 'a/b:c' }), 'a_b_c');
    assert.strictEqual(fmt.baseFilename({}), '智云课堂');
    assert.deepStrictEqual(fmt.documentHeading(context, '文字稿'), {
        title: '线性代数 2025-03-03 第3-5节 文字稿',
        meta: ['教师：张三', '时间：2025-03-03 第3-5节']
    });
});
