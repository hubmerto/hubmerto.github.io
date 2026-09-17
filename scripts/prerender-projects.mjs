#!/usr/bin/env node
/**
 * Pre-render the left sidebar of every project page into its index.html.
 *
 * The project pages are a drag canvas: everything used to be built at runtime by
 * projects/template.js from project.json, so the served HTML carried twelve words
 * and Googlebot had nothing to index. This writes the exact markup that
 * renderLeftSidebar() produces into the page, between markers, so the text ships
 * in the HTML. template.js skips the columns when it finds them already there,
 * so the rendered result is identical either way.
 *
 * Run after editing any project.json:  node scripts/prerender-projects.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const projectsDir = join(root, 'projects');

// The pre-rendered columns and template.js are a matched pair: a browser holding
// an older cached template.js would render the sidebar a second time. Stamp the
// script with a hash of its contents so a changed template.js is a new URL.
const templateHash = createHash('sha256')
    .update(readFileSync(join(projectsDir, 'template.js')))
    .digest('hex')
    .slice(0, 8);

const START = '<!-- prerender:sidebar:start -->';
const END = '<!-- prerender:sidebar:end -->';

const esc = (s) =>
    String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

function renderSidebar(project) {
    const out = [];
    (project.columns || []).forEach((col, idx) => {
        const s = [];

        if (col.title) {
            if (idx === 0) {
                s.push(`<div class="sidebar-label">${esc((project.hudIndex || '') + ' · Project')}</div>`);
                s.push(`<h1 class="sidebar-title">${esc(col.title)}</h1>`);
            } else {
                s.push(`<h2 class="sidebar-title">${esc(col.title)}</h2>`);
            }
        }
        if (col.tags) s.push(`<div class="sidebar-tags">${esc(col.tags)}</div>`);
        if (col.text) s.push(`<div class="sidebar-text">${esc(col.text)}</div>`);

        if (col.pairs && col.pairs.length) {
            const pairs = col.pairs.map((pair) => {
                const name = pair.href
                    ? `<a class="pair-name" href="${esc(pair.href)}" target="_blank" rel="noopener">${esc(pair.name)}</a>`
                    : `<div class="pair-name">${esc(pair.name)}</div>`;
                return `<div class="pair"><div class="pair-label">${esc(pair.label)}</div>${name}</div>`;
            });
            s.push(`<div class="sidebar-pairs">${pairs.join('')}</div>`);
        }

        if (col.meta && col.meta.length) {
            col.meta.forEach((row) => {
                const value = row.href
                    ? `<a href="${esc(row.href)}" target="_blank" rel="noopener">${esc(row.value)}</a>`
                    : esc(row.value);
                s.push(`<div class="meta-row"><span>${esc(row.label)}</span><span>${value}</span></div>`);
            });
        }

        out.push(`<div class="sidebar-section">${s.join('')}</div>`);
    });
    return out.join('');
}

const slugs = readdirSync(projectsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(projectsDir, d.name, 'project.json')))
    .map((d) => d.name)
    .sort();

const CANVAS_START = '<!-- prerender:canvas:start -->';
const CANVAS_END = '<!-- prerender:canvas:end -->';

/**
 * The canvas nodes, exactly as createNode() builds them, so the project's
 * images ship in the HTML with their alt text instead of appearing only once
 * the drag canvas has been built. template.js re-attaches the JS-only parts
 * (_caption, _code, ready-state listeners) to whatever it finds here.
 */
function renderCanvas(project, slug) {
    return (project.media || [])
        .map((m) => {
            // resolveMediaPaths() rewrites relative srcs at runtime; do the same here.
            const src = /^([a-z]+:|\/)/i.test(m.src) ? m.src : `/projects/${slug}/${m.src}`;

            let el;
            if (m.type === 'video') {
                const mime = m.mime || (m.src.endsWith('.webm') ? 'video/webm' : 'video/mp4');
                el = `<video autoplay loop muted playsinline preload="none" data-src="${esc(src)}" data-mime="${esc(mime)}"></video>`;
            } else if (m.type === 'iframe') {
                const title = m.title ? ` title="${esc(m.title)}"` : '';
                el = `<iframe src="${esc(src)}" loading="lazy" allow="autoplay" referrerpolicy="no-referrer-when-downgrade"${title}></iframe>`;
            } else {
                const alt = ` alt="${esc(m.alt || '')}"`;
                el = `<img loading="lazy" decoding="async" src="${esc(src)}"${alt}>`;
            }

            const cls = ['node'];
            if (m.invertOnDark) cls.push('invert-on-dark');
            if (m.format === 'mobile' || m.mobileFrame) cls.push('mobile-frame');

            let style = '';
            if (m.spin) {
                cls.push('spin');
                const dur = m.spin === 'fast' ? '3s' : m.spin === 'slow' ? '20s' : m.spin === 'medium' ? '8s' : m.spin;
                style = ` style="--spin-duration:${esc(dur)}"`;
            }

            let data = '';
            if (m.w !== undefined) data += ` data-w="${esc(m.w)}"`;
            if (m.h !== undefined) data += ` data-h="${esc(m.h)}"`;
            if (m.size !== undefined) data += ` data-size="${esc(m.size)}"`;
            if (m.cx !== undefined) data += ` data-cx="${esc(m.cx)}"`;
            if (m.cy !== undefined) data += ` data-cy="${esc(m.cy)}"`;
            if (m.cx !== undefined && m.cy !== undefined) data += ` data-fixed="true"`;

            const handles = ['tl', 'tr', 'bl', 'br'].map((p) => `<div class="handle ${p}" data-handle="${p}"></div>`).join('');

            return `<div class="${cls.join(' ')}"${data}${style}>${el}<div class="node-loader" aria-hidden="true"></div>${handles}</div>`;
        })
        .join('');
}

