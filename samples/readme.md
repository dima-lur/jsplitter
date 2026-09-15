### Requirements
- "basic" scripts:  
         Should work fine on any system.
- "complete" scripts:  
         Should work fine on any system.
         Most scripts require the installation of FontAwesome (https://github.com/FortAwesome/Font-Awesome/blob/fa-4/fonts/fontawesome-webfont.ttf?raw=true).  
         There are three exceptions:
   - "Listenbrainz":  
              Requires any version of Windows with IE9 or later installed.
   - "Thumbs":  
              Can display existing images on any system but requires Windows with at least IE9 to download new ones.
   - "Last.fm Lover":  
              Doesn't work on WINE. Requires any version of Windows with IE9 or later.
- "d2d":  
         Direct2D-specific samples. Use `window.DrawMode = 1` before creating Direct2D resources.  
- "jsplaylist-mod":  
         Should work on any system.  
         Requires the following fonts:
   - "Guifx v2 Transports.ttf" http://blog.guifx.com/2009/04/02/guifx-v2-transport-font/
   - "wingdings2.ttf"
   - "wingdings3.ttf" (If you have Microsoft Office installed, you should have the wingdings fonts.  
                       If not, you'll have to search for them).
- "js-smooth":  
         Should work on any system.  

### Usage
Simply copy the text from a sample .js file into a panel's configuration dialog.

- "basic":  
         Some very simple samples that are referred to from "js_doc/Interfaces.js" and  
         "Callbacks.js" in the "docs" folder.
- "complete":  
         Feature complete and feature rich samples created by [marc2003](https://github.com/marc2k3/smp_2003).
- "d2d":  
         Direct2D drawing/effect samples. `StrokeStyle.js` demonstrates reusable line caps, joins, dash patterns and outlined shapes with `d2d.StrokeStyle()`.
- "jsplaylist-mod":  
         Br3tt's excellent JSPlaylist (originally written for WSH panel) ported to SMP by marc2003.
- "js-smooth":  
         Br3tt's "JS Smooth Playlist", "JS Smooth Browser" and "JS Smooth Playlist Manager" scripts ported to SMP by marc2003.
- "worker":  
         Worker API samples ordered from introductory to advanced: 01. Basic Messaging, 02. Playlist Statistics, 03. Fractal Renderer, 04. Playlist Album Gallery and 05. Spectrum Analyzer. They are also linked from the Worker API documentation.

### Important
Remember that any future component installation will overwrite all files in this directory so store new files/edits elsewhere.
