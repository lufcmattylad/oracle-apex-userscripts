// ==UserScript==
// @name         Oracle APEX Object Browser in Page Designer
// @run-at       document-idle
// @namespace    https://github.com/lufcmattylad
// @version      26.1.1
// @description  Adds an "Object Browser" tab to the right of the Layout tab in the APEX 26.1 Page Designer. The tab embeds the SQL Workshop Object Browser (#main only) in an iframe using the current builder session, so you can browse tables and other objects without leaving the page you are editing.
// @author       Matt Mulvaney - @Matt_Mulvaney
// @match        *://*/ords/*
// @match        *://*/pls/*
// @tag          orclapex
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/lufcmattylad/oracle-apex-userscripts/refs/heads/main/scripts/oracle-apex-obj-browser-in-pd/script.js
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

    const PANEL_ID = 'object_browser';
    const ANCHOR_ID = 'pd-ob-tab-anchor';
    const TAB_MARKER = 'js-pd-ob-tab'; // stable class on our <li>, used to find it

    let $;                       // assigned once apex.jQuery is available
    let obResizeObserver = null; // tracks editor size so the panel/iframe fill it
    let injectedTab = null;      // the default tab we injected, dropped if APEX restores its own
    let isDragging = false;      // true while a jQuery UI sortable drag is in progress

    // CSS injected into the iframe to strip everything except the Object Browser itself.
    const IFRAME_HIDE_CSS =
        'header.b-Header{display:none !important;}' +
        '.b-Content > .a-ControlBar .a-Breadcrumb{display:none !important;}';

    // Page Designer is application 4000, page 4500. Require APEX 26.1+.
    function isPageDesigner() {
        if (typeof apex === 'undefined' || !apex.env) return false;
        if (apex.env.APP_ID !== '4000' || apex.env.APP_PAGE_ID !== '4500') return false;

        const version = apex.env.APEX_VERSION || '';
        const major = parseInt(version.split('.')[0], 10);
        const minor = parseInt(version.split('.')[1], 10);
        return major > 26 || (major === 26 && minor >= 1);
    }

    function objectBrowserUrl() {
        return location.origin +
            '/ords/r/apex/sql-workshop/ob?session=' + encodeURIComponent(apex.env.APP_SESSION);
    }

    // Trim the embedded page down to #main once it has loaded, then force it to lay
    // out to the full iframe height. Same-origin, so we can reach into the iframe.
    function trimIframe(iframe) {
        try {
            const win = iframe.contentWindow;
            const doc = iframe.contentDocument;
            if (!doc || !doc.head) return;

            let style = doc.getElementById('pd-ob-embed-style');
            if (!style) {
                style = doc.createElement('style');
                style.id = 'pd-ob-embed-style';
                doc.head.appendChild(style);
            }
            style.textContent = IFRAME_HIDE_CSS;

            // The Object Browser uses an a-Splitter. When the iframe is hidden (its tab
            // is not active) its viewport collapses to 0 and APEX throws "Splitter needs
            // to be in a component with size" from its resize handler. Harmless, so
            // swallow just that message.
            if (win && !win.__obSplitterGuard) {
                win.__obSplitterGuard = true;
                win.addEventListener('error', function (e) {
                    if (e && e.message && e.message.indexOf('Splitter needs to be in a component with size') !== -1) {
                        e.preventDefault();
                    }
                });
            }

            // Re-lay out to the full height now the header is hidden; a delayed second
            // nudge wins against APEX's own late layout pass. Only while visible.
            if (win && iframe.offsetParent !== null) {
                win.dispatchEvent(new Event('resize'));
                setTimeout(function () {
                    try {
                        if (iframe.offsetParent !== null && iframe.contentWindow) {
                            iframe.contentWindow.dispatchEvent(new Event('resize'));
                        }
                    } catch (e) { /* ignore */ }
                }, 200);
            }
        } catch (e) {
            // Cross-origin or timing issue - leave the page as-is.
        }
    }

    // Tell the embedded Object Browser to re-lay out to the current iframe size.
    function nudgeIframeLayout() {
        const iframe = document.getElementById('pd-ob-iframe');
        if (iframe && iframe.dataset.loaded && iframe.offsetParent !== null && iframe.contentWindow) {
            try { iframe.contentWindow.dispatchEvent(new Event('resize')); } catch (e) { /* ignore */ }
        }
    }

    function buildPanel() {
        const panel = document.createElement('div');
        panel.id = PANEL_ID;
        // A real jQuery UI tab panel, but deliberately NOT a ".resize" region: we size
        // it ourselves (sizePanel) and keep it out of APEX's resize cascade.
        panel.className = 'ui-corner-bottom ui-widget-content ui-tabs-panel';
        panel.setAttribute('role', 'tabpanel');
        // min-width/height:0 lets the surrounding splitter shrink the editor column
        // below the iframe's intrinsic size - without it the column can only grow.
        panel.style.cssText = 'overflow:hidden;padding:0;min-width:0;min-height:0;';

        const iframe = document.createElement('iframe');
        iframe.id = 'pd-ob-iframe';
        iframe.title = 'Object Browser';
        iframe.style.cssText = 'border:0;width:100%;height:100%;display:block;min-width:0;min-height:0;';
        iframe.addEventListener('load', function () { trimIframe(iframe); });
        panel.appendChild(iframe);

        return panel;
    }

    function buildTab(layoutTab) {
        const tab = layoutTab.cloneNode(true);
        tab.classList.remove('ui-tabs-active', 'ui-state-active');
        tab.classList.add(TAB_MARKER); // stable hook so we can find/restore our tab
        tab.setAttribute('aria-selected', 'false');
        tab.setAttribute('aria-controls', PANEL_ID);
        tab.setAttribute('tabindex', '-1');

        const anchor = tab.querySelector('a.ui-tabs-anchor');
        anchor.id = ANCHOR_ID;
        anchor.setAttribute('href', '#' + PANEL_ID); // hash => jQuery UI binds it to our panel
        anchor.setAttribute('tabindex', '-1');
        tab.setAttribute('aria-labelledby', ANCHOR_ID);

        // Cloning the Layout tab keeps the responsive icon-only behaviour; we just
        // swap the glyph. icon-database is the icon the Object Browser itself uses.
        const icon = anchor.querySelector('.a-Icon');
        if (icon) {
            icon.className = 'a-Icon icon-database sf-hidden';
            icon.setAttribute('title', 'Object Browser');
        }
        const label = anchor.querySelector('.a-Tabs-label');
        if (label) label.textContent = 'Object Browser';

        return tab;
    }

    // After a tab is dragged to a new position, APEX re-renders the tab bar from its
    // internal model and blanks our (unknown) tab. Re-apply the label/icon/href in
    // place, found via our marker class. Idempotent, so it won't loop when the
    // MutationObserver sees our own change.
    function ensureTabIntegrity() {
        const tab = document.querySelector('li.' + TAB_MARKER);
        if (!tab) return;

        if (tab.getAttribute('aria-controls') !== PANEL_ID) tab.setAttribute('aria-controls', PANEL_ID);

        const anchor = tab.querySelector('a.ui-tabs-anchor');
        if (!anchor) return;

        if (anchor.id !== ANCHOR_ID) anchor.id = ANCHOR_ID;
        if (anchor.getAttribute('href') !== '#' + PANEL_ID) anchor.setAttribute('href', '#' + PANEL_ID);
        if (tab.getAttribute('aria-labelledby') !== ANCHOR_ID) tab.setAttribute('aria-labelledby', ANCHOR_ID);

        let icon = anchor.querySelector('.a-Icon');
        if (!icon) {
            icon = document.createElement('span');
            icon.setAttribute('aria-hidden', 'true');
            anchor.insertBefore(icon, anchor.firstChild);
        }
        if (icon.className !== 'a-Icon icon-database sf-hidden') icon.className = 'a-Icon icon-database sf-hidden';
        if (icon.getAttribute('title') !== 'Object Browser') icon.setAttribute('title', 'Object Browser');

        let label = anchor.querySelector('.a-Tabs-label');
        if (!label) {
            label = document.createElement('span');
            label.className = 'a-Tabs-label';
            anchor.appendChild(label);
        }
        if (label.textContent !== 'Object Browser') label.textContent = 'Object Browser';
    }

    // Size our panel to the full editor content area (tab container minus the tab
    // bar), matching the height the built-in panels get from APEX's resize manager.
    function sizePanel(tabs, panel) {
        const toolbar = tabs.querySelector(':scope > .a-Tabs-toolbar');
        const h = tabs.clientHeight - (toolbar ? toolbar.offsetHeight : 0);
        if (h > 0) panel.style.height = h + 'px';
    }

    function refreshSize(tabs) {
        const panel = document.getElementById(PANEL_ID);
        if (panel && panel.offsetParent !== null) { // only when our tab is active/visible
            sizePanel(tabs, panel);
            nudgeIframeLayout();
        }
    }

    function loadAndSize(tabs) {
        const panel = document.getElementById(PANEL_ID);
        const iframe = document.getElementById('pd-ob-iframe');
        if (iframe && !iframe.dataset.loaded) {
            iframe.dataset.loaded = '1';
            iframe.src = objectBrowserUrl(); // first layout handled by trimIframe on load
        }
        if (panel) sizePanel(tabs, panel);
        nudgeIframeLayout();
    }

    function bindHandlers(tabs) {
        // jQuery UI handles tab switching, panel visibility, active state, ARIA and
        // keyboard. We only lazy-load the iframe and keep it sized.
        $(tabs).off('tabsactivate.obpd');
        $(tabs).on('tabsactivate.obpd', function (event, ui) {
            if (ui.newPanel && ui.newPanel[0] && ui.newPanel[0].id === PANEL_ID) loadAndSize(tabs);
        });

        $(window).off('resize.obpd').on('resize.obpd', function () { refreshSize(tabs); });

        // The column splitter resizes via APEX's internal layout (no window resize),
        // so a ResizeObserver on the tab container is what actually tracks it.
        if (!obResizeObserver && window.ResizeObserver) {
            obResizeObserver = new ResizeObserver(function () { refreshSize(tabs); });
            obResizeObserver.observe(tabs);
        }
    }

    // Keep exactly one Object Browser tab and one panel. The tab is freely draggable
    // (incl. into other tab bars, where it shows blank as its panel lives here). The
    // panel/iframe is created once and never re-parented. On reload APEX restores the
    // tab at the position you left it; if our default copy also got injected, we drop
    // ours and keep APEX's, so there is never a duplicate.
    function ensure() {
        const tabs = document.getElementById('editor_tabs');
        if (!tabs) return false;

        const tablist = tabs.querySelector('ul[role="tablist"]');
        const layoutTab = tablist && tablist.querySelector('li[aria-controls="grid_layout"]');
        const layoutPanel = document.getElementById('grid_layout');
        if (!tablist || !layoutTab || !layoutPanel) return false;

        let structureChanged = false;

        // Exactly one panel (ids must be unique; remove any stray duplicates).
        const panels = document.querySelectorAll('[id="' + PANEL_ID + '"]');
        for (let i = 1; i < panels.length; i++) { panels[i].remove(); structureChanged = true; }
        if (!document.getElementById(PANEL_ID)) {
            layoutPanel.insertAdjacentElement('afterend', buildPanel());
            structureChanged = true;
        }

        // Exactly one tab. Inject a default (next to Layout) only when none exists;
        // when more than one exists, keep the copy that ISN'T the one we injected
        // (that is APEX's, at the position you chose) and drop ours.
        const obTabs = Array.prototype.slice.call(document.querySelectorAll('li.' + TAB_MARKER));
        if (obTabs.length === 0) {
            injectedTab = buildTab(layoutTab);
            layoutTab.insertAdjacentElement('afterend', injectedTab);
            structureChanged = true;
        } else if (obTabs.length > 1) {
            let keeper = null;
            obTabs.forEach(function (li) { if (!keeper && li !== injectedTab) keeper = li; });
            if (!keeper) keeper = obTabs[0];
            obTabs.forEach(function (li) {
                if (li !== keeper) {
                    if (li === injectedTab) injectedTab = null;
                    li.remove();
                    structureChanged = true;
                }
            });
        }

        const keeperTab = document.querySelector('li.' + TAB_MARKER);

        if (structureChanged) {
            const keeperWidget = keeperTab && keeperTab.closest('.ui-tabs');
            try { $(tabs).tabs('refresh'); } catch (e) { /* widget not ready */ }
            if (keeperWidget && keeperWidget !== tabs) {
                try { $(keeperWidget).tabs('refresh'); } catch (e) { /* not a tabs widget */ }
            }
            bindHandlers(tabs);
        }

        ensureTabIntegrity();
        return true;
    }

    // While our tab is active, APEX's Grid Layout View resizes the hidden Layout grid
    // and reads a model that isn't there, throwing "Cannot read properties of undefined
    // (reading 'id')". It is harmless (the grid is not shown), so swallow just that.
    function bindGlvErrorGuard() {
        window.addEventListener('error', function (e) {
            const msg = (e && e.message) || '';
            const src = (e && e.filename) || '';
            if (msg.indexOf("reading 'id'") !== -1 && /glv|f4000_p4500/.test(src)) {
                e.preventDefault();
            }
        });
    }

    // While a Page Designer splitter is dragged, the cursor passes over our iframe,
    // which would otherwise swallow the mousemove events and freeze the drag. Turn off
    // the iframe's pointer events for the duration of the drag.
    function bindDragGuard() {
        function setIframePointerEvents(value) {
            const iframe = document.getElementById('pd-ob-iframe');
            if (iframe) iframe.style.pointerEvents = value;
        }
        document.addEventListener('mousedown', function (e) {
            if (!e.target.closest || !e.target.closest('.a-Splitter-bar')) return;
            setIframePointerEvents('none');
            const release = function () {
                setIframePointerEvents('');
                document.removeEventListener('mouseup', release, true);
            };
            document.addEventListener('mouseup', release, true);
        }, true);
    }

    // Wait until the APEX runtime (and apex.env) is available. In the 26.1 friendly-URL
    // Page Designer this can populate slightly after document-idle.
    function whenApexReady(cb) {
        if (typeof apex !== 'undefined' && apex.env && apex.env.APP_ID && apex.jQuery) {
            cb();
            return;
        }
        let attempts = 0;
        const timer = setInterval(function () {
            if (typeof apex !== 'undefined' && apex.env && apex.env.APP_ID && apex.jQuery) {
                clearInterval(timer);
                cb();
            } else if (++attempts > 80) {
                clearInterval(timer);
            }
        }, 250);
    }

    function start() {
        if (!isPageDesigner()) return;

        $ = apex.jQuery;
        bindGlvErrorGuard();
        bindDragGuard();

        // Try immediately, then poll, then keep watching: the Page Designer can rebuild
        // its tab bar, which would drop the injected tab.
        if (ensure()) return startObserver();

        let attempts = 0;
        const timer = setInterval(function () {
            if (ensure() || ++attempts > 80) {
                clearInterval(timer);
                startObserver();
            }
        }, 250);
    }

    // Keep the tab/panel present and intact whenever APEX rebuilds its tab bar.
    // Suppressed while a jQuery UI sortable drag is active — sortable inserts a
    // placeholder clone that looks like a duplicate tab, which would confuse ensure().
    function startObserver() {
        $(document).on('sortstart.obpd', function () { isDragging = true; });
        $(document).on('sortstop.obpd', function () {
            isDragging = false;
            setTimeout(ensure, 50); // let APEX finish its own sortstop handlers first
        });

        const observer = new MutationObserver(function () {
            if (!isDragging) ensure();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    whenApexReady(start);
})();
