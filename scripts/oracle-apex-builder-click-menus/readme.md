# Oracle APEX Builder Click Menus

**Version:** 26.1.1  
**Author:** Matt Mulvaney (@Matt_Mulvaney)  
**Last Updated:** June 2026

> **Experimental Use Only**  
> This script is provided for experimental use only. Use at your own risk.  
> Not supported by Oracle or my employer.

![Preview](img/preview.png)

**[View script.js](script.js)**

In the APEX 26.1 builder navigation, the App Builder and SQL Workshop entries open their menus on hover and navigate on click. This userscript converts them to click-to-open menus, behaving exactly like the Administration button.

**Features:**
- App Builder and SQL Workshop menus open on click instead of hover.
- The original links stay accessible: an "Open App Builder" / "Open SQL Workshop" item is added as the first entry of each menu.
- Ctrl+click, Shift+click and middle-click still follow the original link natively (e.g. open in a new tab).
- Falls back to plain navigation if the APEX menu widget is unavailable.
- Only active on APEX internal builder applications (App IDs 3000–8999).

**APEX Version Compatibility:**
- Requires APEX 26.1 or above (checked at runtime via `apex.env.APEX_VERSION`).
