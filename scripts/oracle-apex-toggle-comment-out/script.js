// ==UserScript==
// @name         Oracle APEX Page Designer Toggle Comment Out
// @run-at       document-idle
// @namespace    https://github.com/lufcmattylad
// @version      26.1.1
// @description  Adds a keyboard shortcut to toggle the "Comment Out" build option for selected components in Oracle APEX Page Designer.
// @author       Matt Mulvaney - @Matt_Mulvaney
// @match        *://*/ords/*
// @match        *://*/pls/*
// @tag          orclapex
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/lufcmattylad/oracle-apex-userscripts/refs/heads/main/scripts/oracle-apex-toggle-comment-out/script.js
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

    // Keyboard shortcut for toggling "Comment Out" (Ctrl+Shift+/)
    const kbCommentToggle = 'Ctrl+Shift+/';

    /**
     * Checks if the script is running in the correct Oracle APEX environment.
     * Specifically, it verifies that the global 'apex' object exists and that
     * the current app and page IDs match the Page Designer (App 4000, Page 4500).
     * @returns {boolean} True if the environment is valid, false otherwise.
     */
    function isApexEnvironmentValid() {
        return typeof apex !== 'undefined' &&
            parseInt(apex.env.APP_ID, 10) == 4000 &&
            parseInt(apex.env.APP_PAGE_ID, 10) == 4500;
    }

    /**
     * Waits for APEX shortcuts to stabilize before registering custom shortcuts.
     * This prevents the custom shortcut from being overwritten by APEX's initialization process.
     * @param {Function} callback - Function to call once shortcuts have stabilized
     * @param {number} maxAttempts - Maximum number of attempts to check stability (default: 20)
     */
    function waitForShortcutsToStabilize(callback, maxAttempts = 20) {
        let attempts = 0;
        let lastCount = 0;

        const checkStability = () => {
            // Only proceed if we're in a valid APEX environment
            if (!isApexEnvironmentValid()) {
                return;
            }

            const currentCount = apex.actions.listShortcuts().length;

            if (currentCount === lastCount && currentCount > 0) {
                // Count has stabilized (APEX 26.1 has ~24 shortcuts, older versions had 30+)
                callback();
            } else if (attempts < maxAttempts) {
                lastCount = currentCount;
                attempts++;
                setTimeout(checkStability, 500);
            } else {
                callback();
            }
        };

        checkStability();
    }

    /**
     * Object containing initialization logic for the Page Designer shortcut.
     * Adds a custom action and keyboard shortcut to toggle the "Comment Out" build option.
     */
    const XYZPageDesignerShortcutsx = {
        /**
         * Initializes the shortcut and action once when the script loads.
         * Only activates if the environment is valid (Page Designer open).
         */
        initialize: function() {
            if (!isApexEnvironmentValid()) {
                return;
            }

            // Register the custom action to toggle the "Comment Out" build option
            apex.actions.add({
                name: "xyz-toggle-comment-out",
                label: "Toggle Comment Out",
                /**
                 * Toggles the "Comment Out" build option for all selected components in the visible tree.
                 * This function:
                 * 1. Identifies the visible Page Designer tree.
                 * 2. Retrieves all selected nodes.
                 * 3. Resolves the corresponding component objects.
                 * 4. Toggles their build option between normal and "Comment Out".
                 */
                action: function xyzToggleCommentOut() {
                    // CSS selectors for all possible Page Designer tree containers
                    const treeSelectors = [
                        '#PDrenderingTree:visible',
                        '#PDdynamicActionTree:visible',
                        '#PDprocessingTree:visible',
                        '#PDsharedCompTree:visible'
                    ];

                    // Use apex.jQuery (not the global $) so that jQuery widget data lookups
                    // hit the same store where APEX initialised the treeView widget.
                    const jq = apex.jQuery;

                    // #PDrenderingTree etc. are themselves the .a-TreeView widget elements.
                    const pTree$ = jq(treeSelectors.join(', '));
                    if (!pTree$.length) return; // Exit if no tree is visible

                    // APEX 26.1+ stores the widget instance under 'apexDesignerTree'.
                    // Older versions (24.2) used the standard jQuery UI key 'apex-treeView'
                    // accessed via the .treeView() plugin. Try the new key first, fall back
                    // to the old plugin call so both versions are supported.
                    const treeWidget = pTree$.data('apexDesignerTree');
                    const selectedNodes = treeWidget
                        ? treeWidget.getSelectedNodes()         // APEX 26.1+
                        : pTree$.treeView("getSelectedNodes");  // APEX 24.2
                    if (!selectedNodes?.length) return; // Exit if nothing is selected

                    /**
                     * Helper to retrieve the component object for a given tree node.
                     * Supports both APEX 26.1+ flat node structure (node.typeId) and
                     * older nested structure (node.data.typeId).
                     * @param {Object} node - The selected tree node.
                     * @returns {Object|null} The component object or null if not found.
                     */
                    const getComponent = (node) => {
                        try {
                            // Support both APEX 26.1+ (flat: node.typeId) and older (nested: node.data.typeId)
                            const typeId = node?.typeId ?? node?.data?.typeId;
                            const componentId = node?.componentId ?? node?.data?.componentId;

                            if (!typeId || !componentId) {
                                return null;
                            }

                            // Retrieve component(s) by type and ID
                            const components = window.pe?.getComponents(
                                typeId,
                                { id: componentId }
                            );

                            // Return the component if exactly one is found
                            return components?.length === 1 ? components[0] : null;
                        } catch (error) {
                            console.warn('Error retrieving component:', error);
                            return null;
                        }
                    };

                    /**
                     * Toggles the build option property for all valid components.
                     * If the component is already commented out, it is restored; otherwise, it is commented out.
                     * Uses a transaction for batch updates and command history for undo/redo.
                     * @param {Array} components - Array of component objects to update.
                     */
                    const toggleBuildOption = (components) => {
                        if (!components?.length) return;

                        // Filter components that support the BUILD_OPTION property
                        const validComponents = components.filter(comp =>
                            comp?.getProperty?.(window.pe.PROP.BUILD_OPTION)
                        );

                        if (!validComponents.length) return;

                        try {
                            // Create a human-readable message for the transaction
                            let actionText;

                            if (validComponents.length === 1) {
                                // Single component: include the component name
                                const componentName = validComponents[0].getDisplayTitle();
                                actionText = `Toggle Comment Out for ${componentName}`;
                            } else {
                                // Multiple components: use generic description
                                const componentType = validComponents[0].typeId;
                                const componentTypeName = window.model?.getComponentType?.(componentType)?.title?.singular || 'Component';
                                actionText = `Toggle Comment Out for ${validComponents.length} ${componentTypeName}s`;
                            }

                            // Start the transaction with human-readable message
                            const lTransaction = window.pe.transaction.start("", actionText);

                            // Toggle the build option for each component
                            validComponents.forEach(component => {
                                const property = component.getProperty(window.pe.PROP.BUILD_OPTION);
                                const currentValue = property.getValue();

                                // Switch between "Comment Out" and normal state
                                const newValue = currentValue === pageDesigner.COMMENTED_OUT_ID
                                    ? ""
                                    : pageDesigner.COMMENTED_OUT_ID;

                                property.setValue(newValue);
                            });

                            // Commit the transaction to support undo/redo
                            apex.commandHistory.execute(lTransaction);
                        } catch (error) {
                            console.error('Error toggling build options:', error);
                        }
                    };

                    // Collect all valid component objects from selected nodes
                    const components = selectedNodes
                        .map(node => getComponent(node))
                        .filter(Boolean);

                    toggleBuildOption(components);
                }
            });

            // Register the keyboard shortcut for the action
            apex.actions.addShortcut(kbCommentToggle, "xyz-toggle-comment-out");
        }
    };

    // Initialize the shortcut after APEX is loaded and shortcuts have stabilized.
    if (document.querySelector('#apex') || window.apex) {
        waitForShortcutsToStabilize(() => {
            XYZPageDesignerShortcutsx.initialize();
        });
    } else {
        document.addEventListener('theme42ready', () => {
            waitForShortcutsToStabilize(() => {
                XYZPageDesignerShortcutsx.initialize();
            });
        });
    }
})();
