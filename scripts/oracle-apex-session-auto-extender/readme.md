# Oracle APEX Session Auto-Extender

**Version:** 24.2.2  
**Author:** Matt Mulvaney (@Matt_Mulvaney)  
**Last Updated:** August 2025

> **Experimental Use Only**  
> This script is provided for experimental use only. Use at your own risk.  
> Not supported by Oracle or my employer.

![Preview](img/preview.gif)

**[View script.js](script.js)**

This userscript automatically extends your Oracle APEX session before it times out due to inactivity. It fetches the session timeout value and pings the server at a safe interval to keep your session alive.

**Features:**
- Prevents session idle timeouts.
- Customizable extension interval.
- Debug logging for troubleshooting.
- Only runs in the main window (not in modals/iframes).
