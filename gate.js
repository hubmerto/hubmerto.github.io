(function() {
    var PASS = 'jjjj';
    var KEY = 'hm_gate_v1';

    if (sessionStorage.getItem(KEY) === PASS) return;

    document.documentElement.style.visibility = 'hidden';

    function mount() {
        document.documentElement.style.visibility = '';

        var style = document.createElement('style');
        style.textContent =
            '#hm-gate{position:fixed;inset:0;background:#0a0a0a;z-index:99999;' +
            'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
            'font-family:"Space Grotesk",system-ui,sans-serif;font-weight:300;' +
            'color:#e0e0e0;-webkit-user-select:none;user-select:none;}' +
            '#hm-gate .brand{font-size:13px;letter-spacing:0.15em;text-transform:uppercase;color:#555;margin-bottom:64px;}' +
            '#hm-gate .msg{font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#444;margin-bottom:20px;}' +
            '#hm-gate input{background:transparent;border:none;border-bottom:1px solid #333;' +
            'color:#e0e0e0;font-family:inherit;font-weight:300;font-size:18px;' +
            'padding:8px 4px;text-align:center;outline:none;width:220px;letter-spacing:0.2em;}' +
            '#hm-gate input:focus{border-bottom-color:#e0e0e0;}' +
            '#hm-gate .err{font-size:10px;color:#aa4444;letter-spacing:0.15em;margin-top:16px;height:12px;' +
            'text-transform:uppercase;opacity:0;transition:opacity 0.2s;}' +
            '#hm-gate .err.show{opacity:1;}' +
            '#hm-gate .hint{position:absolute;bottom:24px;font-size:10px;color:#333;letter-spacing:0.15em;text-transform:uppercase;}';
        document.head.appendChild(style);

        var overlay = document.createElement('div');
        overlay.id = 'hm-gate';

        var brand = document.createElement('div');
        brand.className = 'brand';
        brand.textContent = 'hubmerto';
        overlay.appendChild(brand);

        var msg = document.createElement('div');
        msg.className = 'msg';
        msg.textContent = 'Under construction';
        overlay.appendChild(msg);

        var input = document.createElement('input');
        input.type = 'password';
        input.autocomplete = 'off';
        input.spellcheck = false;
        overlay.appendChild(input);

        var err = document.createElement('div');
        err.className = 'err';
        err.textContent = 'Wrong';
        overlay.appendChild(err);

        var hint = document.createElement('div');
        hint.className = 'hint';
        hint.textContent = 'Press enter to unlock';
        overlay.appendChild(hint);

        document.body.appendChild(overlay);
        input.focus();

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                if (input.value === PASS) {
                    sessionStorage.setItem(KEY, PASS);
                    overlay.style.transition = 'opacity 0.4s';
                    overlay.style.opacity = '0';
                    setTimeout(function() { overlay.remove(); }, 400);
                } else {
                    err.classList.add('show');
                    input.value = '';
                    setTimeout(function() { err.classList.remove('show'); }, 1500);
                }
            }
        });
    }

    if (document.body) {
        mount();
    } else {
        document.addEventListener('DOMContentLoaded', mount);
    }
})();
