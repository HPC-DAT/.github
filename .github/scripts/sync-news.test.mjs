import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeMarkdown, renderNews, replaceManagedBlock, summarize } from './sync-news.mjs';

const item = (overrides = {}) => ({
	number: 8,
	title: 'News [update]',
	body: 'Lead with **useful** information.\n\nDetails follow.',
	createdAt: '2026-09-07T10:00:00Z',
	category: { slug: 'news' },
	...overrides
});

test('renders forum-linked news and filters unrelated topics', () => {
	const output = renderNews([item(), item({ number: 9, category: { slug: 'general' } })]);
	assert.ok(output.includes('News \\[update\\]'));
	assert.match(output, /forum\/d\/8/);
	assert.match(output, /Lead with useful information/);
	assert.doesNotMatch(output, /Details follow/);
});

test('supports the announcement slug during category migration and an empty state', () => {
	assert.match(renderNews([item({ category: { slug: 'announcements' } })]), /forum\/d\/8/);
	assert.match(renderNews([]), /published here soon/);
});

test('truncates summaries and escapes markdown titles', () => {
	assert.equal(summarize('alpha beta gamma', 10), 'alpha beta...');
	assert.equal(escapeMarkdown('a[b]\\c'), 'a\\[b\\]\\\\c');
});

test('replaces only one valid marker pair', () => {
	assert.equal(
		replaceManagedBlock('before\n<!-- news-sync:start -->\nold\n<!-- news-sync:end -->\nafter', 'new'),
		'before\n<!-- news-sync:start -->\nnew\n<!-- news-sync:end -->\nafter'
	);
	assert.throws(() => replaceManagedBlock('missing', 'new'), /marker pair/);
	assert.throws(
		() => replaceManagedBlock('<!-- news-sync:start --><!-- news-sync:end --><!-- news-sync:end -->', 'new'),
		/marker pair/
	);
});
