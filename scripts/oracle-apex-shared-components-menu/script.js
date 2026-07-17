// ==UserScript==
// @name         Oracle APEX Shared Components Menu
// @run-at       document-idle
// @namespace    https://github.com/lufcmattylad
// @version      26.1.2
// @description  Converts the Shared Components button in the APEX 26.1 builder toolbar into a drop-down menu with direct links to every Shared Components section.
// @author       Matt Mulvaney - @Matt_Mulvaney
// @match        *://*/ords/*
// @match        *://*/pls/*
// @tag          orclapex
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/lufcmattylad/oracle-apex-userscripts/refs/heads/main/scripts/oracle-apex-shared-components-menu/script.js
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

    function isApexBuilderValid() {
        if (typeof apex === 'undefined') return false;
        const appId = parseInt(apex.env.APP_ID, 10);
        if (appId < 3000 || appId > 8999) return false;
        const version = apex.env.APEX_VERSION || '';
        const major = parseInt(version.split('.')[0], 10);
        const minor = parseInt(version.split('.')[1], 10);
        return major > 26 || (major === 26 && minor >= 1);
    }

    const MENU_ID = 'apex-scm-menu';

    // Set to false to restore the old behaviour: a single flat list of
    // actions separated by disabled heading rows.
    const USE_SUBMENUS = true;

    function buildUrl(path, params) {
        const base = location.origin + '/ords/r/apex/app-builder/' + path;
        return base + '?' + (params ? params + '&' : '') + 'session=' + encodeURIComponent(apex.env.APP_SESSION);
    }

    // Attempt to discover the ID of the application being edited in Page Designer.
    // Used for the two app-scoped pages (Security Attributes, Globalization Attributes).
    function getEditedFlowId() {
        if (typeof gFlowId !== 'undefined' && gFlowId) return String(gFlowId);
        const params = new URLSearchParams(location.search);
        const fromParams = params.get('fb_flow_id') || params.get('app_id');
        if (fromParams) return fromParams;
        const el = document.querySelector('input[name="pFlowId"]');
        if (el && el.value) return el.value;
        return '';
    }

    function buildMenuGroups() {
        const fid = getEditedFlowId();
        const fidPfx = fid ? 'fb_flow_id=' + fid + '&' : '';

        return [
            {
                heading: 'Application Logic', icon: 'icon-sc-logic',
                items: [
                    { type: 'action', label: 'Application Definition', href: buildUrl('edit-application-definition') },
                    { type: 'action', label: 'Application Items', href: buildUrl('application-items') },
                    { type: 'action', label: 'Application Processes', href: buildUrl('application-processes') },
                    { type: 'action', label: 'Application Computations', href: buildUrl('application-computations') },
                    { type: 'action', label: 'Application Settings', href: buildUrl('application-settings') },
                    { type: 'action', label: 'Build Options', href: buildUrl('build-options') },
                ],
            },
            {
                heading: 'Security', icon: 'icon-util-security-profiles',
                items: [
                    { type: 'action', label: 'Security Attributes', href: buildUrl('edit-security-attributes', fidPfx + (fid ? '509_fb_upd_id=' + fid + '&' : '') + 'clear=509') },
                    { type: 'action', label: 'Authentication Schemes', href: buildUrl('authentication-schemes') },
                    { type: 'action', label: 'Authorization Schemes', href: buildUrl('authorization-schemes') },
                    { type: 'action', label: 'Application Access Control', href: buildUrl('application-access-control', 'clear=RP,2300') },
                    { type: 'action', label: 'Session State Protection', href: buildUrl('session-state-protection') },
                ],
            },
            {
                heading: 'Other Components', icon: 'icon-util-shared-components',
                items: [
                    { type: 'action', label: 'Lists of Values', href: buildUrl('lists-of-values') },
                    { type: 'action', label: 'Plug-ins', href: buildUrl('plug-ins', 'clear=RP') },
                    { type: 'action', label: 'Component Settings', href: buildUrl('component-settings', 'clear=RP') },
                    { type: 'action', label: 'Shortcuts', href: buildUrl('shortcuts') },
                    { type: 'action', label: 'Component Groups', href: buildUrl('component-groups') },
                    { type: 'action', label: 'Data Load Definitions', href: buildUrl('data-load-definitions') },
                ],
            },
            {
                heading: 'Navigation and Search', icon: 'icon-sc-nav',
                items: [
                    { type: 'action', label: 'Lists', href: buildUrl('lists', 'clear=RIR') },
                    { type: 'action', label: 'Navigation Menu', href: buildUrl('lists', 'ir_is_navmenu=1&clear=RIR') },
                    { type: 'action', label: 'Breadcrumbs', href: buildUrl('breadcrumbs') },
                    { type: 'action', label: 'Navigation Bar List', href: buildUrl('lists', 'ir_is_navbar=1&clear=RIR') },
                    { type: 'action', label: 'Search Configurations', href: buildUrl('search-configuration') },
                ],
            },
            {
                heading: 'User Interface', icon: 'icon-sc-ui',
                items: [
                    { type: 'action', label: 'User Interface Attributes', href: buildUrl('edit-user-interface') },
                    { type: 'action', label: 'Progressive Web App', href: buildUrl('edit-progressive-web-app') },
                    { type: 'action', label: 'Themes', href: buildUrl('themes') },
                    { type: 'action', label: 'Templates', href: buildUrl('templates') },
                    { type: 'action', label: 'Email Templates', href: buildUrl('email-templates') },
                    { type: 'action', label: 'Map Backgrounds', href: buildUrl('map-backgrounds') },
                ],
            },
            {
                heading: 'Files and Reports', icon: 'icon-sc-files',
                items: [
                    { type: 'action', label: 'Static Application Files', href: buildUrl('static-application-files') },
                    { type: 'action', label: 'Static Workspace Files', href: buildUrl('static-workspace-files', 'clear=RP') },
                    { type: 'action', label: 'Report Layouts', href: buildUrl('report-layouts') },
                    { type: 'action', label: 'Report Queries', href: buildUrl('report-queries') },
                ],
            },
            {
                heading: 'Data Sources', icon: 'icon-util-webservice',
                items: [
                    { type: 'action', label: 'REST Data Sources', href: buildUrl('rest-data-sources') },
                    { type: 'action', label: 'JSON Duality Views', href: buildUrl('document-sources', 'p7100_source_type=DUALITY_VIEW&clear=7100') },
                    { type: 'action', label: 'JSON Sources', href: buildUrl('document-sources', 'p7100_source_type=JSON_TABLE&clear=7100') },
                ],
            },
            {
                heading: 'Workflows and Automations', icon: 'icon-sc-tree',
                items: [
                    { type: 'action', label: 'Task Definitions', href: buildUrl('task-definitions') },
                    { type: 'action', label: 'Automations', href: buildUrl('automations') },
                    { type: 'action', label: 'Workflows', href: buildUrl('workflows') },
                ],
            },
            {
                heading: 'Globalization', icon: 'icon-sc-globalization',
                items: [
                    { type: 'action', label: 'Globalization Attributes', href: buildUrl('edit-globalization-attributes', fidPfx + 'clear=506') },
                    { type: 'action', label: 'Text Messages', href: buildUrl('text-messages') },
                    { type: 'action', label: 'Application Translations', href: buildUrl('translate-application') },
                ],
            },
            {
                heading: 'Generative AI', icon: 'icon-sc-ai',
                items: [
                    { type: 'action', label: 'AI Attributes', href: buildUrl('edit-ai') },
                    { type: 'action', label: 'AI Agents', href: buildUrl('gen-ai-agents') },
                    { type: 'action', label: 'AI Services', href: buildUrl('generative-ai-services') },
                ],
            },
        ];
    }

    function buildMenuItems() {
        const groups = buildMenuGroups();
        const openItem = { type: 'action', label: 'Open Shared Components', href: buildUrl('shared-components'), icon: 'icon-shared-components' };

        if (USE_SUBMENUS) {
            return [
                openItem,
                { type: 'separator' },
                ...groups.map(group => ({
                    type: 'subMenu',
                    label: group.heading,
                    icon: group.icon,
                    menu: { items: group.items },
                })),
            ];
        }

        const items = [openItem, { type: 'separator' }];
        groups.forEach(group => {
            items.push({ type: 'action', label: group.heading, icon: group.icon });
            items.push(...group.items);
            items.push({ type: 'separator' });
        });
        items.pop();
        return items;
    }

    function ensureMenu($) {
        let $menu = $('#' + MENU_ID);
        if ($menu.length && $menu.data('apex-menu')) return $menu;
        if ($menu.length) $menu.remove();

        $menu = $('<div>').attr('id', MENU_ID).appendTo(document.body);
        $menu.menu({ items: [] });
        return $menu.data('apex-menu') ? $menu : ($menu.remove(), null);
    }

    function bindButton($) {
        const button = document.querySelector('.a-ControlBar button[aria-label="Shared Components"]');
        if (!button || button.dataset.scmBound) return !!button;
        button.dataset.scmBound = '1';

        button.setAttribute('aria-haspopup', 'menu');
        button.setAttribute('aria-expanded', 'false');

        let $menu = null;

        button.addEventListener('click', function (event) {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;

            if (!$menu) {
                $menu = ensureMenu($);
                if ($menu) {
                    $menu.on('menuafterclose', function () {
                        button.setAttribute('aria-expanded', 'false');
                    });
                }
            }
            if (!$menu) return;

            event.stopPropagation();
            event.preventDefault();

            $menu.menu('option', 'items', buildMenuItems());
            const rect = button.getBoundingClientRect();
            $menu.menu('toggle', rect.left, rect.bottom);
            button.setAttribute('aria-expanded', 'true');
        }, true);

        return true;
    }

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
        if (!isApexBuilderValid()) return;

        const $ = apex.jQuery;

        if (bindButton($)) return;

        let attempts = 0;
        const timer = setInterval(function () {
            if (bindButton($) || ++attempts > 80) {
                clearInterval(timer);
            }
        }, 250);
    }

    whenApexReady(start);
})();
