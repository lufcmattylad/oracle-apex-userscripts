# Oracle APEX Top Level Navigation

**Version:** 26.1.4  
**Author:** Matt Mulvaney (@Matt_Mulvaney)  
**Last Updated:** July 2026

> **Experimental Use Only**  
> This script is provided for experimental use only. Use at your own risk.  
> Not supported by Oracle or my employer.

![Preview](img/preview.png)

**[View script.js](script.js)**

This userscript relocates the left-side black navigation menu introduced in the APEX 26.1 builder (App Builder, SQL Workshop, Data Reporter, Gallery, Search, Administration, Help, Account) to a horizontal bar across the top of the page, restoring a classic top-level navigation layout and reclaiming horizontal space.

**Features:**
- Moves the `.b-Header` sidebar to a full-width sticky bar at the top of the page.
- Uses the builder's own `--ab-header-direction` CSS hook to flip the navigation list horizontally.
- Pushes the Spotlight search and the Administration, Help and Account actions to the right-hand side of the bar, with a divider between the search and the utility icons.
- Injects its CSS at `document-start`, so the menu is at the top from the first paint with no layout flash.
- Optional recolor hooks: set the `--tln-header-background` and/or `--tln-header-foreground` CSS variables (e.g. on `:root` from another userscript or user stylesheet) to change the bar's background and text/icon colors. When unset, the builder's native colors are used.

```css
/* Example: light header with dark text */
:root {
    --tln-header-background: #edeae6;
    --tln-header-foreground: #161513;
}
```

**APEX Version Compatibility:**
- Targets the APEX 26.1+ builder UI. The CSS only matches the 26.1 builder header (`.b-Header`), so it has no effect on earlier versions or regular applications.
