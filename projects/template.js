(function() {
    function esc(s) { return String(s == null ? '' : s); }

    function renderColumns(project) {
        var bar = document.getElementById('bottom-bar');
        (project.columns || []).forEach(function(col) {
            var el = document.createElement('div');
            el.className = 'col';

            if (col.title) {
                var t = document.createElement('div');
                t.className = 'col-title';
                t.textContent = col.title;
                el.appendChild(t);
            }
            if (col.tags) {
                var tg = document.createElement('div');
                tg.className = 'col-tags';
                tg.textContent = col.tags;
                el.appendChild(tg);
            }
            if (col.text) {
                var tx = document.createElement('div');
                tx.className = 'col-text';
                tx.textContent = col.text;
                el.appendChild(tx);
            }
            if (col.meta && col.meta.length) {
                var m = document.createElement('div');
                m.className = 'col-meta';
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
                    m.appendChild(r);
                });
                el.appendChild(m);
            }

            bar.appendChild(el);
        });
    }

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
            el.loading = 'lazy';
            el.setAttribute('allow', 'autoplay');
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
        return n;
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

        var MAX_H = 380;
        var MAX_W = 480;

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
                var col = i % cols;
                var row = Math.floor(i / cols);
                var cx = (col - (cols - 1) / 2) * cellW + rand(i * 2) * 60;
                var cy = (row - (rows - 1) / 2) * cellH + rand(i * 2 + 1) * 60;
                n.dataset.cx = cx;
                n.dataset.cy = cy;
            });

            relaxLayout(20);
            placeAll();
        }

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
            nodes.forEach(function(n) {
                var cx = parseFloat(n.dataset.cx) || 0;
                var cy = parseFloat(n.dataset.cy) || 0;
                var w = parseFloat(n.dataset.w);
                var h = parseFloat(n.dataset.h);
                n.style.left = (tx + cx * scale - w / 2) + 'px';
                n.style.top = (ty + cy * scale - h / 2) + 'px';
            });
        }

        function applyTransform() {
            // Canvas layer stays at identity; nodes are placed in screen space so
            // they keep their native pixel size regardless of zoom.
            canvas.style.transform = 'none';
            var gridSize = 40 * scale;
            gridBg.style.backgroundSize = gridSize + 'px ' + gridSize + 'px';
            gridBg.style.backgroundPosition = tx + 'px ' + ty + 'px';
            placeAll();
            updateMagnification();
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
            var w = workspace.offsetWidth;
            var h = workspace.offsetHeight;
            var cx = parseFloat(n.dataset.cx) || 0;
            var cy = parseFloat(n.dataset.cy) || 0;
            var targetTx = w / 2 - cx * scale;
            var targetTy = h / 2 - cy * scale;
            var startTxA = tx;
            var startTyA = ty;
            var dtx = targetTx - startTxA;
            var dty = targetTy - startTyA;
            var duration = 650;
            var startTime = performance.now();

            function ease(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }

            function step(now) {
                var t = Math.min(1, (now - startTime) / duration);
                var e = ease(t);
                tx = startTxA + dtx * e;
                ty = startTyA + dty * e;
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
                centerOnNode(pressTarget);
            }
            pressTarget = null;
        });

        // Wheel / trackpad: pan the canvas (no zoom — images stay in place)
        workspace.addEventListener('wheel', function(e) {
            e.preventDefault();
            tx -= e.deltaX;
            ty -= e.deltaY;
            applyTransform();
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

    window.loadProject = function(jsonPath) {
        fetch(jsonPath)
            .then(function(r) { return r.json(); })
            .then(function(project) {
                document.title = 'hubmerto.' + (project.slug || project.title || '').toLowerCase();
                var hud = document.getElementById('hud');
                if (hud) hud.textContent = (project.hudIndex ? project.hudIndex + ' · ' : '') + (project.title || '').toUpperCase();
                renderCanvas(project);
                renderColumns(project);
                initWorkspace();
            })
            .catch(function(err) {
                console.error('Failed to load project:', err);
            });
    };
})();
