/**
 * Object returned by {@link utils.ParseHtml}<br>
 *<br>
 * Lightweight DOM-like HTML document backed by the native HTML parser.<br>
 *<br>
 * Notes:<br>
 * - This is not a full browser DOM.<br>
 * - Scripts, CSS, layout, external resources and browser events are not processed.<br>
 * - {@link HtmlDocument#innerText innerText} is currently an alias of {@link HtmlDocument#textContent textContent}.<br>
 *
 * @hideconstructor
 * @worker
 */
class HtmlDocument {
    /**
     * Root document element, usually the &lt;html&gt; element.<br>
     * Alias of {@link HtmlDocument#documentElement documentElement}.
     *
     * @type {?HtmlNode}
     * @readonly
     *
     * @example
     * let doc = utils.ParseHtml("<html><body>Hello</body></html>");
     * if (doc) console.log(doc.root.tagName); // "html"
     * @worker
     */
    root = undefined; // (read)

    /**
     * Root document element, usually the &lt;html&gt; element.
     *
     * @type {?HtmlNode}
     * @readonly
     *
     * @example
     * let doc = utils.ParseHtml("<html><body>Hello</body></html>");
     * if (doc) console.log(doc.documentElement.tagName); // "html"
     * @worker
     */
    documentElement = undefined; // (read)

    /**
     * The document &lt;head&gt; element.
     *
     * @type {?HtmlNode}
     * @readonly
     *
     * @example
     * let doc = utils.ParseHtml("<html><head><title>Test</title></head></html>");
     * if (doc && doc.head) console.log(doc.head.innerHTML); // "<title>Test</title>"
     * @worker
     */
    head = undefined; // (read)

    /**
     * The document &lt;body&gt; element.
     *
     * @type {?HtmlNode}
     * @readonly
     *
     * @example
     * let doc = utils.ParseHtml("<html><body><p>Hello</p></body></html>");
     * if (doc && doc.body) console.log(doc.body.innerHTML); // "<p>Hello</p>"
     * @worker
     */
    body = undefined; // (read)

    /**
     * Text content of the document body.<br>
     * If the document has no body, this falls back to the root element text.<br>
     * Whitespace is returned as it exists in the parsed text nodes.
     *
     * @type {string}
     * @readonly
     *
     * @example
     * let doc = utils.ParseHtml("<html><body><p>Hello <b>world</b></p></body></html>");
     * if (doc) console.log(doc.textContent); // "Hello world"
     * @worker
     */
    textContent = undefined; // (read)

    /**
     * Alias of {@link HtmlDocument#textContent textContent}.<br>
     * Since this parser has no browser layout engine, {@link HtmlDocument#innerText innerText} does not emulate CSS visibility, rendered line wrapping, or layout-dependent text extraction.
     *
     * @type {string}
     * @readonly
     * @worker
     */
    innerText = undefined; // (read)

    /**
     * Serialized HTML markup inside the document body.<br>
     * If the document has no body, this falls back to the root element.
     *
     * @type {string}
     * @readonly
     *
     * @example
     * let doc = utils.ParseHtml("<html><body><p>Hello <b>world</b></p></body></html>");
     * if (doc) console.log(doc.innerHTML); // "<p>Hello <b>world</b></p>"
     * @worker
     */
    innerHTML = undefined; // (read)

    /**
     * Serialized outer HTML of the root element.
     *
     * @type {string}
     * @readonly
     *
     * @example
     * let doc = utils.ParseHtml("<html><body><p>Hello</p></body></html>");
     * if (doc) console.log(doc.outerHTML); // "<html><head></head><body><p>Hello</p></body></html>"
     * @worker
     */
    outerHTML = undefined; // (read)

    /**
     * Returns the first element matching a CSS selector.
     * 
     * @method
     * @param {string} selector CSS selector.
     * @return {?HtmlNode} First matching node, or <b>null</b> if nothing matches.
     *
     * @example
     * let doc = utils.ParseHtml("<html><body><p class='name'>Test Artist</p></body></html>");
     * let node = doc ? doc.querySelector(".name") : null;
     * if (node) console.log(node.textContent); // "Test Artist"
     * @worker
     */
    querySelector = function (selector) { }; //

    /**
     * Returns all elements matching a CSS selector.<br>
     * The returned value is a regular JavaScript array.
     *
     * @method
     * @param {string} selector CSS selector.
     * @return {Array<HtmlNode>} Array of matching nodes. Empty array if nothing matches.
     *
     * @example
     * let doc = utils.ParseHtml("<ul><li class='album'>A</li><li class='album'>B</li></ul>");
     * let albums = doc ? doc.querySelectorAll(".album") : [];
     * console.log(albums.length); // 2
     * @worker
     */
    querySelectorAll = function (selector) { }; //

