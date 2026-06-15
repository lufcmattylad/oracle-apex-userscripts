# Oracle APEX Page Designer Undo/Redo Counters

**Version:** 26.1.1  
**Author:** Matt Mulvaney (@Matt_Mulvaney)  
**Last Updated:** June 2026

> **Experimental Use Only**  
> This script is provided for experimental use only. Use at your own risk.  
> Not supported by Oracle or my employer.

![Preview](img/preview.gif)

**[View script.js](script.js)**

This userscript shows live undo and redo counts next to the Undo and Redo buttons in the Oracle APEX Page Designer toolbar.

**Features:**
- Displays a small counter badge on each button, updated in real time as you make, undo, and redo changes.
- Uses APEX's native badge size and neutral palette (`var(--u-overlay-active)`) — the same colors used by the Shared Components badge counts. Adapts automatically to light and dark themes.
- Badges fade when the count is zero; they can be hidden entirely at zero via the `SHOW_ZERO` setting.
- No server changes — mirrors `apex.commandHistory` locally.

