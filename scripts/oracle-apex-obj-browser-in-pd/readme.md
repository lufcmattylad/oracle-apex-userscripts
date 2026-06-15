# Oracle APEX Object Browser in Page Designer

**Version:** 26.1.1  
**Author:** Matt Mulvaney (@Matt_Mulvaney)  
**Last Updated:** June 2026

> **Experimental Use Only**  
> This script is provided for experimental use only. Use at your own risk.  
> Not supported by Oracle or my employer.

**[View script.js](script.js)**

This userscript adds an **Object Browser** tab to the right of the **Layout** tab in the Oracle APEX 26.1 Page Designer, so you can browse your schema objects without leaving the page you are editing.

**Features:**
- Adds an "Object Browser" tab next to the Layout tab, with a database icon that appears when the tab bar is too narrow to show labels.
- Shows the SQL Workshop Object Browser directly inside Page Designer, using your current builder session — no separate login required.
- Only loads the Object Browser the first time you click the tab; it stays loaded as you switch between tabs.
- You can drag the tab to reorder it within the editor tab bar, and its position is remembered on reload.
- The Object Browser fills the full height of the editor area and resizes correctly when you drag the column splitter.
- Splitter dragging works correctly even when the cursor passes over the Object Browser panel.
- Only active in Page Designer — has no effect on any other APEX page.

**Requirements:**
- Requires APEX 26.1 or above.
- The Object Browser is embedded using an iframe. If your APEX instance blocks iframe embedding, install a browser extension that removes X-Frame-Options restrictions (e.g. "Ignore X-Frame headers").