    /**
     * Returns all descendant elements with the specified tag name.<br>
     * Use "*" to return all descendant elements.
     * 
     * @method
     * @param {string} tagName Tag name, for example "a", "div", "section" or "*".
     * @return {Array<HtmlNode>} Array of matching nodes. Empty array if nothing matches.
     *
     * @example
     * const doc = utils.ParseHtml("<p><a href='https://example.com'>Link</a></p>");
     * const links = doc ? doc.getElementsByTagName("a") : [];
     * console.log(links.length); // 1
     * @worker
     */
    getElementsByTagName = function (tagName) { }; //
}

/**
 * Lightweight DOM-like HTML node.<br>
 *<br>
 * {@link HtmlNode HtmlNode} can represent an element node, text node, comment node, or another parsed DOM node type. Some operations, such as attributes and class checks, only make sense for element nodes.<br>
 * <b>NOTE</b>: {@link HtmlNode HtmlNode} objects keep the underlying native document alive while they exist.
 *
 * @hideconstructor
 * @worker
 */
class HtmlNode {
    /**
     * Whether this node is an element node.<br>
     * Element nodes are tags such as &lt;div&gt;, &lt;a&gt;, &lt;p&gt;, &lt;body&gt;.<br>
     * Text nodes and comments are not element nodes.
     *
     * @type {boolean}
     * @readonly
     *
     * @example
     * const doc = utils.ParseHtml("<p>Hello <b>world</b></p>");
     * const p = doc ? doc.querySelector("p") : null;
     * if (p) {
     *     console.log(p.isElement); // true
     *     console.log(p.firstChild ? p.firstChild.isElement : null); // false
     * }
     * @worker
     */
    isElement = undefined; // (read)

    /**
     * Lowercase tag name for element nodes.<br>
     * For non-element nodes, this is an empty string.
     *
     * @type {string}
     * @readonly
     *
     * @example
     * const doc = utils.ParseHtml("<BODY><P>Hello</P></BODY>");
     * if (doc) console.log(doc.body.tagName); // "body"
     * @worker
     */
    tagName = undefined; // (read)

    /**
     * Value of the <b>class</b> attribute.<br>
     * For non-element nodes, or elements without a class attribute, this is an empty string.
     *
     * @type {string}
     * @readonly
     *
     * @example
     * const doc = utils.ParseHtml("<p class='album featured'>Title</p>");
     * if (doc) {
     *     const p = doc.querySelector("p");
     *     console.log(p.className); // "album featured"
     * }
     * @worker
     */
    className = undefined; // (read)

    /**
     * Text content of this node and its descendants.<br>
     * Whitespace is returned as it exists in parsed text nodes.
     *
     * @type {string}
     * @readonly
     *
     * @example
     * const doc = utils.ParseHtml("<p>Hello <b>world</b></p>");
     * if (doc) {
     *     const p = doc.querySelector("p");
     *     console.log(p ? p.textContent : null); // "Hello world"
     * }
     * @worker
     */
    textContent = undefined; // (read)

    /**
     * Alias of {@link HtmlNode#textContent textContent}.<br>
     * Since this parser has no browser layout engine, {@link HtmlNode#innerText innerText} does not emulate CSS visibility, rendered line wrapping, or layout-dependent text extraction.
     *
     * @type {string}
     * @readonly
     * @worker
     */
    innerText = undefined; // (read)

    /**
     * Serialized HTML markup inside this node.
     *
     * @type {string}
     * @readonly
     *
     * @example
     * const doc = utils.ParseHtml("<p>Hello <b>world</b></p>");
     * const p = doc.querySelector("p");
     * console.log(p.innerHTML); // "Hello <b>world</b>"
     * @worker
     */
    innerHTML = undefined; // (read)

    /**
     * Serialized HTML markup of this node itself.
     *
     * @type {string}
     * @readonly
     *
     * @example
     * const doc = utils.ParseHtml("<p>Hello <b>world</b></p>");
     * const p = doc.querySelector("p");
     * console.log(p.outerHTML); // "<p>Hello <b>world</b></p>"
     * @worker
     */
    outerHTML = undefined; // (read)

    /**
     * First child node.<br>
     * <b>Important</b>: this can be a text node or comment, not necessarily an element.<br>
     * Whitespace-only text nodes are preserved. Use JSON.stringify(node.textContent) while debugging if you need to see line breaks, tabs, and spaces explicitly.
     *
     * Use {@link HtmlNode#children children}[0] or {@link HtmlNode#querySelector querySelector}
     * when you need an element.
     *
     * @type {?HtmlNode}
     * @readonly
     *
     * @example
     * const doc = utils.ParseHtml("<li>text before link <a href='https://example.com'>Link</a></li>");
     * const li = doc.querySelector("li");
     *
     * console.log(JSON.stringify(li.firstChild.textContent)); // "text before link "
     *
     * const a = li.querySelector("a");
     * console.log(a.getAttribute("href")); // "https://example.com"
     * @worker
     */
    firstChild = undefined; // (read)

