(function() {
    var KEY = 'hm_theme';
    var ATTR = 'data-theme';

    function getSaved() {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }
    function save(v) {
        try { localStorage.setItem(KEY, v); } catch (e) {}
    }
    function apply(theme) {
        document.documentElement.setAttribute(ATTR, theme);
    }
    function current() {
        return document.documentElement.getAttribute(ATTR) || 'dark';
    }

    // Apply saved theme as early as possible to prevent flash
    apply(getSaved() || 'dark');

    function makeToggleButton() {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'theme-toggle';
        btn.setAttribute('aria-label', 'Toggle theme');
        btn.title = 'Toggle theme';
        var icon = document.createElement('span');
        icon.className = 'theme-toggle-icon';
        btn.appendChild(icon);

        function render() {
            // ◐ glyph reflects current state — left-half-filled for dark, right for light
            icon.textContent = current() === 'light' ? '◑' : '◐';
        }

        btn.addEventListener('click', function() {
            var next = current() === 'light' ? 'dark' : 'light';
            apply(next);
            save(next);
            render();
            window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
        });

        render();
        return btn;
    }

    function inject() {
        var nav = document.querySelector('nav');
        if (!nav) return;
        if (nav.querySelector('.theme-toggle')) return;
        nav.appendChild(makeToggleButton());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }

    window.hmTheme = {
        toggle: function() {
            var next = current() === 'light' ? 'dark' : 'light';
            apply(next);
            save(next);
        },
        set: function(t) { apply(t); save(t); },
        current: current
    };
})();