let changed = 0;
for (const slug of slugs) {
    const pagePath = join(projectsDir, slug, 'index.html');
    if (!existsSync(pagePath)) {
        console.warn(`skip ${slug}: no index.html`);
        continue;
    }

    const project = JSON.parse(readFileSync(join(projectsDir, slug, 'project.json'), 'utf8'));
    const inner = `${START}${renderSidebar(project)}${END}`;
    const canvasInner = `${CANVAS_START}${renderCanvas(project, slug)}${CANVAS_END}`;

    const html = readFileSync(pagePath, 'utf8');
    const aside = /(<aside[^>]*id="sidebar-left"[^>]*>)([\s\S]*?)(<\/aside>)/;
    if (!aside.test(html)) {
        console.warn(`skip ${slug}: no #sidebar-left`);
        continue;
    }

    // Nodes contain nested </div>, so replace between the markers once they exist.
    const canvasMarkers = new RegExp(`${CANVAS_START}[\\s\\S]*?${CANVAS_END}`);
    const canvasEmpty = /(<div[^>]*id="canvas"[^>]*>)(\s*)(<\/div>)/;

    let next = html
        .replace(aside, (_, open, __, close) => `${open}${inner}${close}`)
        .replace(/(src=")(\/projects\/template\.js)(\?v=[0-9a-f]+)?(")/g, `$1$2?v=${templateHash}$4`);

    if (canvasMarkers.test(next)) next = next.replace(canvasMarkers, canvasInner);
    else if (canvasEmpty.test(next)) next = next.replace(canvasEmpty, (_, open, __, close) => `${open}${canvasInner}${close}`);
    else console.warn(`  ${slug}: #canvas not empty and no markers — canvas left alone`);
    if (next !== html) {
        writeFileSync(pagePath, next);
        changed++;
        console.log(`wrote ${slug}`);
    } else {
        console.log(`ok    ${slug}`);
    }
}

console.log(`\n${slugs.length} project pages, ${changed} updated.`);

/* ------------------------------------------------------------------ *
 * /projects grid
 *
 * The tiles used to be built at runtime, so the served HTML held no link
 * to a single project page: Google only ever heard about them from the
 * sitemap. They are written into the page from projects/catalog.json.
 * ------------------------------------------------------------------ */

const GRID_START = '<!-- prerender:grid:start -->';
const GRID_END = '<!-- prerender:grid:end -->';

// Rows alternate 2 and 3 tiles (span 6 / span 4 on the 12-col grid);
// a lone tile at the end is absorbed into the row before it.
function spansFor(count) {
    const rows = [];
    for (let n = count, r = 0; n > 0; r++) {
        const take = Math.min(r % 2 ? 3 : 2, n);
        rows.push(take);
        n -= take;
    }
    if (rows.length > 1 && rows[rows.length - 1] === 1) {
        if (rows[rows.length - 2] === 2) { rows.pop(); rows[rows.length - 1] = 3; }
        else { rows[rows.length - 2] = 2; rows[rows.length - 1] = 2; }
    }
    const spans = [];
    let row = 0, left = rows[0];
    for (let i = 0; i < count; i++) {
        spans.push(12 / rows[row]);
        if (--left === 0) { row++; left = rows[row]; }
    }
    return spans;
}

function renderPiece(item, span) {
    const classes = ['piece', `span-${span}`];
    if (item.vertical) classes.push('vertical');
    if (item.tight) classes.push('tight');

    const media = item.type === 'video'
        ? `<video loop muted playsinline preload="none" data-src="${esc(item.src)}" data-mime="${esc(item.mime || 'video/mp4')}"></video>`
        : `<img loading="lazy" decoding="async" src="${esc(item.src)}" alt="${esc(item.project)}">`;

    const title = item.project.split(' ').map(esc).join('<br>');
    const tag = item.tag ? `<div class="piece-tag">${esc(item.tag)}</div>` : '';

    return `<a class="${classes.join(' ')}" href="${esc(item.href)}">`
        + `<div class="piece-loader" aria-hidden="true"></div>`
        + `<div class="piece-media">${media}</div>`
        + `<div class="piece-overlay"><div class="piece-stack"><div class="piece-title">${title}</div>${tag}</div></div>`
        + `</a>`;
}

const catalog = JSON.parse(readFileSync(join(projectsDir, 'catalog.json'), 'utf8'));
const pieces = catalog.pieces.filter((p) => !p.hidden);
const spans = spansFor(pieces.length);
const gridInner = GRID_START + pieces.map((p, i) => renderPiece(p, spans[i])).join('') + GRID_END;

const indexPath = join(projectsDir, 'index.html');
const indexHtml = readFileSync(indexPath, 'utf8');

// The tiles contain nested </div>, so on a re-run replace between the markers;
// only the very first run matches the still-empty container.
const markers = new RegExp(`${GRID_START}[\\s\\S]*?${GRID_END}`);
const empty = /(<div[^>]*id="grid"[^>]*>)(\s*)(<\/div>)/;

let nextIndex = null;
if (markers.test(indexHtml)) nextIndex = indexHtml.replace(markers, gridInner);
else if (empty.test(indexHtml)) nextIndex = indexHtml.replace(empty, (_, open, __, close) => `${open}${gridInner}${close}`);

if (nextIndex === null) {
    console.warn('skip /projects: no #grid markers and #grid is not empty');
} else {
    if (nextIndex !== indexHtml) {
        writeFileSync(indexPath, nextIndex);
        console.log(`wrote /projects grid (${pieces.length} tiles)`);
    } else {
        console.log(`ok    /projects grid (${pieces.length} tiles)`);
    }
}
