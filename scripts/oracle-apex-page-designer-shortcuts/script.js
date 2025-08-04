// ==UserScript==
// @name         Oracle APEX Page Designer Keyboard Shortcuts
// @namespace    https://github.com/lufcmattylad
// @version      24.2.5
// @description  Global keyboard shortcuts for Oracle APEX Page Designer
// @author       Matt Mulvaney - @Matt_Mulvaney
// @match        *://*/ords/*
// @match        *://*/pls/*
// @tag          orclapex
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/lufcmattylad/oracle-apex-userscripts/refs/heads/main/scripts/oracle-apex-page-designer-shortcuts/script.js
// ==/UserScript==

(function() {
    'use strict';

    const shortcuts = [
        { combo: "Ctrl+Alt+R", action: "pd-save-run-page" },
        { combo: "Ctrl+Alt+S", action: "pd-save-page" }
    ];

    function isApexEnvironmentValid() {
        return typeof apex !== 'undefined' &&
            parseInt(apex.env.APP_ID, 10) >= 3000 &&
            parseInt(apex.env.APP_ID, 10) <= 8999;
    }

    function handleShortcut(action, event) {
        if (apex.actions && apex.actions.invoke) {
            // Pass both event and focusElement parameters required by APEX
            const focusElement = document.activeElement;
            apex.actions.invoke(action, event, focusElement);
        }
    }

    const XYZPageDesignerShortcuts = {
        initialize: function() {
            document.addEventListener('keydown', (e) => {
                if (!isApexEnvironmentValid()) return;

                // Build the pressed combination string
                const modifiers = [];
                if (e.ctrlKey) modifiers.push('Ctrl');
                if (e.altKey) modifiers.push('Alt');
                if (e.shiftKey) modifiers.push('Shift');
                const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;

                const pressedCombo = [...modifiers, key].join('+');

                shortcuts.forEach(({combo, action}) => {
                    if (pressedCombo === combo) {
                        e.preventDefault();
                        e.stopPropagation();
                        handleShortcut(action, e);
                    }
                });
            });
        }
    };

    // Initialize after APEX is fully loaded
    if (document.querySelector('#apex') || window.apex) {
        XYZPageDesignerShortcuts.initialize();
    } else {
        document.addEventListener('apexready', XYZPageDesignerShortcuts.initialize);
    }
})();
