/* ===========================================================================
   Tools Hub — cross-device / cross-OS runtime compatibility layer
   Loaded first, synchronously, so it can observe how each tool wires itself up.

   1. Keeps --app-vh accurate on browsers without dynamic viewport units.
   2. Forwards touch gestures to tools that only listen for mouse events.
   3. Blocks iOS double-tap zoom and pinch-zoom-on-gesture inside canvases.
   4. Flags the platform on <html> so pages can target it if they need to.
   =========================================================================== */
(function () {
    'use strict';

    var doc = document;
    var root = doc.documentElement;

    /* --- Platform flags ---------------------------------------------------- */
    var ua = navigator.userAgent;
    var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    var isIOS = /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    root.classList.add(isTouch ? 'is-touch' : 'is-pointer');
    if (isIOS) root.classList.add('is-ios');
    if (/Android/.test(ua)) root.classList.add('is-android');

    /* --- 1. Viewport height ------------------------------------------------
       Browsers that support 100dvh get it straight from CSS. Everything older
       (iOS < 15.4, Samsung Internet, older Android WebViews) is measured here
       and re-measured whenever the URL bar or on-screen keyboard moves. */
    var supportsDvh = window.CSS && CSS.supports && CSS.supports('height', '100dvh');

    function syncViewportHeight() {
        var vv = window.visualViewport;
        var h = vv ? vv.height : window.innerHeight;
        root.style.setProperty('--app-vh', (h / 100) + 'px');
    }

    if (!supportsDvh) {
        syncViewportHeight();
        window.addEventListener('resize', syncViewportHeight, { passive: true });
        window.addEventListener('orientationchange', function () {
            // iOS reports stale dimensions until after the rotation settles.
            setTimeout(syncViewportHeight, 300);
        }, { passive: true });
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', syncViewportHeight, { passive: true });
        }
    }

    /* --- 2. Touch support for mouse-only tools -----------------------------
       Several tools (crop overlays, image/shape drag handles, canvas editors)
       were written against mousedown/mousemove/mouseup only, so they are dead
       under a finger. Rather than rewrite each one, note which elements the
       page wires mouse-drag or touch handlers onto, then translate a real
       touch into the mouse sequence the tool expects.

       Only drags that START on a known mouse-drag element are translated, so
       ordinary scrolling, tapping and pinch-zoom are left completely alone. */
    var touchAware = new WeakSet();   // element handles touch/pointer itself
    var dragAware = new WeakSet();    // element listens for mousedown
    var nativeAdd = EventTarget.prototype.addEventListener;

    EventTarget.prototype.addEventListener = function (type, listener, options) {
        if (typeof type === 'string' && this instanceof Element) {
            if (type.indexOf('touch') === 0 || type.indexOf('pointer') === 0) {
                touchAware.add(this);
            } else if (type === 'mousedown') {
                dragAware.add(this);
            }
        }
        return nativeAdd.call(this, type, listener, options);
    };

    function dispatchMouse(target, type, point) {
        target.dispatchEvent(new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: point.clientX,
            clientY: point.clientY,
            screenX: point.screenX,
            screenY: point.screenY,
            button: 0,
            buttons: type === 'mouseup' ? 0 : 1
        }));
    }

    /* Controls the browser already handles correctly under touch — never
       intercept these, or we break focus, typing and native tap behaviour. */
    var NATIVE_TOUCH_OK = 'a,button,input,select,textarea,label,summary,option,' +
        '[contenteditable],[contenteditable="true"]';

    /* Nearest ancestor that drags with the mouse but ignores touch. */
    function mouseOnlySurface(node) {
        if (!node || !node.closest || node.closest(NATIVE_TOUCH_OK)) return null;
        for (var el = node; el && el !== doc.body; el = el.parentElement) {
            // The tool already handles touch itself — hands off.
            if (touchAware.has(el) || el.ontouchstart || el.onpointerdown) return null;
            // addEventListener, `el.onmousedown = fn`, and inline onmousedown="".
            if (dragAware.has(el) || el.onmousedown || el.tagName === 'CANVAS') return el;
        }
        return null;
    }

    if (isTouch) {
        var activeSurface = null;
        var startPoint = null;

        doc.addEventListener('touchstart', function (e) {
            if (e.touches.length > 1) return;      // leave pinch-zoom alone
            activeSurface = mouseOnlySurface(e.target);
            if (!activeSurface) return;
            startPoint = e.changedTouches[0];
            dispatchMouse(activeSurface, 'mousedown', startPoint);
            // Suppressing the default also suppresses the browser's own
            // compatibility mouse events, so the tool sees exactly one drag.
            if (e.cancelable) e.preventDefault();
        }, { passive: false, capture: true });

        doc.addEventListener('touchmove', function (e) {
            if (!activeSurface || e.touches.length > 1) return;
            dispatchMouse(activeSurface, 'mousemove', e.changedTouches[0]);
            if (e.cancelable) e.preventDefault();  // don't scroll mid-drag
        }, { passive: false, capture: true });

        function endDrag(e) {
            if (!activeSurface) return;
            var point = e.changedTouches[0];
            dispatchMouse(activeSurface, 'mouseup', point);

            // A touch that never moved is a tap: replay the click the
            // preventDefault above swallowed.
            if (startPoint &&
                Math.abs(point.clientX - startPoint.clientX) < 10 &&
                Math.abs(point.clientY - startPoint.clientY) < 10) {
                var hit = doc.elementFromPoint(point.clientX, point.clientY) || activeSurface;
                dispatchMouse(hit, 'click', point);
            }

            activeSurface = null;
            startPoint = null;
        }

        doc.addEventListener('touchend', endDrag, { passive: true, capture: true });
        doc.addEventListener('touchcancel', function () {
            activeSurface = null;
            startPoint = null;
        }, { passive: true, capture: true });
    }

    /* --- 3. iOS gesture quirks ---------------------------------------------
       Safari on iOS still double-tap-zooms and pinch-zooms over drawing
       surfaces even with touch-action set. Suppress it only there. */
    if (isIOS) {
        // Buttons are covered by `touch-action: manipulation` in compat.css —
        // intercepting them here would swallow fast repeat taps (keypads).
        ['gesturestart', 'gesturechange'].forEach(function (type) {
            doc.addEventListener(type, function (e) {
                if (e.target.closest && e.target.closest('canvas')) e.preventDefault();
            }, { passive: false });
        });
    }
})();
