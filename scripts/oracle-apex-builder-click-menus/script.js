// ==UserScript==
// @name         Oracle APEX Builder Click Menus
// @run-at       document-idle
// @namespace    https://github.com/lufcmattylad
// @version      26.1.1
// @description  Converts the hover menus on App Builder and SQL Workshop in the APEX 26.1 builder navigation into click-to-open menus (like Administration). The original links remain available as the first item of each menu, or via Ctrl+click / middle-click.
// @author       Matt Mulvaney - @Matt_Mulvaney
// @match        *://*/ords/*
// @match        *://*/pls/*
// @tag          orclapex
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/lufcmattylad/oracle-apex-userscripts/refs/heads/main/scripts/oracle-apex-builder-click-menus/script.js
// ==/UserScript==

(function () {
    'use strict';

    /**
     * DISCLAIMER:
     * This code is unofficial and is not supported by Oracle APEX.
     * It is provided "as is" without warranty of any kind, either express or implied.
     * Use of this code is at your own risk. The authors and distributors accept no responsibility
     * for any consequences arising from its use.
     */

    function isApexEnvironmentValid() {
        if (typeof apex === 'undefined') return false;

        const appId = parseInt(apex.env.APP_ID, 10);
        if (appId < 3000 || appId > 8999) return false;

        const version = apex.env.APEX_VERSION || '';
        const major = parseInt(version.split('.')[0], 10);
        const minor = parseInt(version.split('.')[1], 10);

        return major > 26 || (major === 26 && minor >= 1);
    }

    if (!isApexEnvironmentValid()) return;

    const $ = apex.jQuery;

    // Prepend an "Open <label>" item to the menu so the original link stays reachable
    function addOpenLinkItem($menu, label, href) {
        const menuInstance = $menu.data('apex-menu');
        if (!menuInstance) return false;

        const items = $menu.menu('option', 'items') || [];
        if (items.some(item => item._tlnOpenLink)) return true;

        items.unshift(
            { type: 'action', label: 'Open ' + label, href: href, _tlnOpenLink: true },
            { type: 'separator' }
        );
        $menu.menu('option', 'items', items);
        return true;
    }

    function convertToClickMenu(anchor) {
        const menuId = anchor.getAttribute('data-hover-menu');
        const $menu = $('#' + menuId);
        if (!$menu.length) return;

        const href = anchor.href;
        const label = anchor.title || anchor.textContent.trim();

        // Clone the anchor to shed the hover-menu listeners, and drop the
        // attribute so any delegated hover handlers no longer match
        const button = anchor.cloneNode(true);
        button.removeAttribute('data-hover-menu');
        button.setAttribute('aria-haspopup', 'menu');
        button.setAttribute('aria-expanded', 'false');
        anchor.replaceWith(button);

        $menu.on('menuafterclose', function () {
            button.setAttribute('aria-expanded', 'false');
        });

        button.addEventListener('click', function (event) {
            // Modified or middle clicks keep native link behaviour (new tab etc.)
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;

            // If the menu widget isn't available, fall back to navigation
            if (!addOpenLinkItem($menu, label, href)) return;

            event.preventDefault();
            const rect = button.getBoundingClientRect();
            $menu.menu('toggle', rect.left, rect.bottom);
            button.setAttribute('aria-expanded', 'true');
        });
    }

    document.querySelectorAll('.b-Header a[data-hover-menu]').forEach(convertToClickMenu);
})();
