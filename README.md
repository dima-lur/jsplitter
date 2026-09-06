# JSplitter

This is a plugin for the **foobar2000** audio player. It provides a panel that combines the functionality of a splitter — a container for panels from other plugins — and a JavaScript host.

**API Documentation:** https://dima-lur.github.io/jsplitter/

## Features

### 1. MDI-style panel management

Panels can be added to the splitter in any order and manipulated like regular Windows windows:

- move
- resize
- minimize
- maximize
- close

This means that when working with the plugin, **foobar2000** becomes an application with an **MDI** — Multi Document Interface — style interface.

For precise panel positioning, coordinates are displayed and can be edited on the fly directly in the panel window title. This is useful when designing the assembly interface.

You can also customize the colors and font of the panel window titles.

The splitter functionality works in both **DUI** and **CUI**.

### 2. Layout editing support

Layout editing is supported in both **DUI** and **CUI** using the traditional method.

Panel placement in the splitter is also supported via the standard **Columns UI placer**.

### 3. Spider Monkey Panel-based script host

The script host is based on **[Spider Monkey Panel](https://github.com/theqwertiest/foo_spider_monkey_panel)** and therefore includes all features of that panel, plus additional splitter-related API extensions.

### 4. Script-based panel management

Panel management in the splitter is supported via scripts.

Panels can be controlled programmatically, including:

- moving
- hiding
- resizing

### 5. Button API

A special API is available for quickly creating buttons in the root panel and handling their click events.

### 6. GDI+ and Direct2D support

The panel supports two drawing engines: GDI+ and Direct2D. This can be switched with one line of code (as the first line of script):

```js
window.DrawMode = 1; // 0 - GDI+ by default
````
## Note about versions

Since the latest **ESR** — Extended Support Release — version of the SpiderMonkey JavaScript engine that supports **Windows 7** is **102.15.1esr**, I decided to fork the main version of JSplitter and create a separate **3.x** branch from it.

All changes made to the latest version of JSplitter, except for the JavaScript engine, will also be added to the **3.x** branch.

The only difference between the **4.x** and **3.x** branches is the JavaScript engine:

| Branch | JavaScript engine |
|---|---|
| `4.x` | Uses the latest ESR version |
| `3.x` | Always uses SpiderMonkey `102.15.1esr` |

## Important note

The **3.x** branch is currently the most stable version of JSplitter, as its interaction with the engine version has been extensively tested by numerous users.

The **4.x** branch is a fresh Java Script engine rolling release. Updates are released fairly regularly based on bugs found by me or users, although these same changes are also included in the **3.x** branch.
