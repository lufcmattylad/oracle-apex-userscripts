// ==UserScript==
// @name         Oracle APEX No Border Attributes
// @run-at       document-idle
// @namespace    https://github.com/lufcmattylad
// @version      26.1.3
// @description  Removes the visible borders added to attributes in APEX 26.1, restoring the borderless look from 24.2. Works across all APEX internal pages (Page Designer, Link Details, etc.)
// @author       Matt Mulvaney - @Matt_Mulvaney
// @match        *://*/ords/*
// @match        *://*/pls/*
// @tag          orclapex
// @grant        GM_addStyle
// @downloadURL  https://raw.githubusercontent.com/lufcmattylad/oracle-apex-userscripts/refs/heads/main/scripts/oracle-apex-no-border-attributes/script.js
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

    GM_addStyle(`
        /* Remove the solid border added in 26.1; restore 24.2 shadow-only appearance */
        .a-Property-field {
            border-style: none !important;
            border-width: 0 !important;
            border-color: transparent !important;
            border-radius: 2px !important;
            box-shadow: 0 1px 2px rgba(0,0,0,.1) !important;
            font-size: 12px !important;
            line-height: 16px !important;
            min-height: 24px !important;
            padding: 4px !important;
        }

        /* Hover keeps the same shadow */
        .a-Property-field:hover {
            box-shadow: 0 1px 2px rgba(0,0,0,.1) !important;
        }

        /* Lift the property group body above its heading so the focus outline
           on the first field isn't painted over by the heading element */
        .a-PropertyEditor-propertyGroup-body:has(.a-Property-field:focus),
        .a-PropertyEditor-propertyGroup-body:has(.a-Property-field:focus-visible) {
            position: relative !important;
            z-index: 1 !important;
        }

        /* Focus: restore 24.2 dotted outline + shadow, no border */
        .a-Property-field:focus,
        .a-Property-field:focus-visible {
            border-color: transparent !important;
            box-shadow: 0 1px 2px rgba(0,0,0,.1) !important;
            outline-color: rgb(14, 114, 149) !important;
            outline-offset: 2px !important;
            outline-style: dotted !important;
            outline-width: 2px !important;
        }

        /* Read-only: no shadow, no border */
        .a-Property-field.a-Property-field--readOnly {
            background-color: transparent !important;
            border-color: transparent !important;
            box-shadow: none !important;
        }

        /* Restore left padding on the filter input so the search icon doesn't overlap the placeholder */
        .a-Property-field--filter {
            padding-left: 32px !important;
        }

        /* Remove border from textarea variant */
        .a-Property-field--textarea {
            border-style: none !important;
            border-width: 0 !important;
        }

        /* Standard APEX form items (non-Page-Designer pages, e.g. Link Details) */
        .apex-item-text,
        .apex-item-number,
        .apex-item-textarea,
        .apex-item-select,
        .apex-item-autocomplete,
        .apex-item-datepicker,
        .apex-item-combobox,
        .apex-item-popup {
            border-style: none !important;
            border-width: 0 !important;
            border-color: transparent !important;
            border-radius: 2px !important;
            box-shadow: 0 1px 2px rgba(0,0,0,.1) !important;
        }

        .apex-item-text:focus,
        .apex-item-number:focus,
        .apex-item-textarea:focus,
        .apex-item-select:focus,
        .apex-item-autocomplete:focus,
        .apex-item-datepicker:focus,
        .apex-item-combobox:focus,
        .apex-item-popup:focus {
            border-color: transparent !important;
            box-shadow: 0 1px 2px rgba(0,0,0,.1) !important;
            outline-color: rgb(14, 114, 149) !important;
            outline-offset: 2px !important;
            outline-style: dotted !important;
            outline-width: 2px !important;
        }

        /* Remove focus-visible border overrides on error/shadow states */
        .a-Property.is-error.is-active .a-Property-field:not(.a-Property-field--textarea):focus-visible,
        .a-Property.is-shadow.is-active .a-Property-field:not(.a-Property-field--textarea):focus-visible {
            border-color: transparent !important;
        }
    `);
})();
