# Oracle APEX Page Designer Undo/Redo Counters

**Version:** 24.2.1
**Author:** Matt Mulvaney (@Matt_Mulvaney)  
**Last Updated:** December 2025

> **Experimental Use Only**  
> This script is provided for experimental use only. Use at your own risk.  
> Not supported by Oracle or my employer.

![Preview](img/preview.gif)

**[View script.js](script.js)**

This userscript shows live undo and redo counts in the Oracle APEX Page Designer & Workflow Definition. It mirrors the Page Designer's command history and displays small badge counters next to the Undo and Redo buttons using native `a-Button-badge` styling and APEX theme color utilities.

**Features:**
- Live counts for Undo and Redo operations in Page Designer & Workflow.
- Uses native Page Designer badge styling and theme utility classes.
- Option to hide zero counts or always show them via `SHOW_ZERO` setting.
- Lightweight mirror of `apex.commandHistory` with no server changes.
- Accessible disabled styling on zero counts.

