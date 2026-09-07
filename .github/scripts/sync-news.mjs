import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const START = '<!-- news-sync:start -->';
const END = '<!-- news-sync:end -->';
const FORUM = 'https://hpc-dat.github.io/forum';

export function summarize(markdown, limit = 360) {
	const paragraph = markdown
		.replace(/<!--.*?-->/gs, '')
		.split(/\n\s*\n/)
		.map((part) => part.trim())
		.find((part) => part && !part.startsWith('#')) ?? '';
	const plain = paragraph
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/[*_`~>#]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	if (plain.length <= limit) return plain;
	return `${plain.slice(0, limit + 1).replace(/\s+\S*$/, '').trimEnd()}...`;
}

export function escapeMarkdown(value) {
	return value.replace(/([\\[\]])/g, '\\$1');
}

export function renderNews(discussions) {
	const news = discussions
		.filter((item) => ['news', 'announcements'].includes(item.category?.slug))
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
		.slice(0, 5);
	if (news.length === 0) return '_News will be published here soon._';
	return news
		.map((item) => {
			const date = new Intl.DateTimeFormat('en-GB', {
				day: 'numeric',
				month: 'long',
				year: 'numeric',
				timeZone: 'UTC'
			}).format(new Date(item.createdAt));
			const url = `${FORUM}/d/${item.number}`;
			return `### [${escapeMarkdown(item.title)}](${url})\n\n_Published ${date}_\n\n${summarize(item.body)}`;
		})
		.join('\n\n');
}

export function replaceManagedBlock(document, generated) {
	const start = document.indexOf(START);
	const end = document.indexOf(END);
	if (
		start < 0 ||
		end < 0 ||
		end <= start ||
		document.indexOf(START, start + 1) >= 0 ||
		document.indexOf(END, end + 1) >= 0
	) {
		throw new Error('Expected exactly one valid news-sync marker pair');
	}
	return `${document.slice(0, start + START.length)}\n${generated}\n${document.slice(end)}`;
}

export async function syncNews(sourcePath, targetPath) {
	const source = JSON.parse(await readFile(sourcePath, 'utf8'));
	if (!Array.isArray(source.discussions)) throw new Error('Forum archive has no discussions array');
	const current = await readFile(targetPath, 'utf8');
	const next = replaceManagedBlock(current, renderNews(source.discussions));
	if (next === current) return false;
	await writeFile(targetPath, next);
	return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const changed = await syncNews(
		process.argv[2] ?? '_forum-data/posts/index.json',
		process.argv[3] ?? 'profile/README.md'
	);
	console.log(changed ? 'Updated organization profile news' : 'Organization profile news is current');
}
