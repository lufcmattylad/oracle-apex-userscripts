// ==UserScript==
// @name         Oracle APEX Auto-hide Header
// @namespace    https://github.com/lufcmattylad
// @version      24.2.1
// @description  Collapse only the .a-Header inside <header> and expand on hover, with user-configurable settings and instant first collapse
// @author       Matt Mulvaney – @Matt_Mulvaney
// @match        *://*/ords/*
// @match        *://*/pls/*
// @grant        GM_info
// @tag          orclapex
// @downloadURL  https://raw.githubusercontent.com/lufcmattylad/oracle-apex-userscripts/refs/heads/main/scripts/oracle-apex-auto-hide-header/script.js
// ==/UserScript==

(function () {
    'use strict';

    /* ===== USER SETTINGS ===== */
    const SETTINGS = {
        DEBUG: false,                // Toggle debug logging
        TRIGGER_COLOR: '',          // Bar colour  (#44475a is a good dark tone)
        TRIGGER_HEIGHT: 4,          // Height of the trigger bar (px)
        TRIGGER_OPACITY: 0.9,       // Trigger bar opacity 0–1
        TRIGGER_BRIGHTNESS: 1.1,    // Brightness on hover
        COLLAPSE_DELAY: 300,        // Delay before header collapses (ms)
        TRANSITION_SPEED: 0.4,      // Header slide speed (s)
        SHADOW: '0 2px 8px rgba(0,0,0,0.1)' // Header box-shadow
    };
    /* ========================= */

    /* ---------- helpers ---------- */
    const LOG_PREFIX = `[${GM_info.script.name}] `;
    const debugLog   = msg => SETTINGS.DEBUG && console.log(LOG_PREFIX + msg);

    /* --- skip if running inside an APEX modal dialog / iframe --- */
    if (window.self !== window.top) {
        debugLog('Detected iframe / modal dialog – script will not run');
        return;
    }

    /* ---------- environment validation ---------- */
    function isApexEnvironmentValid () {
        return typeof apex !== 'undefined' &&
               +apex.env.APP_ID >= 3000 &&
               +apex.env.APP_ID <= 8999;
    }

    function waitForApex (callback, maxAttempts = 50) {
        let attempts = 0;
        (function poll () {
            attempts++;
            if (typeof apex !== 'undefined' && apex.env) {
                if (isApexEnvironmentValid()) {
                    debugLog('APEX environment validated');
                    callback();
                } else {
                    debugLog('Validation failed – APP_ID not in allowed range ' +
                             `(current: ${apex.env.APP_ID})`);
                }
            } else if (attempts < maxAttempts) {
                setTimeout(poll, 100);
            } else {
                debugLog('Timed out waiting for APEX to load');
            }
        })();
    }

    /* ---------- main logic ---------- */
    function initialise () {
        const header = document.querySelector('header .a-Header');
        if (!header) { debugLog('.a-Header not found'); return; }

        /* trigger bar */
        const trigger = document.createElement('div');
        trigger.id = 'header-trigger-userscript';
        document.body.appendChild(trigger);

        /* styles */
        const style = document.createElement('style');
        style.textContent = `
#header-trigger-userscript{
  position:fixed;top:0;left:0;z-index:10001;width:100vw;height:${SETTINGS.TRIGGER_HEIGHT}px;
  background:${SETTINGS.TRIGGER_COLOR};cursor:pointer;opacity:${SETTINGS.TRIGGER_OPACITY};
  transition:opacity .2s,background .2s;
}
#header-trigger-userscript:hover{
  opacity:1;filter:brightness(${SETTINGS.TRIGGER_BRIGHTNESS});
}
header .a-Header.__collapsed-userscript{
  position:fixed!important;top:0;left:0;width:100vw;z-index:10000;box-shadow:${SETTINGS.SHADOW};
  transform:translateY(-100%);transition:transform ${SETTINGS.TRANSITION_SPEED}s;
}
header .a-Header.__collapsed-userscript.__expanded-userscript{transform:translateY(0);}
div#pdNotification{padding-top:40px;}
        `;
        document.head.appendChild(style);

        /* initial collapse (no transition) */
        header.classList.add('__collapsed-userscript');
        header.style.transition = 'none';
        void header.offsetHeight;
        setTimeout(() => { header.style.transition = ''; }, 0);

        /* expand / collapse logic */
        let leaveTimeout, isExpanded = false;

        const expandHeader = () => {
            clearTimeout(leaveTimeout);
            header.classList.add('__expanded-userscript');
            isExpanded = true;
        };

        const scheduleCollapse = () => {
            clearTimeout(leaveTimeout);
            leaveTimeout = setTimeout(() => {
                header.classList.remove('__expanded-userscript');
                isExpanded = false;
            }, SETTINGS.COLLAPSE_DELAY);
        };

        const handleMouseLeave = e => {
            const { clientX: x, clientY: y, relatedTarget: rt } = e;
            if (y <= 0) return;                                   // leaving upward
            if (rt && (header.contains(rt) || trigger.contains(rt))) return;

            const belowHeader = y > header.getBoundingClientRect().bottom;
            const outsideHoriz = x < 0 || x > window.innerWidth;
            if (belowHeader || outsideHoriz) scheduleCollapse();
            else scheduleCollapse();
        };

        const throttledMove = (() => {
            let id;
            return e => {
                clearTimeout(id);
                id = setTimeout(() => {
                    if (isExpanded) {
                        const hRect = header.getBoundingClientRect();
                        const tRect = trigger.getBoundingClientRect();
                        if (e.clientY >= tRect.top && e.clientY <= hRect.bottom)
                            expandHeader();
                    }
                }, 16);
            };
        })();

        trigger.addEventListener('mouseenter', expandHeader);
        trigger.addEventListener('mouseleave', handleMouseLeave);
        header .addEventListener('mouseenter', expandHeader);
        header .addEventListener('mouseleave', handleMouseLeave);
        document.addEventListener('mousemove', throttledMove);

        header.style.zIndex = '10000';
        (window.jQuery || window.$)?.(document).trigger('apexwindowresized');

        debugLog('Successfully initialised');
    }

    /* ---------- bootstrap ---------- */
    document.readyState !== 'loading'
        ? waitForApex(initialise)
        : document.addEventListener('DOMContentLoaded', () => waitForApex(initialise));

})();
