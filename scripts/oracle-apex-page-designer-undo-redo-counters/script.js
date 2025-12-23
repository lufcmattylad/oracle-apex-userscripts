// ==UserScript==
// @name         Oracle APEX Page Designer Undo/Redo Counters
// @namespace    https://github.com/lufcmattylad
// @version      24.2.1
// @description  Show live undo/redo counts next to Page Designer toolbar buttons using native a-Button-badge styling
// @author       Matt Mulvaney - @Matt_Mulvaney
// @match        *://*/ords/*
// @match        *://*/pls/*
// @tag          orclapex
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/lufcmattylad/oracle-apex-userscripts/refs/heads/main/scripts/oracle-apex-page-designer-undo-redo-counters/script.js
// ==/UserScript==

(function() {
    'use strict';

     /**
     * DISCLAIMER:
     * This code is unofficial and is not supported by Oracle APEX.
     * It is provided "as is" without warranty of any kind, either express or implied.
     * Use of this code is at your own risk. The authors and distributors accept no responsibility
     * for any consequences arising from its use.
     */

    /* ===== USER SETTINGS ===== */
    const SETTINGS = {
        // Universal Theme color utility class applied on top of a-Button-badge:
        //   'u-info', 'u-warning', 'u-danger', 'u-hot', 'u-success', etc.
        BADGE_COLOR_CLASS: 'u-color-30',

        // true  = show badge even when counter is zero
        // false = hide badge when counter is zero
        SHOW_ZERO: true
    };
    /* ========================= */

    function isApexEnvironmentValid() {
        return typeof apex !== 'undefined' &&
            apex.env &&
            apex.env.APP_ID &&
            parseInt(apex.env.APP_ID, 10) >= 3000 &&
            parseInt(apex.env.APP_ID, 10) <= 8999 &&
            document.body.classList.contains('apex-page-designer');
    }

    function createBadgeElement() {
        const span = document.createElement('span');
        // Native Page Designer badge styling
        span.classList.add('a-Button-badge', 'pd-history-badge');
        if (SETTINGS.BADGE_COLOR_CLASS) {
            span.classList.add(SETTINGS.BADGE_COLOR_CLASS);
        }
        span.textContent = '0';
        return span;
    }

    function OracleApexPageDesignerUndoRedoCounters() {
        const ch = apex.commandHistory;
        if (!ch || !apex.jQuery) {
            return;
        }

        const $ = apex.jQuery;

        const mirror = {
            total: 0,
            position: -1
        };

        const $undoBtn = $('#button-undo');
        const $redoBtn = $('#button-redo');
        let $undoBadge;
        let $redoBadge;

        function ensureBadges() {
            if ($undoBtn.length && !$undoBadge) {
                $undoBadge = $(createBadgeElement())
                    .addClass('pd-history-badge--undo');
                $undoBtn.append($undoBadge);
            }
            if ($redoBtn.length && !$redoBadge) {
                $redoBadge = $(createBadgeElement())
                    .addClass('pd-history-badge--redo');
                $redoBtn.append($redoBadge);
            }
        }

        function updateBadges() {
            ensureBadges();

            const undoCount = Math.max(0, mirror.position + 1);
            const redoCount = Math.max(0, mirror.total - mirror.position - 1);

            if ($undoBadge) {
                $undoBadge.text(undoCount);
                $undoBadge.toggleClass('is-disabled', undoCount === 0);

                if (!SETTINGS.SHOW_ZERO && undoCount === 0) {
                    $undoBadge.addClass('u-VisuallyHidden');
                } else {
                    $undoBadge.removeClass('u-VisuallyHidden');
                }
            }
            if ($redoBadge) {
                $redoBadge.text(redoCount);
                $redoBadge.toggleClass('is-disabled', redoCount === 0);

                if (!SETTINGS.SHOW_ZERO && redoCount === 0) {
                    $redoBadge.addClass('u-VisuallyHidden');
                } else {
                    $redoBadge.removeClass('u-VisuallyHidden');
                }
            }
        }

        function logState() {
            updateBadges();
        }

        const origExecute = ch.execute;
        const origUndo = ch.undo;
        const origRedo = ch.redo;

        ch.execute = function(cmd) {
            origExecute.call(ch, cmd);

            mirror.position++;
            if (mirror.position < mirror.total) {
                mirror.total = mirror.position + 1;
            } else {
                mirror.total++;
            }

            logState();
        };

        ch.undo = function() {
            const couldUndo = ch.canUndo();
            origUndo.call(ch);

            if (couldUndo) {
                mirror.position = Math.max(-1, mirror.position - 1);
            }
            logState();
        };

        ch.redo = function() {
            const couldRedo = ch.canRedo();
            origRedo.call(ch);

            if (couldRedo) {
                mirror.position = Math.min(mirror.total - 1, mirror.position + 1);
            }
            logState();
        };

        $(document).on('commandHistoryChange.pdHistoryMirror', function() {
            if (!ch.canUndo() && !ch.canRedo()) {
                mirror.position = -1;
                mirror.total = 0;
            }
            logState();
        });

        $(function() {
            ensureBadges();
            updateBadges();
        });

        window.pdHistoryMirror = mirror;
    }

    function initializeWhenReady() {
        if (!isApexEnvironmentValid()) {
            return;
        }

        try {
            OracleApexPageDesignerUndoRedoCounters();
        } catch (e) {
            // Silent fail for unexpected APEX changes
        }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initializeWhenReady();
    } else {
        document.addEventListener('DOMContentLoaded', initializeWhenReady);
    }

    if (window.apex) {
        document.addEventListener('apexready', initializeWhenReady);
    }
})();
