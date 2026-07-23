// ==UserScript==
// @name         Oracle APEX Layout View Colors
// @run-at       document-start
// @namespace    https://github.com/lufcmattylad
// @version      26.2.1
// @description  Ports APEX 24.2's Page Designer Layout view drag-and-drop colors onto APEX 26.1, since 26.1's own colors are all flat, uniform amber and don't distinguish valid drop targets, the actual drop placeholder, and the hovered slot from each other. Requires APEX 26.1+.
// @author       Matt Mulvaney - @Matt_Mulvaney
// @match        *://*/ords/*
// @match        *://*/pls/*
// @tag          orclapex
// @grant        GM_addStyle
// @downloadURL  https://raw.githubusercontent.com/lufcmattylad/oracle-apex-userscripts/refs/heads/main/scripts/oracle-apex-layout-view-colors/script.js
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

    GM_addStyle(`
        .a-GridLayout-buttons.is-active,
        .a-GridLayout-items.is-active,
        .a-GridLayout-regions.is-active {
            background-color: rgb(255, 248, 227) !important;
        }

        .a-GridLayout-grid.is-active td {
            border-color: rgb(255, 235, 176) !important;
        }

        .a-GridLayout-placeholder {
            background-color: rgb(252, 227, 163) !important;
        }

        .a-GridLayout-buttonContainer:hover,
        .a-GridLayout-itemContainer:hover,
        .a-GridLayout-regionContainer:hover,
        .a-GridLayout-regionContent:hover {
            border-color: rgba(16, 15, 14, .2) !important;
        }

        .a-GridLayout-region .a-GridLayout-buttonContainer:hover,
        .a-GridLayout-region .a-GridLayout-itemContainer:hover,
        .a-GridLayout-region .a-GridLayout-regionContainer:hover,
        .a-GridLayout-region .a-GridLayout-regionContent:hover {
            background-color: rgba(254, 237, 195, .3) !important;
            box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .05) !important;
        }
    `);
})();
