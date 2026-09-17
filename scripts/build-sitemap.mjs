#!/usr/bin/env node
/**
 * Regenerate sitemap.xml.
 *
 * URLs come from PAGES below; <lastmod> comes from the file's last commit, so
 * it can't drift the way a hand-written date does. Pages carrying
 * <meta name="robots" content="noindex"> are skipped.
 *
 *   node scripts/build-sitemap.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://hubmerto.com';

// path on the site → file that defines it → how often it really changes
const PAGES = [
    ['/', 'index.html', 'monthly', '1.0'],
    ['/projects', 'projects/index.html', 'monthly', '0.9'],
    ['/contact', 'contact/index.html', 'yearly', '0.7'],
    ['/projects/karim-boumjimar', 'projects/karim-boumjimar/index.html', 'monthly', '0.8'],
    ['/projects/marie-matusz', 'projects/marie-matusz/index.html', 'monthly', '0.8'],
    ['/projects/strelitzia', 'projects/strelitzia/index.html', 'monthly', '0.8'],
    ['/projects/emojify', 'projects/emojify/index.html', 'monthly', '0.8'],
    ['/projects/boiler-eggs', 'projects/boiler-eggs/index.html', 'monthly', '0.8'],
    ['/projects/anonymous-empire', 'projects/anonymous-empire/index.html', 'monthly', '0.8'],
    ['/projects/memphy', 'projects/memphy/index.html', 'monthly', '0.8'],
    ['/projects/emilio-tamez', 'projects/emilio-tamez/index.html', 'monthly', '0.8'],
    ['/imprint', 'imprint/index.html', 'yearly', '0.3'],
    ['/privacy', 'privacy/index.html', 'yearly', '0.3'],
];

function lastmod(file) {
    try {
        // Uncommitted edits haven't got a commit date yet; they changed today.
        const dirty = execFileSync('git', ['status', '--porcelain', '--', file], { cwd: root }).toString().trim();
        if (dirty) return new Date().toISOString().slice(0, 10);

        const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: root }).toString().trim();
        return out || null;
    } catch {
        return null;
    }
}

const entries = [];
const skipped = [];

for (const [loc, file, changefreq, priority] of PAGES) {
    const abs = join(root, file);
    if (!existsSync(abs)) {
        skipped.push(`${loc} (missing ${file})`);
        continue;
    }
    // A noindex page in the sitemap is a contradiction Search Console reports.
    if (/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(readFileSync(abs, 'utf8'))) {
        skipped.push(`${loc} (noindex)`);
        continue;
    }
    const mod = lastmod(file);
    entries.push(
        [
            '    <url>',
            `        <loc>${ORIGIN}${loc}</loc>`,
            mod ? `        <lastmod>${mod}</lastmod>` : null,
            `        <changefreq>${changefreq}</changefreq>`,
            `        <priority>${priority}</priority>`,
            '    </url>',
        ]
            .filter(Boolean)
            .join('\n')
    );
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

writeFileSync(join(root, 'sitemap.xml'), xml);
console.log(`sitemap.xml: ${entries.length} urls`);
if (skipped.length) console.log(`skipped: ${skipped.join(', ')}`);