    /**
     * All child nodes, including element nodes, text nodes and comments.
     *
     * @type {Array<HtmlNode>}
     * @readonly
     *
     * @example
     * const doc = utils.ParseHtml("<p>Hello <b>world</b></p>");
     * const p = doc.querySelector("p");
     * console.log(p.childNodes.length); // 2
     * @worker
     */
    childNodes = undefined; // (read)

    /**
     * Child element nodes only.<br>
     * Text nodes and comments are skipped.
     *
     * @type {Array<HtmlNode>}
     * @readonly
     *
     * @example
     * const doc = utils.ParseHtml("<p>Hello <b>world</b></p>");
     * const p = doc.querySelector("p");
     * console.log(p.children.length); // 1
     * console.log(p.children[0].tagName); // "b"
     * @worker
     */
    children = undefined; // (read)

    /**
     * Returns an attribute value.<br>
     * For missing attributes or non-element nodes, returns an empty string.
     * 
     * @method
     * @param {string} name Attribute name.
     * @return {string} Attribute value, or empty string.
     *
     * @example
     * const doc = utils.ParseHtml("<a href='https://example.com'>Link</a>");
     * const a = doc.querySelector("a");
     * console.log(a.getAttribute("href")); // "https://example.com"
     * @worker
     */
    getAttribute = function (name) { }; //

    /**
     * Checks whether an element has an attribute.<br>
     * For non-element nodes, returns false.
     * 
     * @method
     * @param {string} name Attribute name.
     * @return {boolean}
     *
     * @example
     * const doc = utils.ParseHtml("<a href='https://example.com'>Link</a>");
     * const a = doc.querySelector("a");
     * console.log(a.hasAttribute("href")); // true
     * console.log(a.hasAttribute("title")); // false
     * @worker
     */
    hasAttribute = function (name) { }; //

    /**
     * Checks whether the element has a CSS class token.<br>
     * This checks class tokens, not arbitrary substrings.<br>
     * For example, passing <b>"album"</b> to {@link HtmlNode#hasClass hasClass} matches <b>class="album featured"</b>, but not <b>class="album-list"</b>.<br>
     * For non-element nodes, returns false.<br>
     * 
     * @method
     * @param {string} className Class token to check.
     * @return {boolean}
     *
     * @example
     * const doc = utils.ParseHtml("<li class='album featured'>Title</li>");
     * const li = doc.querySelector("li");
     *
     * console.log(li.hasClass("album")); // true
     * console.log(li.hasClass("featured")); // true
     * console.log(li.hasClass("album-list")); // false
     * @worker
     */
    hasClass = function (className) { }; //

    /**
     * Returns the first descendant element matching a CSS selector.
     * 
     * @method
     * @param {string} selector CSS selector.
     * @return {?HtmlNode} First matching node, or <b>null</b> if nothing matches.
     *
     * @example
     * const doc = utils.ParseHtml("<li>text <a href='https://example.com'>Link</a></li>");
     * const li = doc.querySelector("li");
     * const a = li.querySelector("a[href]");
     *
     * if (a) {
     *     console.log(a.getAttribute("href")); // "https://example.com"
     * }
     * @worker
     */
    querySelector = function (selector) { }; //

    /**
     * Returns all descendant elements matching a CSS selector.<br>
     * The returned value is a regular JavaScript array.
     * 
     * @method
     * @param {string} selector CSS selector.
     * @return {Array<HtmlNode>} Array of matching nodes. Empty array if nothing matches.
     *
     * @example
     * const doc = utils.ParseHtml("<ul><li class='album'>A</li><li class='album featured'>B</li></ul>");
     * const list = doc.querySelector("ul");
     * const albums = list.querySelectorAll(".album");
     *
     * console.log(albums.length); // 2
     * @worker
     */
    querySelectorAll = function (selector) { }; //

    /**
     * Returns all descendant elements with the specified tag name.<br>
     * Use "*" to return all descendant elements.
     * 
     * @method
     * @param {string} tagName Tag name, for example "a", "div", "section" or "*".
     * @return {Array<HtmlNode>} Array of matching nodes. Empty array if nothing matches.
     *
     * @example
     * const doc = utils.ParseHtml("<p><a href='https://example.com'>One</a><a href='/two'>Two</a></p>");
     * const p = doc.querySelector("p");
     * const links = p.getElementsByTagName("a");
     *
     * console.log(links.length); // 2
     * @worker
     */
    getElementsByTagName = function (tagName) { }; //
}

