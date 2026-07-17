// ==UserScript==
// @name         Oracle APEX Top Level Navigation
// @run-at       document-start
// @namespace    https://github.com/lufcmattylad
// @version      26.1.4
// @description  Relocates the left-side black navigation menu in the APEX 26.1 builder to a horizontal bar across the top of the page.
// @author       Matt Mulvaney - @Matt_Mulvaney
// @match        *://*/ords/*
// @match        *://*/pls/*
// @tag          orclapex
// @grant        GM_addStyle
// @downloadURL  https://raw.githubusercontent.com/lufcmattylad/oracle-apex-userscripts/refs/heads/main/scripts/oracle-apex-top-level-navigation/script.js
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

    /* Injected at document-start so the header renders at the top from the
       first paint. No runtime APEX check: the selectors below only match the
       26.1+ builder UI (.b-Header / #wwvFlowForm), so the CSS is inert on
       every other page. */
    GM_addStyle(`
        /* The header no longer occupies horizontal space; zero the width
           variable some pages (e.g. Page Designer's .b-Content.resize) use
           to reserve a gutter for it */
        body:has(.b-Header) {
            --ab-header-width: 0rem;
        }

        /* Stack the header above the content instead of beside it */
        body:has(.b-Header) #wwvFlowForm {
            grid-template-areas:
                "header"
                "content"
                "footer" !important;
            grid-template-columns: 1fr !important;
            grid-template-rows: auto 1fr auto !important;
        }

        /* Optional recolor hooks: set --tln-header-background and/or
           --tln-header-foreground anywhere above .b-Header to change the
           bar's background and text/icon colors. Unset, they fall back to
           the builder's own --u-surface-header and --u-text-on-primary,
           i.e. the native colors.

           To use, uncomment this block. Alternatively, define the same
           :root block outside this script - e.g. in a Stylus browser
           extension style or a separate userscript via GM_addStyle - so
           your colors survive updates of this script:

           :root {
               --tln-header-background: #44475A;
               --tln-header-foreground: #F8F8F2;
           }
        */
        .b-Header {
            background-color: var(--tln-header-background, var(--u-surface-header)) !important;
            color: var(--tln-header-foreground, var(--u-text-on-primary)) !important;
        }

        /* Lay the header bar out horizontally; the builder exposes
           --ab-header-direction which also flips .b-Header-navList */
        .b-Header {
            --ab-header-direction: row;
            flex-direction: row !important;
            align-items: center !important;
            block-size: auto !important;
            inline-size: auto !important;
            border-inline-end: none !important;
            border-block-end: .0625rem solid var(--u-divider-subtle) !important;
            z-index: 100;
        }

        /* Swap the nav group's horizontal dividers for vertical ones.
           Only a leading divider: the trailing one would sit stranded next
           to the search icon now that search lives on the right */
        .b-Header-nav {
            border-block-width: 0 !important;
            border-inline-color: color-mix(in srgb, currentColor 12%, transparent);
            border-inline-style: solid;
            border-inline-start-width: .0625rem;
            border-inline-end-width: 0;
            padding-block: 0 !important;
            padding-inline: .5rem;
            margin-inline-end: auto !important;
        }

        /* Utilities + account: drop the top divider, push to the far right */
        .b-Header-user,
        .b-Header-utilities {
            border-block-start: none !important;
            margin-block-start: 0 !important;
            padding-block-start: 0 !important;
        }

        .b-Header-utilities {
            flex-direction: row !important;
        }

        /* Move the spotlight search to the right, with a divider between it
           and the utility icons that follow */
        .b-Header-search {
            margin-inline-start: auto !important;
            border-inline-end: .0625rem solid color-mix(in srgb, currentColor 12%, transparent);
            padding-inline-end: .5rem;
        }

        /* Buttons no longer need to fill the sidebar width; trim their
           vertical padding to keep the bar slim */
        .b-Header-action {
            inline-size: auto !important;
            padding-block: .25rem !important;
        }

        /* Slim the bar: tighter vertical padding on the bar and logo */
        .b-Header {
            padding-block: .25rem !important;
        }

        .b-Header-logo {
            padding-block: .25rem !important;
        }
    `);
})();
