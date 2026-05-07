(function() {
    function esc(s) { return String(s == null ? '' : s); }

    function renderLeftSidebar(project) {
        var rail = document.getElementById('sidebar-left');
        if (!rail) return;
        (project.columns || []).forEach(function(col, idx) {
            var section = document.createElement('div');
            section.className = 'sidebar-section';

            if (col.title) {
                if (idx === 0) {
                    var label = document.createElement('div');
                    label.className = 'sidebar-label';
                    label.textContent = (project.hudIndex || '') + ' · Project';
                    section.appendChild(label);
                }
                var t = document.createElement('div');
                t.className = 'sidebar-title';
                t.textContent = col.title;
                section.appendChild(t);
            }
            if (col.tags) {
                var tg = document.createElement('div');
                tg.className = 'sidebar-tags';
                tg.textContent = col.tags;
                section.appendChild(tg);
            }
            if (col.text) {
                var tx = document.createElement('div');
                tx.className = 'sidebar-text';
                tx.textContent = col.text;
                section.appendChild(tx);
            }
            if (col.meta && col.meta.length) {
                col.meta.forEach(function(row) {
                    var r = document.createElement('div');
                    r.className = 'meta-row';
                    var l = document.createElement('span');
                    l.textContent = row.label;
                    var v = document.createElement('span');
                    if (row.href) {
                        var a = document.createElement('a');
                        a.href = row.href;
                        a.textContent = row.value;
                        a.target = '_blank';
                        a.rel = 'noopener';
                        v.appendChild(a);
                    } else {
                        v.textContent = row.value;
                    }
                    r.appendChild(l);
                    r.appendChild(v);
                    section.appendChild(r);
                });
            }

            rail.appendChild(section);
        });

        // Floating tool dock — appended to the workspace (bottom-right).
        var workspace = document.getElementById('workspace');
        if (workspace && !workspace.querySelector('.workspace-tools')) {
            var tools = document.createElement('div');
            tools.className = 'workspace-tools';

            function makeBtn(label, kbd, onClick) {
                var b = document.createElement('button');
                b.className = 'tool-btn';
                var lbl = document.createElement('span');
                lbl.textContent = label;
                b.appendChild(lbl);
                if (kbd) {
                    var k = document.createElement('span');
                    k.className = 'kbd';
                    k.textContent = kbd;
                    b.appendChild(k);
                }
                b.addEventListener('click', onClick);
                return b;
            }

            tools.appendChild(makeBtn('Rearrange', 'R', function() {
                if (window._canvas && window._canvas.rearrange) window._canvas.rearrange();
            }));
            tools.appendChild(makeBtn('Fit', '⇧1', function() {
                if (window._canvas && window._canvas.fitAll) window._canvas.fitAll();
            }));
            tools.appendChild(makeBtn('Reset', '⌘0', function() {
                if (window._canvas && window._canvas.resetZoom) window._canvas.resetZoom();
            }));

            workspace.appendChild(tools);
        }
    }

    function fmtPx(n) { return Math.round(n) + ' px'; }

    function basename(s) {
        if (!s) return '';
        var i = s.lastIndexOf('/');
        return i >= 0 ? s.substring(i + 1) : s;
    }

    var _inspectorState = { node: null, refs: null };

    function _readNodeSpecs(node) {
        return {
            w: parseFloat(node.dataset.w),
            h: parseFloat(node.dataset.h),
            cx: parseFloat(node.dataset.cx),
            cy: parseFloat(node.dataset.cy)
        };
    }

    function _writeInspectorValues(refs, specs) {
        if (refs.w) refs.w.textContent = fmtPx(specs.w);
        if (refs.h) refs.h.textContent = fmtPx(specs.h);
        if (refs.x) refs.x.textContent = fmtPx(specs.cx);
        if (refs.y) refs.y.textContent = fmtPx(specs.cy);
        if (refs.ratio && specs.w && specs.h) refs.ratio.textContent = (specs.w / specs.h).toFixed(3);
    }

    window.updateInspector = function(node) {
        var pane = document.getElementById('inspector');
        var content = document.getElementById('content');
        if (!pane) return;

        // Same node: just update value cells, no rebuild
        if (node && _inspectorState.node === node && _inspectorState.refs) {
            _writeInspectorValues(_inspectorState.refs, _readNodeSpecs(node));
            return;
        }

        // Clear and rebuild
        while (pane.firstChild) pane.removeChild(pane.firstChild);
        _inspectorState = { node: null, refs: null };

        if (!node) {
            var empty = document.createElement('div');
            empty.className = 'inspector-empty';
            empty.textContent = 'Select an item';
            pane.appendChild(empty);
            content.classList.remove('inspector-open');
            return;
        }
        content.classList.add('inspector-open');

        var media = node.querySelector('video, img, iframe');
        var type = media ? media.tagName.toLowerCase() : '';
        var src = '';
        if (media) {
            if (media.tagName === 'VIDEO') {
                var s = media.querySelector('source');
                src = s ? s.src : (media.currentSrc || media.src);
            } else {
                src = media.src;
            }
        }

        var w = parseFloat(node.dataset.w);
        var h = parseFloat(node.dataset.h);
        var cx = parseFloat(node.dataset.cx);
        var cy = parseFloat(node.dataset.cy);

        var refs = { w: null, h: null, x: null, y: null, ratio: null };

        function row(label, value, refKey) {
            var r = document.createElement('div');
            r.className = 'spec-row';
            var l = document.createElement('span');
            l.textContent = label;
            var v = document.createElement('span');
            v.textContent = value;
            r.appendChild(l);
            r.appendChild(v);
            if (refKey) refs[refKey] = v;
            return r;
        }

        function pairRow(labelA, a, refA, labelB, b, refB) {
            var pair = document.createElement('div');
            pair.className = 'spec-pair';
            [[labelA, a, refA], [labelB, b, refB]].forEach(function(p) {
                var c = document.createElement('div');
                c.className = 'spec-pair-cell';
                var l = document.createElement('span');
                l.textContent = p[0];
                var v = document.createElement('span');
                v.textContent = p[1];
                c.appendChild(l);
                c.appendChild(v);
                if (p[2]) refs[p[2]] = v;
                pair.appendChild(c);
            });
            return pair;
        }

        // Header
        var header = document.createElement('div');
        header.className = 'sidebar-section';
        var hLabel = document.createElement('div');
        hLabel.className = 'sidebar-label';
        hLabel.textContent = 'Inspector';
        header.appendChild(hLabel);
        var hTitle = document.createElement('div');
        hTitle.className = 'sidebar-title';
        hTitle.textContent = src ? basename(src) : (type || 'item');
        hTitle.style.textTransform = 'none';
        hTitle.style.wordBreak = 'break-all';
        header.appendChild(hTitle);
        var hSub = document.createElement('div');
        hSub.className = 'sidebar-tags';
        hSub.textContent = type || '';
        header.appendChild(hSub);
        pane.appendChild(header);

        // Layout specs
        var layout = document.createElement('div');
        layout.className = 'sidebar-section';
        var lLabel = document.createElement('div');
        lLabel.className = 'sidebar-label';
        lLabel.textContent = 'Layout';
        layout.appendChild(lLabel);
        layout.appendChild(pairRow('W', fmtPx(w), 'w', 'H', fmtPx(h), 'h'));
        var spacer = document.createElement('div');
        spacer.style.height = '6px';
        layout.appendChild(spacer);
        layout.appendChild(pairRow('X', fmtPx(cx), 'x', 'Y', fmtPx(cy), 'y'));
        if (w && h) {
            var ratio = (w / h).toFixed(3);
            layout.appendChild(row('Ratio', ratio, 'ratio'));
        }
        pane.appendChild(layout);

        // Preview thumbnail
        if (type === 'image') {
            var prev = document.createElement('div');
            prev.className = 'sidebar-section';
            var pLabel = document.createElement('div');
            pLabel.className = 'sidebar-label';
            pLabel.textContent = 'Preview';
            prev.appendChild(pLabel);
            var thumb = document.createElement('div');
            thumb.className = 'preview-thumb';
            var thumbImg = document.createElement('img');
            thumbImg.src = src;
            thumb.appendChild(thumbImg);
            prev.appendChild(thumb);
            pane.appendChild(prev);
        }

        // Caption (if the media has descriptive text)
        if (node._caption) {
            var capSec = document.createElement('div');
            capSec.className = 'sidebar-section';
            var capLabel = document.createElement('div');
            capLabel.className = 'sidebar-label';
            capLabel.textContent = 'Description';
            capSec.appendChild(capLabel);
            var capText = document.createElement('div');
            capText.className = 'sidebar-text';
            capText.textContent = node._caption;
            capSec.appendChild(capText);
            pane.appendChild(capSec);
        }

        // Code block (if the media has an attached snippet)
        if (node._code) {
            var codeSec = document.createElement('div');
            codeSec.className = 'sidebar-section';
            var cLabel = document.createElement('div');
            cLabel.className = 'sidebar-label';
            cLabel.textContent = node._codeTitle || 'Code';
            codeSec.appendChild(cLabel);
            var pre = document.createElement('pre');
            pre.className = 'code-block';
            pre.appendChild(highlightJSToFragment(node._code));
            codeSec.appendChild(pre);
            pane.appendChild(codeSec);
        }

        _inspectorState = { node: node, refs: refs };
    };

    function createNode(media) {
        var n = document.createElement('div');
        n.className = 'node';
        var el;
        if (media.type === 'video') {
            el = document.createElement('video');
            el.autoplay = true;
            el.muted = true;
            el.loop = true;
            el.playsInline = true;
            el.setAttribute('playsinline', '');
            var src = document.createElement('source');
            src.src = media.src;
            src.type = media.mime || (media.src.endsWith('.webm') ? 'video/webm' : 'video/mp4');
            el.appendChild(src);
        } else if (media.type === 'iframe') {
            el = document.createElement('iframe');
            el.src = media.src;
            el.loading = 'eager';
            el.setAttribute('allow', 'autoplay');
            el.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
            if (media.title) el.title = media.title;
        } else {
            el = document.createElement('img');
            el.src = media.src;
            if (media.alt) el.alt = media.alt;
        }
        n.appendChild(el);
        // Corner handles for resize (shown only when selected)
        ['tl', 'tr', 'bl', 'br'].forEach(function(pos) {
            var h = document.createElement('div');
            h.className = 'handle ' + pos;
            h.dataset.handle = pos;
            n.appendChild(h);
        });
        if (media.w) n.dataset.w = media.w;
        if (media.h) n.dataset.h = media.h;
        if (media.size) n.dataset.size = media.size;
        if (media.invertOnDark) n.classList.add('invert-on-dark');
        if (media.format === 'mobile' || media.mobileFrame) n.classList.add('mobile-frame');
        if (media.cx !== undefined) n.dataset.cx = media.cx;
        if (media.cy !== undefined) n.dataset.cy = media.cy;
        if (media.cx !== undefined && media.cy !== undefined) n.dataset.fixed = 'true';
        if (media.code) {
            n._code = media.code;
            n._codeLang = media.codeLang || 'js';
            n._codeTitle = media.codeTitle || '';
        }
        if (media.caption) {
            n._caption = media.caption;
        }
        // Spin: 'slow' | 'medium' | 'fast' (or any duration string e.g. '5s')
        if (media.spin) {
            var dur = media.spin === 'fast' ? '3s'
                    : media.spin === 'slow' ? '20s'
                    : media.spin === 'medium' ? '8s'
                    : media.spin;
            n.classList.add('spin');
            n.style.setProperty('--spin-duration', dur);
        }
        return n;
    }

    // Lightweight JS syntax highlighter — returns a DocumentFragment.
    function highlightJSToFragment(src) {
        var KEYWORDS = /^(function|return|let|const|var|for|of|in|if|else|new|true|false|null|undefined|class|extends|this|async|await|try|catch|finally|throw|while|do|switch|case|break|continue|import|export|from|as|default|typeof|instanceof|delete|void)$/;
        var re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|(\d+(?:\.\d+)?)|([A-Za-z_$][A-Za-z0-9_$]*)|([\s\S])/g;
        var frag = document.createDocumentFragment();
        var m;
        function append(cls, text) {
            if (!cls) { frag.appendChild(document.createTextNode(text)); return; }
            var s = document.createElement('span');
            s.className = 'tok-' + cls;
            s.textContent = text;
            frag.appendChild(s);
        }
        while ((m = re.exec(src)) !== null) {
            if (m[1] !== undefined) append('com', m[1]);
            else if (m[2] !== undefined) append('str', m[2]);
            else if (m[3] !== undefined) append('num', m[3]);
            else if (m[4] !== undefined) {
                if (KEYWORDS.test(m[4])) append('kw', m[4]);
                else {
                    var nextIdx = re.lastIndex;
                    var trailing = src.slice(nextIdx).match(/^\s*\(/);
                    append(trailing ? 'fn' : '', m[4]);
                }
            }
            else append('', m[5]);
        }
        return frag;
    }

    function renderCanvas(project) {
        var canvas = document.getElementById('canvas');
        (project.media || []).forEach(function(m) {
            canvas.appendChild(createNode(m));
        });
    }

    function initWorkspace() {
        var workspace = document.getElementById('workspace');
        var canvas = document.getElementById('canvas');
        var gridBg = document.getElementById('grid-bg');
        var content = document.getElementById('content');

        var tx = 0, ty = 0, scale = 1;
        var minScale = 0.25, maxScale = 2.5;

        var nodes = Array.prototype.slice.call(document.querySelectorAll('.node'));
        var gap = 240;

        var MAX_H = 760;
        var MAX_W = 960;

        function sizeNode(n) {
            var video = n.querySelector('video');
            var img = n.querySelector('img');
            var w, h;
            if (video && video.videoWidth) {
                w = video.videoWidth;
                h = video.videoHeight;
            } else if (img && img.naturalWidth) {
                w = img.naturalWidth;
                h = img.naturalHeight;
            } else {
                w = parseFloat(n.dataset.w) || 600;
                h = parseFloat(n.dataset.h) || 600;
            }
            // Cap to max size, preserving aspect
            var ratio = Math.min(MAX_W / w, MAX_H / h, 1);
            w = w * ratio;
            h = h * ratio;
            // Optional per-media size multiplier (e.g. size: 0.5 = half)
            var sizeMult = parseFloat(n.dataset.size);
            if (!isNaN(sizeMult) && sizeMult > 0) {
                w = w * sizeMult;
                h = h * sizeMult;
            }
            n.style.width = w + 'px';
            n.style.height = h + 'px';
            n.dataset.w = w;
            n.dataset.h = h;
        }

        // Jittered grid blob layout — evenly spaced
        function layoutNodes() {
            if (!nodes.length) return;
            var maxW = 0, maxH = 0;
            nodes.forEach(function(n) {
                maxW = Math.max(maxW, parseFloat(n.dataset.w));
                maxH = Math.max(maxH, parseFloat(n.dataset.h));
            });
            var cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
            var rows = Math.ceil(nodes.length / cols);
            var cellW = maxW + 220;
            var cellH = maxH + 220;

            // Deterministic pseudo-random jitter so layout is stable across renders
            function rand(i) {
                var x = Math.sin(i * 12.9898) * 43758.5453;
                return (x - Math.floor(x)) * 2 - 1; // [-1, 1]
            }

            nodes.forEach(function(n, i) {
                if (n.dataset.fixed === 'true') return; // explicit position from JSON
                var col = i % cols;
                var row = Math.floor(i / cols);
                var cx = (col - (cols - 1) / 2) * cellW + rand(i * 2) * 40;
                var cy = (row - (rows - 1) / 2) * cellH;
                n.dataset.cx = cx;
                n.dataset.cy = cy;
            });

            relaxLayout(20);
            placeAll();

            // Snapshot the rest state so "Rearrange" can restore it
            nodes.forEach(function(n) {
                n.dataset.initCx = n.dataset.cx;
                n.dataset.initCy = n.dataset.cy;
                n.dataset.initW = n.dataset.w;
                n.dataset.initH = n.dataset.h;
            });
        }

        function rearrange() {
            cancelAnim();
            // Animate every node back to its snapshot
            var startStates = nodes.map(function(n) {
                return {
                    n: n,
                    cx0: parseFloat(n.dataset.cx), cy0: parseFloat(n.dataset.cy),
                    w0: parseFloat(n.dataset.w), h0: parseFloat(n.dataset.h),
                    cx1: parseFloat(n.dataset.initCx), cy1: parseFloat(n.dataset.initCy),
                    w1: parseFloat(n.dataset.initW), h1: parseFloat(n.dataset.initH)
                };
            });
            var duration = 700;
            var t0 = performance.now();
            function ease(t) { return 1 - Math.pow(1 - t, 3); }
            function step(now) {
                var t = Math.min(1, (now - t0) / duration);
                var e = ease(t);
                startStates.forEach(function(s) {
                    var cx = s.cx0 + (s.cx1 - s.cx0) * e;
                    var cy = s.cy0 + (s.cy1 - s.cy0) * e;
                    var w = s.w0 + (s.w1 - s.w0) * e;
                    var h = s.h0 + (s.h1 - s.h0) * e;
                    s.n.dataset.cx = cx;
                    s.n.dataset.cy = cy;
                    s.n.dataset.w = w;
                    s.n.dataset.h = h;
                    s.n.style.width = w + 'px';
                    s.n.style.height = h + 'px';
                });
                placeAll();
                if (window.updateInspector) {
                    var sel = document.querySelector('.node.selected');
                    if (sel) window.updateInspector(sel);
                }
                if (t < 1) animHandle = requestAnimationFrame(step);
                else animHandle = null;
            }
            animHandle = requestAnimationFrame(step);
        }

        // Expose for sidebar tool buttons
        window._canvas = window._canvas || {};
        window._canvas.rearrange = rearrange;
        window._canvas.fitAll = function() { centerView(); };
        window._canvas.resetZoom = function() {
            cancelAnim();
            var box = bbox();
            var vw = workspace.offsetWidth;
            var vh = workspace.offsetHeight;
            scale = 1;
            tx = vw / 2 - box.cx;
            ty = vh / 2 - box.cy;
            applyTransform();
        };

        function relaxLayout(iterations) {
            var pad = 120;
            for (var iter = 0; iter < iterations; iter++) {
                var moved = false;
                for (var i = 0; i < nodes.length; i++) {
                    for (var j = i + 1; j < nodes.length; j++) {
                        var a = nodes[i], b = nodes[j];
                        var ax = parseFloat(a.dataset.cx), ay = parseFloat(a.dataset.cy);
                        var bx = parseFloat(b.dataset.cx), by = parseFloat(b.dataset.cy);
                        var aw = parseFloat(a.dataset.w), ah = parseFloat(a.dataset.h);
                        var bw = parseFloat(b.dataset.w), bh = parseFloat(b.dataset.h);

                        var dx = bx - ax, dy = by - ay;
                        var minX = (aw + bw) / 2 + pad;
                        var minY = (ah + bh) / 2 + pad;
                        var ox = minX - Math.abs(dx);
                        var oy = minY - Math.abs(dy);
                        if (ox > 0 && oy > 0) {
                            if (ox < oy) {
                                var sx = dx >= 0 ? 1 : -1;
                                ax -= sx * ox * 0.5;
                                bx += sx * ox * 0.5;
                            } else {
                                var sy = dy >= 0 ? 1 : -1;
                                ay -= sy * oy * 0.5;
                                by += sy * oy * 0.5;
                            }
                            a.dataset.cx = ax; a.dataset.cy = ay;
                            b.dataset.cx = bx; b.dataset.cy = by;
                            moved = true;
                        }
                    }
                }
                if (!moved) break;
            }
        }

        function overlapsAny(cx, cy, w, h, placed) {
            var pad = 140;
            for (var i = 0; i < placed.length; i++) {
                var p = placed[i];
                var dx = Math.abs(cx - p.cx);
                var dy = Math.abs(cy - p.cy);
                var minX = (w + p.w) / 2 + pad;
                var minY = (h + p.h) / 2 + pad;
                if (dx < minX && dy < minY) return true;
            }
            return false;
        }

        // Push nodes out of the way of the active node (with soft halo field)
        function resolveCollisions(active, iterations) {
            iterations = iterations || 3;
            var HARD_PAD = 140;  // solid collision buffer
            var HALO = 260;       // extra soft zone for gentle pull
            for (var iter = 0; iter < iterations; iter++) {
                var moved = false;
                nodes.forEach(function(n) {
                    if (n === active) return;
                    var ax = parseFloat(active.dataset.cx);
                    var ay = parseFloat(active.dataset.cy);
                    var aw = parseFloat(active.dataset.w);
                    var ah = parseFloat(active.dataset.h);
                    var bx = parseFloat(n.dataset.cx);
                    var by = parseFloat(n.dataset.cy);
                    var bw = parseFloat(n.dataset.w);
                    var bh = parseFloat(n.dataset.h);

                    var dx = bx - ax;
                    var dy = by - ay;
                    var minX = (aw + bw) / 2 + HARD_PAD;
                    var minY = (ah + bh) / 2 + HARD_PAD;
                    var overlapX = minX - Math.abs(dx);
                    var overlapY = minY - Math.abs(dy);

                    if (overlapX > 0 && overlapY > 0) {
                        if (overlapX < overlapY) {
                            var sx = dx >= 0 ? 1 : -1;
                            bx += sx * overlapX * 0.5;
                        } else {
                            var sy = dy >= 0 ? 1 : -1;
                            by += sy * overlapY * 0.5;
                        }
                        n.dataset.cx = bx;
                        n.dataset.cy = by;
                        moved = true;
                    } else if (iter === 0) {
                        var softX = (aw + bw) / 2 + HALO;
                        var softY = (ah + bh) / 2 + HALO;
                        var soX = softX - Math.abs(dx);
                        var soY = softY - Math.abs(dy);
                        if (soX > 0 && soY > 0) {
                            var len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                            var nx = dx / len;
                            var ny = dy / len;
                            var strength = Math.min(soX, soY) * 0.08;
                            bx += nx * strength;
                            by += ny * strength;
                            n.dataset.cx = bx;
                            n.dataset.cy = by;
                        }
                    }
                });
                if (!moved) break;
            }
        }

        function refresh(n) {
            sizeNode(n);
            layoutNodes();
            applyTransform();
        }

        nodes.forEach(function(n) {
            sizeNode(n);
            var video = n.querySelector('video');
            var img = n.querySelector('img');
            if (video) {
                if (video.readyState >= 1 && video.videoWidth) {
                    refresh(n);
                } else {
                    video.addEventListener('loadedmetadata', function() { refresh(n); });
                }
            }
            if (img) {
                if (img.complete && img.naturalWidth) {
                    refresh(n);
                } else {
                    img.addEventListener('load', function() { refresh(n); });
                }
            }
        });
        layoutNodes();

        function placeAll() {
            // Position nodes in canvas-space; the canvas transform applies the
            // zoom uniformly to positions + sizes so layout never shifts.
            nodes.forEach(function(n) {
                var cx = parseFloat(n.dataset.cx) || 0;
                var cy = parseFloat(n.dataset.cy) || 0;
                var w = parseFloat(n.dataset.w);
                var h = parseFloat(n.dataset.h);
                n.style.left = (cx - w / 2) + 'px';
                n.style.top = (cy - h / 2) + 'px';
            });
        }

        function clampPan() {
            // Keep at least PAD pixels of the blob in view on each side so
            // the user can't pan into infinity.
            var vw = workspace.offsetWidth;
            var vh = workspace.offsetHeight;
            if (!nodes.length || !vw || !vh) return;
            var box = bbox();
            var bw = box.w * scale;
            var bh = box.h * scale;
            var padX = Math.min(vw * 0.5, 200);
            var padY = Math.min(vh * 0.5, 200);
            // Screen-space extents of the blob: [tx + minX*scale, tx + maxX*scale]
            var minXs = box.cx * scale - bw / 2;
            var maxXs = box.cx * scale + bw / 2;
            var minYs = box.cy * scale - bh / 2;
            var maxYs = box.cy * scale + bh / 2;
            // Allowed tx range so blob keeps at least padX visible on each side.
            var txMin = padX - maxXs;
            var txMax = vw - padX - minXs;
            var tyMin = padY - maxYs;
            var tyMax = vh - padY - minYs;
            if (txMin > txMax) { var c = (txMin + txMax) / 2; txMin = txMax = c; }
            if (tyMin > tyMax) { var c2 = (tyMin + tyMax) / 2; tyMin = tyMax = c2; }
            tx = Math.min(txMax, Math.max(txMin, tx));
            ty = Math.min(tyMax, Math.max(tyMin, ty));
        }

        function updateZoomHud() {
            var hud = document.getElementById('zoom-hud');
            if (!hud) {
                hud = document.createElement('div');
                hud.id = 'zoom-hud';
                hud.className = 'zoom-hud';
                workspace.appendChild(hud);
            }
            hud.textContent = Math.round(scale * 100) + '%';
        }

        function applyTransform() {
            clampPan();
            canvas.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + scale + ')';
            var gridSize = 40 * scale;
            gridBg.style.backgroundSize = gridSize + 'px ' + gridSize + 'px';
            gridBg.style.backgroundPosition = tx + 'px ' + ty + 'px';
            updateMagnification();
            updateZoomHud();
        }

        function updateMagnification() {
            var vw = workspace.offsetWidth;
            var vh = workspace.offsetHeight;
            var vcx = vw / 2;
            var vcy = vh / 2;
            var radius = Math.min(vw, vh) * 0.5;
            var MAG_PEAK = 1.5;
            var MAG_MIN = 0.75;

            nodes.forEach(function(n) {
                if (n.classList.contains('resizing') || n.classList.contains('selected')) {
                    n.style.transform = 'scale(1)';
                    return;
                }
                var cx = parseFloat(n.dataset.cx) || 0;
                var cy = parseFloat(n.dataset.cy) || 0;
                var sx = tx + cx * scale;
                var sy = ty + cy * scale;
                var dx = sx - vcx;
                var dy = sy - vcy;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var t = Math.min(1, dist / radius);
                t = t * t * (3 - 2 * t);
                var mag = MAG_PEAK - (MAG_PEAK - MAG_MIN) * t;
                n.style.transform = 'scale(' + mag + ')';
            });
        }

        function bbox() {
            var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            nodes.forEach(function(n) {
                var cx = parseFloat(n.dataset.cx) || 0;
                var cy = parseFloat(n.dataset.cy) || 0;
                var w = parseFloat(n.dataset.w);
                var h = parseFloat(n.dataset.h);
                minX = Math.min(minX, cx - w / 2);
                minY = Math.min(minY, cy - h / 2);
                maxX = Math.max(maxX, cx + w / 2);
                maxY = Math.max(maxY, cy + h / 2);
            });
            return { w: maxX - minX, h: maxY - minY, cx: (maxX + minX) / 2, cy: (maxY + minY) / 2 };
        }

        function centerView(instant) {
            var vw = workspace.offsetWidth;
            var vh = workspace.offsetHeight;
            var box = bbox();
            // Pick a "spread scale" so the blob fits the viewport with some margin.
            // Since nodes keep their native size, scale only affects spacing.
            // Don't force-fit; just center. User can zoom/pan.
            var finalScale = 0.7;
            var startScale = 0.55;

            function place(s) {
                scale = s;
                tx = vw / 2 - box.cx * s;
                ty = vh / 2 - box.cy * s;
                applyTransform();
            }

            if (instant) {
                place(finalScale);
                return;
            }

            place(startScale);
            var duration = 900;
            var startTime = performance.now();
            function ease(t) { return 1 - Math.pow(1 - t, 3); }
            function step(now) {
                var t = Math.min(1, (now - startTime) / duration);
                place(startScale + (finalScale - startScale) * ease(t));
                if (t < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }

        // Pan / drag node / click to center
        var isDragging = false;
        var draggingNode = null;
        var startX = 0, startY = 0;
        var startTx = 0, startTy = 0;
        var nodeStartCx = 0, nodeStartCy = 0;
        var pressTarget = null;
        var animHandle = null;

        function cancelAnim() {
            if (animHandle) {
                cancelAnimationFrame(animHandle);
                animHandle = null;
            }
        }

        function centerOnNode(n) {
            cancelAnim();
            var vw = workspace.offsetWidth;
            var vh = workspace.offsetHeight;
            var cx = parseFloat(n.dataset.cx) || 0;
            var cy = parseFloat(n.dataset.cy) || 0;
            var nw = parseFloat(n.dataset.w);
            var nh = parseFloat(n.dataset.h);

            // Zoom so the node fills ~50% of the smaller viewport dimension
            var fillRatio = 0.50;
            var targetScale = Math.min(vw * fillRatio / nw, vh * fillRatio / nh);
            targetScale = Math.max(minScale, Math.min(maxScale, targetScale));

            var targetTx = vw / 2 - cx * targetScale;
            var targetTy = vh / 2 - cy * targetScale;

            var startTxA = tx;
            var startTyA = ty;
            var startScale = scale;
            var dtx = targetTx - startTxA;
            var dty = targetTy - startTyA;
            var dscale = targetScale - startScale;

            var duration = 700;
            var startTime = performance.now();
            function ease(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }

            function step(now) {
                var t = Math.min(1, (now - startTime) / duration);
                var e = ease(t);
                tx = startTxA + dtx * e;
                ty = startTyA + dty * e;
                scale = startScale + dscale * e;
                applyTransform();
                if (t < 1) animHandle = requestAnimationFrame(step);
                else animHandle = null;
            }
            animHandle = requestAnimationFrame(step);
        }

        var resizingNode = null;
        var resizeHandle = '';
        var resizeStart = null;

        workspace.addEventListener('mousedown', function(e) {
            if (e.button !== 0) return;
            cancelAnim();
            var handleEl = e.target.classList && e.target.classList.contains('handle') ? e.target : null;
            var nodeEl = e.target.closest('.node');
            startX = e.clientX;
            startY = e.clientY;

            if (handleEl && nodeEl) {
                // Begin resize
                resizingNode = nodeEl;
                resizeHandle = handleEl.dataset.handle;
                resizeStart = {
                    cx: parseFloat(nodeEl.dataset.cx),
                    cy: parseFloat(nodeEl.dataset.cy),
                    w: parseFloat(nodeEl.dataset.w),
                    h: parseFloat(nodeEl.dataset.h),
                    aspect: parseFloat(nodeEl.dataset.w) / parseFloat(nodeEl.dataset.h)
                };
                nodeEl.classList.add('resizing');
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            pressTarget = nodeEl;
            if (nodeEl) {
                draggingNode = nodeEl;
                nodeStartCx = parseFloat(nodeEl.dataset.cx) || 0;
                nodeStartCy = parseFloat(nodeEl.dataset.cy) || 0;
                nodeEl.classList.add('dragging');
            } else {
                isDragging = true;
                startTx = tx;
                startTy = ty;
                workspace.classList.add('grabbing');
                // Deselect when clicking empty space
                document.querySelectorAll('.node.selected').forEach(function(n) { n.classList.remove('selected'); });
                if (window.updateInspector) window.updateInspector(null);
            }
            e.preventDefault();
        });

        window.addEventListener('mousemove', function(e) {
            if (resizingNode) {
                var dx = (e.clientX - startX) / scale;
                var dy = (e.clientY - startY) / scale;
                // Direction multipliers per handle
                var sx = (resizeHandle === 'tr' || resizeHandle === 'br') ? 1 : -1;
                var sy = (resizeHandle === 'bl' || resizeHandle === 'br') ? 1 : -1;
                // New width candidate; use max of x/y components to lock aspect
                var wCand = Math.max(40, resizeStart.w + sx * dx * 2);
                var hCand = Math.max(40, resizeStart.h + sy * dy * 2);
                // Lock to aspect ratio: pick the dimension that changed most
                var wFromH = hCand * resizeStart.aspect;
                var hFromW = wCand / resizeStart.aspect;
                var newW, newH;
                if (Math.abs(wCand - resizeStart.w) > Math.abs(hCand - resizeStart.h)) {
                    newW = wCand;
                    newH = hFromW;
                } else {
                    newH = hCand;
                    newW = wFromH;
                }
                resizingNode.dataset.w = newW;
                resizingNode.dataset.h = newH;
                resizingNode.style.width = newW + 'px';
                resizingNode.style.height = newH + 'px';
                placeAll();
                if (window.updateInspector) window.updateInspector(resizingNode);
                return;
            }
            if (draggingNode) {
                var dx = (e.clientX - startX) / scale;
                var dy = (e.clientY - startY) / scale;
                draggingNode.dataset.cx = nodeStartCx + dx;
                draggingNode.dataset.cy = nodeStartCy + dy;
                resolveCollisions(draggingNode, 4);
                placeAll();
                updateMagnification();
                if (window.updateInspector && draggingNode.classList.contains('selected')) {
                    window.updateInspector(draggingNode);
                }
            } else if (isDragging) {
                tx = startTx + (e.clientX - startX);
                ty = startTy + (e.clientY - startY);
                applyTransform();
            }
        });

        window.addEventListener('mouseup', function(e) {
            if (resizingNode) {
                resizingNode.classList.remove('resizing');
                resizingNode = null;
                return;
            }
            var wasNodeDrag = !!draggingNode;
            var movedNode = wasNodeDrag && (Math.abs(e.clientX - startX) > 4 || Math.abs(e.clientY - startY) > 4);
            if (draggingNode) {
                draggingNode.classList.remove('dragging');
                draggingNode = null;
            }
            isDragging = false;
            workspace.classList.remove('grabbing');
            // Treat as click if pressed a node and barely moved: select + center
            if (pressTarget && !movedNode) {
                document.querySelectorAll('.node.selected').forEach(function(n) {
                    if (n !== pressTarget) n.classList.remove('selected');
                });
                pressTarget.classList.add('selected');
                if (window.updateInspector) window.updateInspector(pressTarget);
                centerOnNode(pressTarget);
            }
            pressTarget = null;
        });

        // Zoom toward cursor (canonical math — images keep native size,
        // scale only affects spacing between them).
        function zoomToward(cursorX, cursorY, factor) {
            var newScale = Math.max(minScale, Math.min(maxScale, scale * factor));
            if (newScale === scale) return;
            // Anchor: keep the canvas-space point under the cursor in the same
            // screen position. canvas-space pt = (screen - t) / scale.
            var canvasX = (cursorX - tx) / scale;
            var canvasY = (cursorY - ty) / scale;
            scale = newScale;
            tx = cursorX - canvasX * scale;
            ty = cursorY - canvasY * scale;
            applyTransform();
        }

        // Wheel: discriminate by ctrlKey (Chrome/Mac trackpad pinch fires
        // wheel + ctrlKey). Pinch zooms, plain scroll pans.
        workspace.addEventListener('wheel', function(e) {
            e.preventDefault();
            var rect = workspace.getBoundingClientRect();
            var cx = e.clientX - rect.left;
            var cy = e.clientY - rect.top;
            if (e.ctrlKey || e.metaKey) {
                // Exponential zoom — convention is Math.pow(2, deltaY * -0.01)
                zoomToward(cx, cy, Math.pow(2, e.deltaY * -0.01));
            } else {
                tx -= e.deltaX;
                ty -= e.deltaY;
                applyTransform();
            }
        }, { passive: false });

        // Touch
        var initialDist = 0;
        var initialScale = 1;

        workspace.addEventListener('touchstart', function(e) {
            if (e.touches.length === 1) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                var nodeEl = e.target.closest('.node');
                if (nodeEl) {
                    draggingNode = nodeEl;
                    nodeStartCx = parseFloat(nodeEl.dataset.cx) || 0;
                    nodeStartCy = parseFloat(nodeEl.dataset.cy) || 0;
                    nodeEl.classList.add('dragging');
                } else {
                    startTx = tx;
                    startTy = ty;
                    isDragging = true;
                }
            } else if (e.touches.length === 2) {
                isDragging = false;
                if (draggingNode) { draggingNode.classList.remove('dragging'); draggingNode = null; }
                var dx = e.touches[0].clientX - e.touches[1].clientX;
                var dy = e.touches[0].clientY - e.touches[1].clientY;
                initialDist = Math.sqrt(dx * dx + dy * dy);
                initialScale = scale;
            }
        }, { passive: true });

        workspace.addEventListener('touchmove', function(e) {
            if (e.touches.length === 1 && draggingNode) {
                var dx = (e.touches[0].clientX - startX) / scale;
                var dy = (e.touches[0].clientY - startY) / scale;
                draggingNode.dataset.cx = nodeStartCx + dx;
                draggingNode.dataset.cy = nodeStartCy + dy;
                resolveCollisions(draggingNode, 4);
                placeAll();
                updateMagnification();
            } else if (e.touches.length === 1 && isDragging) {
                tx = startTx + (e.touches[0].clientX - startX);
                ty = startTy + (e.touches[0].clientY - startY);
                applyTransform();
            } else if (e.touches.length === 2) {
                var dx2 = e.touches[0].clientX - e.touches[1].clientX;
                var dy2 = e.touches[0].clientY - e.touches[1].clientY;
                var dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                var newScale = Math.max(minScale, Math.min(maxScale, initialScale * (dist / initialDist)));
                var rect = workspace.getBoundingClientRect();
                var cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
                var cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
                var ratio = newScale / scale;
                tx = cx - (cx - tx) * ratio;
                ty = cy - (cy - ty) * ratio;
                scale = newScale;
                applyTransform();
                e.preventDefault();
            }
        }, { passive: false });

        workspace.addEventListener('touchend', function(e) {
            if (draggingNode) { draggingNode.classList.remove('dragging'); draggingNode = null; }
            if (e.touches.length === 0) isDragging = false;
        });

        centerView();
        window.addEventListener('resize', function() { centerView(true); });

        // Universal canvas hotkeys
        var spaceHeld = false;
        document.addEventListener('keydown', function(e) {
            // Spacebar = temporary pan mode
            if (e.code === 'Space' && !spaceHeld && !isInputFocused()) {
                spaceHeld = true;
                workspace.classList.add('space-mode');
                e.preventDefault();
                return;
            }
            // Shift+1: fit all
            if (e.shiftKey && e.code === 'Digit1') {
                e.preventDefault();
                centerView();
                return;
            }
            // Shift+2: fit selection (or fall back to fit all)
            if (e.shiftKey && e.code === 'Digit2') {
                e.preventDefault();
                var sel = document.querySelector('.node.selected');
                if (sel) {
                    centerOnNode(sel);
                } else {
                    centerView();
                }
                return;
            }
            // Cmd/Ctrl+0: reset zoom to 100%
            if ((e.metaKey || e.ctrlKey) && e.code === 'Digit0') {
                e.preventDefault();
                cancelAnim();
                var box = bbox();
                var vw = workspace.offsetWidth;
                var vh = workspace.offsetHeight;
                scale = 1;
                tx = vw / 2 - box.cx;
                ty = vh / 2 - box.cy;
                applyTransform();
                return;
            }
            // R: rearrange
            if (e.code === 'KeyR' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !isInputFocused()) {
                e.preventDefault();
                rearrange();
                return;
            }
        });

        document.addEventListener('keyup', function(e) {
            if (e.code === 'Space') {
                spaceHeld = false;
                workspace.classList.remove('space-mode');
            }
        });

        function isInputFocused() {
            var a = document.activeElement;
            return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
        }

        // Override mousedown so space+drag always pans regardless of target
        workspace.addEventListener('mousedown', function(e) {
            if (spaceHeld && e.button === 0) {
                e.stopImmediatePropagation();
                cancelAnim();
                isDragging = true;
                draggingNode = null;
                pressTarget = null;
                startX = e.clientX;
                startY = e.clientY;
                startTx = tx;
                startTy = ty;
                workspace.classList.add('grabbing');
                e.preventDefault();
            }
            // Middle mouse = pan
            if (e.button === 1) {
                e.preventDefault();
                cancelAnim();
                isDragging = true;
                draggingNode = null;
                pressTarget = null;
                startX = e.clientX;
                startY = e.clientY;
                startTx = tx;
                startTy = ty;
                workspace.classList.add('grabbing');
            }
        }, true); // capture-phase so it beats the node-drag handler

        content.offsetHeight;
        content.style.opacity = '1';

        document.querySelectorAll('nav a[href]').forEach(function(a) {
            a.addEventListener('click', function(e) {
                var href = a.getAttribute('href');
                if (href.startsWith('/') || href.startsWith('./')) {
                    e.preventDefault();
                    content.style.opacity = '0';
                    setTimeout(function() { window.location.href = href; }, 400);
                }
            });
        });

        document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    }

    function resolveMediaPaths(project, jsonPath) {
        // Derive base URL from the JSON path (strip filename) so relative
        // media srcs resolve correctly regardless of trailing slash.
        var base = jsonPath.replace(/[^/]*$/, '');
        if (!project.media) return;
        project.media.forEach(function(m) {
            if (!m || !m.src) return;
            // Only rewrite truly relative paths (no scheme, no leading slash)
            if (/^([a-z]+:|\/)/i.test(m.src)) return;
            m.src = base + m.src;
        });
    }

    window.loadProject = function(jsonPath) {
        fetch(jsonPath)
            .then(function(r) { return r.json(); })
            .then(function(project) {
                resolveMediaPaths(project, jsonPath);
                document.title = 'hubmerto.' + (project.slug || project.title || '').toLowerCase();
                var hud = document.getElementById('hud');
                if (hud) hud.textContent = (project.hudIndex ? project.hudIndex + ' · ' : '') + (project.title || '').toUpperCase();
                var crumb = document.getElementById('crumb-current');
                if (crumb) crumb.textContent = project.title || '';
                renderCanvas(project);
                renderLeftSidebar(project);
                initWorkspace();
            })
            .catch(function(err) {
                console.error('Failed to load project:', err);
            });
    };
})();
