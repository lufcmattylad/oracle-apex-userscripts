// ==UserScript==
// @name         Oracle APEX Session Auto-Extender
// @namespace    https://github.com/lufcmattylad
// @version      24.2.2
// @description  Automatically extends APEX session idle timeout at half the max idle time, or a custom interval
// @author       Matt Mulvaney - @Matt_Mulvaney
// @match        *://*/ords/*
// @match        *://*/pls/*
// @tag          orclapex
// @grant        GM_info
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/lufcmattylad/oracle-apex-userscripts/refs/heads/main/scripts/oracle-apex-session-auto-extender/script.js
// ==/UserScript==

(function() {
    'use strict';

    // Configurable parameters
    const overrideInterval = null; // Set your custom interval here (e.g., 5000 for 5s), or leave as null
    const divisor = 2; // Change this to adjust the fraction of max_idle_time_ms
    const showDebug = false; // Set to true to enable debug logging

    // Use @name from metadata as log prefix
    const LOG_PREFIX = `[${(typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.name) ? GM_info.script.name : 'APEX Session'}]`;

    function debugLog(...args) {
        if (showDebug) {
            console.log(LOG_PREFIX, ...args);
        }
    }

    function debugError(...args) {
        if (showDebug) {
            console.error(LOG_PREFIX, ...args);
        }
    }

    // Only run on top-level pages, not in modals/iframes
    if (window !== window.top) return;

    // Wait for the APEX object to be present
    function waitForApex(callback, maxAttempts = 100, interval = 100) {
        let attempts = 0;
        (function check() {
            if (
                typeof apex !== "undefined" &&
                typeof apex.env !== "undefined" &&
                typeof apex.env.APP_ID !== "undefined" &&
                typeof apex.env.APP_SESSION !== "undefined"
            ) {
                debugLog('apex object found on attempt', (attempts + 1));
                callback();
            } else if (++attempts < maxAttempts) {
                setTimeout(check, interval);
            } else {
                debugError('apex object not found after waiting.');
            }
        })();
    }

    function getServiceName(url = window.location.href) {
        const pathParts = new URL(url).pathname.split('/').filter(Boolean);
        const rIndex = pathParts.indexOf('r');
        return rIndex > 0 ? pathParts.slice(0, rIndex).join('/') : pathParts[0] || null;
    }

    function main() {
        try {
            const serviceName = getServiceName();
            const baseUrl = '/' + serviceName + '/apex_session.emit_timeouts?p_app_id=' + apex.env.APP_ID +
                '&p_session_id=' + apex.env.APP_SESSION;

            fetch(baseUrl)
                .then(response => response.json())
                .then(data => {
                    debugLog('Initial timeouts:', data);

                    // Use overrideInterval if set, otherwise divide max_idle_time_ms by divisor
                    const interval = overrideInterval !== null ? overrideInterval : Math.floor(data.max_idle_time_ms / divisor);
                    debugLog(`Setting auto-extend interval: ${interval} ms (${Math.round(interval/1000)} seconds)`);

                    setInterval(() => {
                        fetch(baseUrl + '&p_reset_idle=Y')
                            .then(response => response.json())
                            .then(data => {
                                console.log(LOG_PREFIX, 'Extended by', GM_info.script.name);
                                debugLog(data);
                            })
                            .catch(error => {
                                debugError('Error extending session:', error);
                            });
                    }, interval);
                })
                .catch(error => {
                    debugError('Error fetching timeouts:', error);
                });
        } catch (e) {
            debugError('Script error:', e);
        }
    }

    // Wait for apex object before running main logic
    waitForApex(main);

})();
