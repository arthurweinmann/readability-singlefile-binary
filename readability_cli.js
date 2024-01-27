import { parse } from "https://deno.land/std@0.83.0/flags/mod.ts";
import { readFileSync, writeFile } from "node:fs";
// import {JSDOM} from "npm:jsdom";

import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts"

const { sourcefile, outputfile } = parse(Deno.args);

function readFile(filePath) {
    return readFileSync(filePath, { encoding: "utf-8" }).trim();
}

var source = readFile(sourcefile);

// source is a string of all the html
function sourceToDoc(source) {

    // var window = new Window();
    // window.write(source);

    // var doc = new JSDOM(source, {
    //     url: "http://fakehost/test/page.html",
    // }).window.document;

    var doc = new DOMParser().parseFromString(source, "text/html");

    removeCommentNodesRecursively(doc);

    return doc;
}

function removeCommentNodesRecursively(node) {
    for (var i = node.childNodes.length - 1; i >= 0; i--) {
        var child = node.childNodes[i];
        if (child.nodeType === child.COMMENT_NODE) {
            node.removeChild(child);
        } else if (child.nodeType === child.ELEMENT_NODE) {
            removeCommentNodesRecursively(child);
        }
    }
}

var rd = Readability(sourceToDoc(source)).parse();

// remove file extension
var fileroot = outputfile.split('.').slice(0, -1).join('.');

var content = rd.content.replace(`<div id="readability-page-1" class="page"><div>`, `<div id="readability-page-1" class="page"><div>\n<h1>` + rd.title + `</h1>`);

writeFile(fileroot + ".html", content, err => {
    if (err) {
        console.error(err);
    }
    // file written successfully
});

writeFile(fileroot + ".txt", rd.title + "\n" + rd.textContent, err => {
    if (err) {
        console.error(err);
    }
    // file written successfully
});

/**
 * Public constructor.
 * @param {HTMLDocument} doc     The document to parse.
 * @param {Object}       options The options object.
 */
function Readability(doc, options) {
    var thisssss = {
        FLAG_STRIP_UNLIKELYS: 0x1,
        FLAG_WEIGHT_CLASSES: 0x2,
        FLAG_CLEAN_CONDITIONALLY: 0x4,

        // https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
        ELEMENT_NODE: 1,
        TEXT_NODE: 3,

        // Max number of nodes supported by this parser. Default: 0 (no limit)
        DEFAULT_MAX_ELEMS_TO_PARSE: 0,

        // The number of top candidates to consider when analysing how
        // tight the competition is among candidates.
        DEFAULT_N_TOP_CANDIDATES: 5,

        // Element tags to score by default.
        DEFAULT_TAGS_TO_SCORE: "section,h2,h3,h4,h5,h6,p,td,pre".toUpperCase().split(","),

        // The default number of chars an article must have in order to return a result
        DEFAULT_CHAR_THRESHOLD: 500,

        // All of the regular expressions in use within readability.
        // Defined up here so we don't instantiate them repeatedly in loops.
        REGEXPS: {
            // NOTE: These two regular expressions are duplicated in
            // Readability-readerable.js. Please keep both copies in sync.
            unlikelyCandidates: /-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i,
            okMaybeItsACandidate: /and|article|body|column|content|main|shadow/i,

            positive: /article|body|content|entry|hentry|h-entry|main|page|pagination|post|text|blog|story/i,
            negative: /-ad-|hidden|^hid$| hid$| hid |^hid |banner|combx|comment|com-|contact|foot|footer|footnote|gdpr|masthead|media|meta|outbrain|promo|related|scroll|share|shoutbox|sidebar|skyscraper|sponsor|shopping|tags|tool|widget/i,
            extraneous: /print|archive|comment|discuss|e[\-]?mail|share|reply|all|login|sign|single|utility/i,
            byline: /byline|author|dateline|writtenby|p-author/i,
            replaceFonts: /<(\/?)font[^>]*>/gi,
            normalize: /\s{2,}/g,
            videos: /\/\/(www\.)?((dailymotion|youtube|youtube-nocookie|player\.vimeo|v\.qq)\.com|(archive|upload\.wikimedia)\.org|player\.twitch\.tv)/i,
            shareElements: /(\b|_)(share|sharedaddy)(\b|_)/i,
            nextLink: /(next|weiter|continue|>([^\|]|$)|»([^\|]|$))/i,
            prevLink: /(prev|earl|old|new|<|«)/i,
            tokenize: /\W+/g,
            whitespace: /^\s*$/,
            hasContent: /\S$/,
            hashUrl: /^#.+/,
            srcsetUrl: /(\S+)(\s+[\d.]+[xw])?(\s*(?:,|$))/g,
            b64DataUrl: /^data:\s*([^\s;,]+)\s*;\s*base64\s*,/i,
            // Commas as used in Latin, Sindhi, Chinese and various other scripts.
            // see: https://en.wikipedia.org/wiki/Comma#Comma_variants
            commas: /\u002C|\u060C|\uFE50|\uFE10|\uFE11|\u2E41|\u2E34|\u2E32|\uFF0C/g,
            // See: https://schema.org/Article
            jsonLdArticleTypes: /^Article|AdvertiserContentArticle|NewsArticle|AnalysisNewsArticle|AskPublicNewsArticle|BackgroundNewsArticle|OpinionNewsArticle|ReportageNewsArticle|ReviewNewsArticle|Report|SatiricalArticle|ScholarlyArticle|MedicalScholarlyArticle|SocialMediaPosting|BlogPosting|LiveBlogPosting|DiscussionForumPosting|TechArticle|APIReference$/
        },

        UNLIKELY_ROLES: ["menu", "menubar", "complementary", "navigation", "alert", "alertdialog", "dialog"],

        DIV_TO_P_ELEMS: new Set(["BLOCKQUOTE", "DL", "DIV", "IMG", "OL", "P", "PRE", "TABLE", "UL"]),

        ALTER_TO_DIV_EXCEPTIONS: ["DIV", "ARTICLE", "SECTION", "P"],

        PRESENTATIONAL_ATTRIBUTES: ["align", "background", "bgcolor", "border", "cellpadding", "cellspacing", "frame", "hspace", "rules", "style", "valign", "vspace"],

        DEPRECATED_SIZE_ATTRIBUTE_ELEMS: ["TABLE", "TH", "TD", "HR", "PRE"],

        // The commented out elements qualify as phrasing content but tend to be
        // removed by readability when put into paragraphs, so we ignore them here.
        PHRASING_ELEMS: [
            // "CANVAS", "IFRAME", "SVG", "VIDEO",
            "ABBR", "AUDIO", "B", "BDO", "BR", "BUTTON", "CITE", "CODE", "DATA",
            "DATALIST", "DFN", "EM", "EMBED", "I", "IMG", "INPUT", "KBD", "LABEL",
            "MARK", "MATH", "METER", "NOSCRIPT", "OBJECT", "OUTPUT", "PROGRESS", "Q",
            "RUBY", "SAMP", "SCRIPT", "SELECT", "SMALL", "SPAN", "STRONG", "SUB",
            "SUP", "TEXTAREA", "TIME", "VAR", "WBR"
        ],

        // These are the classes that readability sets itself.
        CLASSES_TO_PRESERVE: ["page"],

        // These are the list of HTML entities that need to be escaped.
        HTML_ESCAPE_MAP: {
            "lt": "<",
            "gt": ">",
            "amp": "&",
            "quot": '"',
            "apos": "'",
        },

        /**
         * Run any post-process modifications to article content as necessary.
         *
         * @param Element
         * @return void
        **/
        _postProcessContent: function (articleContent) {
            // Readability cannot open relative uris so we convert them to absolute uris.
            thisssss._fixRelativeUris(articleContent);

            thisssss._simplifyNestedElements(articleContent);

            if (!thisssss._keepClasses) {
                // Remove classes.
                thisssss._cleanClasses(articleContent);
            }
        },

        /**
         * Iterates over a NodeList, calls `filterFn` for each node and removes node
         * if function returned `true`.
         *
         * If function is not passed, removes all the nodes in node list.
         *
         * @param NodeList nodeList The nodes to operate on
         * @param Function filterFn the function to use as a filter
         * @return void
         */
        _removeNodes: function (nodeList, filterFn) {
            // Avoid ever operating on live node lists.
            if (thisssss._docJSDOMParser && nodeList._isLiveNodeList) {
                throw new Error("Do not pass live node lists to _removeNodes");
            }
            for (var i = nodeList.length - 1; i >= 0; i--) {
                var node = nodeList[i];
                var parentNode = node.parentNode;
                if (parentNode) {
                    if (!filterFn || filterFn.call(this, node, i, nodeList)) {
                        parentNode.removeChild(node);
                    }
                }
            }
        },

        /**
         * Iterates over a NodeList, and calls _setNodeTag for each node.
         *
         * @param NodeList nodeList The nodes to operate on
         * @param String newTagName the new tag name to use
         * @return void
         */
        _replaceNodeTags: function (nodeList, newTagName) {
            // Avoid ever operating on live node lists.
            if (thisssss._docJSDOMParser && nodeList._isLiveNodeList) {
                throw new Error("Do not pass live node lists to _replaceNodeTags");
            }
            for (const node of nodeList) {
                thisssss._setNodeTag(node, newTagName);
            }
        },

        /**
         * Iterate over a NodeList, which doesn't natively fully implement the Array
         * interface.
         *
         * For convenience, the current object context is applied to the provided
         * iterate function.
         *
         * @param  NodeList nodeList The NodeList.
         * @param  Function fn       The iterate function.
         * @return void
         */
        _forEachNode: function (nodeList, fn) {
            Array.prototype.forEach.call(nodeList, fn, this);
        },

        /**
         * Iterate over a NodeList, and return the first node that passes
         * the supplied test function
         *
         * For convenience, the current object context is applied to the provided
         * test function.
         *
         * @param  NodeList nodeList The NodeList.
         * @param  Function fn       The test function.
         * @return void
         */
        _findNode: function (nodeList, fn) {
            return Array.prototype.find.call(nodeList, fn, this);
        },

        /**
         * Iterate over a NodeList, return true if any of the provided iterate
         * function calls returns true, false otherwise.
         *
         * For convenience, the current object context is applied to the
         * provided iterate function.
         *
         * @param  NodeList nodeList The NodeList.
         * @param  Function fn       The iterate function.
         * @return Boolean
         */
        _someNode: function (nodeList, fn) {
            return Array.prototype.some.call(nodeList, fn, this);
        },

        /**
         * Iterate over a NodeList, return true if all of the provided iterate
         * function calls return true, false otherwise.
         *
         * For convenience, the current object context is applied to the
         * provided iterate function.
         *
         * @param  NodeList nodeList The NodeList.
         * @param  Function fn       The iterate function.
         * @return Boolean
         */
        _everyNode: function (nodeList, fn) {
            return Array.prototype.every.call(nodeList, fn, this);
        },

        /**
         * Concat all nodelists passed as arguments.
         *
         * @return ...NodeList
         * @return Array
         */
        _concatNodeLists: function () {
            var slice = Array.prototype.slice;
            var args = slice.call(arguments);
            var nodeLists = args.map(function (list) {
                return slice.call(list);
            });
            return Array.prototype.concat.apply([], nodeLists);
        },

        _getAllNodesWithTag: function (node, tagNames) {
            if (node.querySelectorAll) {
                return node.querySelectorAll(tagNames.join(","));
            }
            return [].concat.apply([], tagNames.map(function (tag) {
                var collection = node.getElementsByTagName(tag);
                return Array.isArray(collection) ? collection : Array.from(collection);
            }));
        },

        /**
         * Removes the class="" attribute from every element in the given
         * subtree, except those that match CLASSES_TO_PRESERVE and
         * the classesToPreserve array from the options object.
         *
         * @param Element
         * @return void
         */
        _cleanClasses: function (node) {
            var classesToPreserve = thisssss._classesToPreserve;
            var className = (node.getAttribute("class") || "")
                .split(/\s+/)
                .filter(function (cls) {
                    return classesToPreserve.indexOf(cls) != -1;
                })
                .join(" ");

            if (className) {
                node.setAttribute("class", className);
            } else {
                node.removeAttribute("class");
            }

            for (node = node.firstElementChild; node; node = node.nextElementSibling) {
                thisssss._cleanClasses(node);
            }
        },

        /**
         * Converts each <a> and <img> uri in the given element to an absolute URI,
         * ignoring #ref URIs.
         *
         * @param Element
         * @return void
         */
        _fixRelativeUris: function (articleContent) {
            var baseURI = thisssss._doc.baseURI;
            var documentURI = thisssss._doc.documentURI;
            function toAbsoluteURI(uri) {
                // Leave hash links alone if the base URI matches the document URI:
                if (baseURI == documentURI && uri.charAt(0) == "#") {
                    return uri;
                }

                // Otherwise, resolve against base URI:
                try {
                    return new URL(uri, baseURI).href;
                } catch (ex) {
                    // Something went wrong, just return the original:
                }
                return uri;
            }

            var links = thisssss._getAllNodesWithTag(articleContent, ["a"]);
            thisssss._forEachNode(links, function (link) {
                var href = link.getAttribute("href");
                if (href) {
                    // Remove links with javascript: URIs, since
                    // they won't work after scripts have been removed from the page.
                    if (href.indexOf("javascript:") === 0) {
                        // if the link only contains simple text content, it can be converted to a text node
                        if (link.childNodes.length === 1 && link.childNodes[0].nodeType === thisssss.TEXT_NODE) {
                            var text = thisssss._doc.createTextNode(link.textContent);
                            link.parentNode.replaceChild(text, link);
                        } else {
                            // if the link has multiple children, they should all be preserved
                            var container = thisssss._doc.createElement("span");
                            while (link.firstChild) {
                                container.appendChild(link.firstChild);
                            }
                            link.parentNode.replaceChild(container, link);
                        }
                    } else {
                        link.setAttribute("href", toAbsoluteURI(href));
                    }
                }
            });

            var medias = thisssss._getAllNodesWithTag(articleContent, [
                "img", "picture", "figure", "video", "audio", "source"
            ]);

            thisssss._forEachNode(medias, function (media) {
                var src = media.getAttribute("src");
                var poster = media.getAttribute("poster");
                var srcset = media.getAttribute("srcset");

                if (src) {
                    media.setAttribute("src", toAbsoluteURI(src));
                }

                if (poster) {
                    media.setAttribute("poster", toAbsoluteURI(poster));
                }

                if (srcset) {
                    var newSrcset = srcset.replace(thisssss.REGEXPS.srcsetUrl, function (_, p1, p2, p3) {
                        return toAbsoluteURI(p1) + (p2 || "") + p3;
                    });

                    media.setAttribute("srcset", newSrcset);
                }
            });
        },

        _simplifyNestedElements: function (articleContent) {
            var node = articleContent;

            while (node) {
                if (node.parentNode && ["DIV", "SECTION"].includes(node.tagName) && !(node.id && node.id.startsWith("readability"))) {
                    if (thisssss._isElementWithoutContent(node)) {
                        node = thisssss._removeAndGetNext(node);
                        continue;
                    } else if (thisssss._hasSingleTagInsideElement(node, "DIV") || thisssss._hasSingleTagInsideElement(node, "SECTION")) {
                        var child = node.children[0];
                        for (var i = 0; i < node.attributes.length; i++) {
                            child.setAttribute(node.attributes[i].name, node.attributes[i].value);
                        }
                        node.parentNode.replaceChild(child, node);
                        node = child;
                        continue;
                    }
                }

                node = thisssss._getNextNode(node);
            }
        },

        /**
         * Get the article title as an H1.
         *
         * @return string
         **/
        _getArticleTitle: function () {
            var doc = thisssss._doc;
            var curTitle = "";
            var origTitle = "";

            try {
                curTitle = origTitle = doc.title.trim();

                // If they had an element with id "title" in their HTML
                if (typeof curTitle !== "string")
                    curTitle = origTitle = thisssss._getInnerText(doc.getElementsByTagName("title")[0]);
            } catch (e) {/* ignore exceptions setting the title. */ }

            var titleHadHierarchicalSeparators = false;
            function wordCount(str) {
                return str.split(/\s+/).length;
            }

            // If there's a separator in the title, first remove the final part
            if ((/ [\|\-\\\/>»] /).test(curTitle)) {
                titleHadHierarchicalSeparators = / [\\\/>»] /.test(curTitle);
                curTitle = origTitle.replace(/(.*)[\|\-\\\/>»] .*/gi, "$1");

                // If the resulting title is too short (3 words or fewer), remove
                // the first part instead:
                if (wordCount(curTitle) < 3)
                    curTitle = origTitle.replace(/[^\|\-\\\/>»]*[\|\-\\\/>»](.*)/gi, "$1");
            } else if (curTitle.indexOf(": ") !== -1) {
                // Check if we have an heading containing this exact string, so we
                // could assume it's the full title.
                var headings = thisssss._concatNodeLists(
                    doc.getElementsByTagName("h1"),
                    doc.getElementsByTagName("h2")
                );
                var trimmedTitle = curTitle.trim();
                var match = thisssss._someNode(headings, function (heading) {
                    return heading.textContent.trim() === trimmedTitle;
                });

                // If we don't, let's extract the title out of the original title string.
                if (!match) {
                    curTitle = origTitle.substring(origTitle.lastIndexOf(":") + 1);

                    // If the title is now too short, try the first colon instead:
                    if (wordCount(curTitle) < 3) {
                        curTitle = origTitle.substring(origTitle.indexOf(":") + 1);
                        // But if we have too many words before the colon there's something weird
                        // with the titles and the H tags so let's just use the original title instead
                    } else if (wordCount(origTitle.substr(0, origTitle.indexOf(":"))) > 5) {
                        curTitle = origTitle;
                    }
                }
            } else if (curTitle.length > 150 || curTitle.length < 15) {
                var hOnes = doc.getElementsByTagName("h1");

                if (hOnes.length === 1)
                    curTitle = thisssss._getInnerText(hOnes[0]);
            }

            curTitle = curTitle.trim().replace(thisssss.REGEXPS.normalize, " ");
            // If we now have 4 words or fewer as our title, and either no
            // 'hierarchical' separators (\, /, > or ») were found in the original
            // title or we decreased the number of words by more than 1 word, use
            // the original title.
            var curTitleWordCount = wordCount(curTitle);
            if (curTitleWordCount <= 4 &&
                (!titleHadHierarchicalSeparators ||
                    curTitleWordCount != wordCount(origTitle.replace(/[\|\-\\\/>»]+/g, "")) - 1)) {
                curTitle = origTitle;
            }

            return curTitle;
        },

        /**
         * Prepare the HTML document for readability to scrape it.
         * This includes things like stripping javascript, CSS, and handling terrible markup.
         *
         * @return void
         **/
        _prepDocument: function () {
            var doc = thisssss._doc;

            // Remove all style tags in head
            thisssss._removeNodes(thisssss._getAllNodesWithTag(doc, ["style"]));

            if (doc.body) {
                thisssss._replaceBrs(doc.body);
            }

            thisssss._replaceNodeTags(thisssss._getAllNodesWithTag(doc, ["font"]), "SPAN");
        },

        /**
         * Finds the next node, starting from the given node, and ignoring
         * whitespace in between. If the given node is an element, the same node is
         * returned.
         */
        _nextNode: function (node) {
            var next = node;
            while (next
                && (next.nodeType != thisssss.ELEMENT_NODE)
                && thisssss.REGEXPS.whitespace.test(next.textContent)) {
                next = next.nextSibling;
            }
            return next;
        },

        /**
         * Replaces 2 or more successive <br> elements with a single <p>.
         * Whitespace between <br> elements are ignored. For example:
         *   <div>foo<br>bar<br> <br><br>abc</div>
         * will become:
         *   <div>foo<br>bar<p>abc</p></div>
         */
        _replaceBrs: function (elem) {
            thisssss._forEachNode(thisssss._getAllNodesWithTag(elem, ["br"]), function (br) {
                var next = br.nextSibling;

                // Whether 2 or more <br> elements have been found and replaced with a
                // <p> block.
                var replaced = false;

                // If we find a <br> chain, remove the <br>s until we hit another node
                // or non-whitespace. This leaves behind the first <br> in the chain
                // (which will be replaced with a <p> later).
                while ((next = thisssss._nextNode(next)) && (next.tagName == "BR")) {
                    replaced = true;
                    var brSibling = next.nextSibling;
                    next.parentNode.removeChild(next);
                    next = brSibling;
                }

                // If we removed a <br> chain, replace the remaining <br> with a <p>. Add
                // all sibling nodes as children of the <p> until we hit another <br>
                // chain.
                if (replaced) {
                    var p = thisssss._doc.createElement("p");
                    br.parentNode.replaceChild(p, br);

                    next = p.nextSibling;
                    while (next) {
                        // If we've hit another <br><br>, we're done adding children to this <p>.
                        if (next.tagName == "BR") {
                            var nextElem = thisssss._nextNode(next.nextSibling);
                            if (nextElem && nextElem.tagName == "BR")
                                break;
                        }

                        if (!thisssss._isPhrasingContent(next))
                            break;

                        // Otherwise, make this node a child of the new <p>.
                        var sibling = next.nextSibling;
                        p.appendChild(next);
                        next = sibling;
                    }

                    while (p.lastChild && thisssss._isWhitespace(p.lastChild)) {
                        p.removeChild(p.lastChild);
                    }

                    if (p.parentNode.tagName === "P")
                        thisssss._setNodeTag(p.parentNode, "DIV");
                }
            });
        },

        _setNodeTag: function (node, tag) {
            thisssss.log("_setNodeTag", node, tag);
            if (thisssss._docJSDOMParser) {
                node.localName = tag.toLowerCase();
                node.tagName = tag.toUpperCase();
                return node;
            }

            var replacement = node.ownerDocument.createElement(tag);
            while (node.firstChild) {
                replacement.appendChild(node.firstChild);
            }
            node.parentNode.replaceChild(replacement, node);
            if (node.readability)
                replacement.readability = node.readability;

            for (var i = 0; i < node.attributes.length; i++) {
                try {
                    replacement.setAttribute(node.attributes[i].name, node.attributes[i].value);
                } catch (ex) {
                    /* it's possible for setAttribute() to throw if the attribute name
                     * isn't a valid XML Name. Such attributes can however be parsed from
                     * source in HTML docs, see https://github.com/whatwg/html/issues/4275,
                     * so we can hit them here and then throw. We don't care about such
                     * attributes so we ignore them.
                     */
                }
            }
            return replacement;
        },

        /**
         * Prepare the article node for display. Clean out any inline styles,
         * iframes, forms, strip extraneous <p> tags, etc.
         *
         * @param Element
         * @return void
         **/
        _prepArticle: function (articleContent) {
            thisssss._cleanStyles(articleContent);

            // Check for data tables before we continue, to avoid removing items in
            // those tables, which will often be isolated even though they're
            // visually linked to other content-ful elements (text, images, etc.).
            thisssss._markDataTables(articleContent);

            thisssss._fixLazyImages(articleContent);

            // Clean out junk from the article content
            thisssss._cleanConditionally(articleContent, "form");
            thisssss._cleanConditionally(articleContent, "fieldset");
            thisssss._clean(articleContent, "object");
            thisssss._clean(articleContent, "embed");
            thisssss._clean(articleContent, "footer");
            thisssss._clean(articleContent, "link");
            thisssss._clean(articleContent, "aside");

            // Clean out elements with little content that have "share" in their id/class combinations from final top candidates,
            // which means we don't remove the top candidates even they have "share".

            var shareElementThreshold = thisssss.DEFAULT_CHAR_THRESHOLD;

            thisssss._forEachNode(articleContent.children, function (topCandidate) {
                thisssss._cleanMatchedNodes(topCandidate, function (node, matchString) {
                    return thisssss.REGEXPS.shareElements.test(matchString) && node.textContent.length < shareElementThreshold;
                });
            });

            thisssss._clean(articleContent, "iframe");
            thisssss._clean(articleContent, "input");
            thisssss._clean(articleContent, "textarea");
            thisssss._clean(articleContent, "select");
            thisssss._clean(articleContent, "button");
            thisssss._cleanHeaders(articleContent);

            // Do these last as the previous stuff may have removed junk
            // that will affect these
            thisssss._cleanConditionally(articleContent, "table");
            thisssss._cleanConditionally(articleContent, "ul");
            thisssss._cleanConditionally(articleContent, "div");

            // replace H1 with H2 as H1 should be only title that is displayed separately
            thisssss._replaceNodeTags(thisssss._getAllNodesWithTag(articleContent, ["h1"]), "h2");

            // Remove extra paragraphs
            thisssss._removeNodes(thisssss._getAllNodesWithTag(articleContent, ["p"]), function (paragraph) {
                var imgCount = paragraph.getElementsByTagName("img").length;
                var embedCount = paragraph.getElementsByTagName("embed").length;
                var objectCount = paragraph.getElementsByTagName("object").length;
                // At this point, nasty iframes have been removed, only remain embedded video ones.
                var iframeCount = paragraph.getElementsByTagName("iframe").length;
                var totalCount = imgCount + embedCount + objectCount + iframeCount;

                return totalCount === 0 && !thisssss._getInnerText(paragraph, false);
            });

            thisssss._forEachNode(thisssss._getAllNodesWithTag(articleContent, ["br"]), function (br) {
                var next = thisssss._nextNode(br.nextSibling);
                if (next && next.tagName == "P")
                    br.parentNode.removeChild(br);
            });

            // Remove single-cell tables
            thisssss._forEachNode(thisssss._getAllNodesWithTag(articleContent, ["table"]), function (table) {
                var tbody = thisssss._hasSingleTagInsideElement(table, "TBODY") ? table.firstElementChild : table;
                if (thisssss._hasSingleTagInsideElement(tbody, "TR")) {
                    var row = tbody.firstElementChild;
                    if (thisssss._hasSingleTagInsideElement(row, "TD")) {
                        var cell = row.firstElementChild;
                        cell = thisssss._setNodeTag(cell, thisssss._everyNode(cell.childNodes, thisssss._isPhrasingContent) ? "P" : "DIV");
                        table.parentNode.replaceChild(cell, table);
                    }
                }
            });
        },

        /**
         * Initialize a node with the readability object. Also checks the
         * className/id for special names to add to its score.
         *
         * @param Element
         * @return void
        **/
        _initializeNode: function (node) {
            node.readability = { "contentScore": 0 };

            switch (node.tagName) {
                case "DIV":
                    node.readability.contentScore += 5;
                    break;

                case "PRE":
                case "TD":
                case "BLOCKQUOTE":
                    node.readability.contentScore += 3;
                    break;

                case "ADDRESS":
                case "OL":
                case "UL":
                case "DL":
                case "DD":
                case "DT":
                case "LI":
                case "FORM":
                    node.readability.contentScore -= 3;
                    break;

                case "H1":
                case "H2":
                case "H3":
                case "H4":
                case "H5":
                case "H6":
                case "TH":
                    node.readability.contentScore -= 5;
                    break;
            }

            node.readability.contentScore += thisssss._getClassWeight(node);
        },

        _removeAndGetNext: function (node) {
            var nextNode = thisssss._getNextNode(node, true);
            node.parentNode.removeChild(node);
            return nextNode;
        },

        /**
         * Traverse the DOM from node to node, starting at the node passed in.
         * Pass true for the second parameter to indicate this node itself
         * (and its kids) are going away, and we want the next node over.
         *
         * Calling this in a loop will traverse the DOM depth-first.
         */
        _getNextNode: function (node, ignoreSelfAndKids) {
            // First check for kids if those aren't being ignored
            if (!ignoreSelfAndKids && node.firstElementChild) {
                return node.firstElementChild;
            }
            // Then for siblings...
            if (node.nextElementSibling) {
                return node.nextElementSibling;
            }
            // And finally, move up the parent chain *and* find a sibling
            // (because this is depth-first traversal, we will have already
            // seen the parent nodes themselves).
            do {
                node = node.parentNode;
            } while (node && !node.nextElementSibling);
            return node && node.nextElementSibling;
        },

        // compares second text to first one
        // 1 = same text, 0 = completely different text
        // works the way that it splits both texts into words and then finds words that are unique in second text
        // the result is given by the lower length of unique parts
        _textSimilarity: function (textA, textB) {
            var tokensA = textA.toLowerCase().split(thisssss.REGEXPS.tokenize).filter(Boolean);
            var tokensB = textB.toLowerCase().split(thisssss.REGEXPS.tokenize).filter(Boolean);
            if (!tokensA.length || !tokensB.length) {
                return 0;
            }
            var uniqTokensB = tokensB.filter(token => !tokensA.includes(token));
            var distanceB = uniqTokensB.join(" ").length / tokensB.join(" ").length;
            return 1 - distanceB;
        },

        _checkByline: function (node, matchString) {
            if (thisssss._articleByline) {
                return false;
            }

            if (node.getAttribute !== undefined) {
                var rel = node.getAttribute("rel");
                var itemprop = node.getAttribute("itemprop");
            }

            if ((rel === "author" || (itemprop && itemprop.indexOf("author") !== -1) || thisssss.REGEXPS.byline.test(matchString)) && thisssss._isValidByline(node.textContent)) {
                thisssss._articleByline = node.textContent.trim();
                return true;
            }

            return false;
        },

        _getNodeAncestors: function (node, maxDepth) {
            maxDepth = maxDepth || 0;
            var i = 0, ancestors = [];
            while (node.parentNode) {
                ancestors.push(node.parentNode);
                if (maxDepth && ++i === maxDepth)
                    break;
                node = node.parentNode;
            }
            return ancestors;
        },

        /***
         * grabArticle - Using a variety of metrics (content score, classname, element types), find the content that is
         *         most likely to be the stuff a user wants to read. Then return it wrapped up in a div.
         *
         * @param page a document to run upon. Needs to be a full document, complete with body.
         * @return Element
        **/
        _grabArticle: function (page) {
            thisssss.log("**** grabArticle ****");
            var doc = thisssss._doc;
            var isPaging = page !== null;
            page = page ? page : thisssss._doc.body;

            // We can't grab an article if we don't have a page!
            if (!page) {
                thisssss.log("No body found in document. Abort.");
                return null;
            }

            var pageCacheHtml = page.innerHTML;

            while (true) {
                thisssss.log("Starting grabArticle loop");
                var stripUnlikelyCandidates = thisssss._flagIsActive(thisssss.FLAG_STRIP_UNLIKELYS);

                // First, node prepping. Trash nodes that look cruddy (like ones with the
                // class name "comment", etc), and turn divs into P tags where they have been
                // used inappropriately (as in, where they contain no other block level elements.)
                var elementsToScore = [];
                var node = thisssss._doc.documentElement;

                let shouldRemoveTitleHeader = true;

                while (node) {

                    if (node.tagName === "HTML") {
                        thisssss._articleLang = node.getAttribute("lang");
                    }

                    var matchString = node.className + " " + node.id;

                    if (!thisssss._isProbablyVisible(node)) {
                        thisssss.log("Removing hidden node - " + matchString);
                        node = thisssss._removeAndGetNext(node);
                        continue;
                    }

                    // User is not able to see elements applied with both "aria-modal = true" and "role = dialog"
                    if (node.getAttribute("aria-modal") == "true" && node.getAttribute("role") == "dialog") {
                        node = thisssss._removeAndGetNext(node);
                        continue;
                    }

                    // Check to see if this node is a byline, and remove it if it is.
                    if (thisssss._checkByline(node, matchString)) {
                        node = thisssss._removeAndGetNext(node);
                        continue;
                    }

                    if (shouldRemoveTitleHeader && thisssss._headerDuplicatesTitle(node)) {
                        thisssss.log("Removing header: ", node.textContent.trim(), thisssss._articleTitle.trim());
                        shouldRemoveTitleHeader = false;
                        node = thisssss._removeAndGetNext(node);
                        continue;
                    }

                    // Remove unlikely candidates
                    if (stripUnlikelyCandidates) {
                        if (thisssss.REGEXPS.unlikelyCandidates.test(matchString) &&
                            !thisssss.REGEXPS.okMaybeItsACandidate.test(matchString) &&
                            !thisssss._hasAncestorTag(node, "table") &&
                            !thisssss._hasAncestorTag(node, "code") &&
                            node.tagName !== "BODY" &&
                            node.tagName !== "A") {
                            thisssss.log("Removing unlikely candidate - " + matchString);
                            node = thisssss._removeAndGetNext(node);
                            continue;
                        }

                        if (thisssss.UNLIKELY_ROLES.includes(node.getAttribute("role"))) {
                            thisssss.log("Removing content with role " + node.getAttribute("role") + " - " + matchString);
                            node = thisssss._removeAndGetNext(node);
                            continue;
                        }
                    }

                    // Remove DIV, SECTION, and HEADER nodes without any content(e.g. text, image, video, or iframe).
                    if ((node.tagName === "DIV" || node.tagName === "SECTION" || node.tagName === "HEADER" ||
                        node.tagName === "H1" || node.tagName === "H2" || node.tagName === "H3" ||
                        node.tagName === "H4" || node.tagName === "H5" || node.tagName === "H6") &&
                        thisssss._isElementWithoutContent(node)) {
                        node = thisssss._removeAndGetNext(node);
                        continue;
                    }

                    if (thisssss.DEFAULT_TAGS_TO_SCORE.indexOf(node.tagName) !== -1) {
                        elementsToScore.push(node);
                    }

                    // Turn all divs that don't have children block level elements into p's
                    if (node.tagName === "DIV") {
                        // Put phrasing content into paragraphs.
                        var p = null;
                        var childNode = node.firstChild;
                        while (childNode) {
                            var nextSibling = childNode.nextSibling;
                            if (thisssss._isPhrasingContent(childNode)) {
                                if (p !== null) {
                                    p.appendChild(childNode);
                                } else if (!thisssss._isWhitespace(childNode)) {
                                    p = doc.createElement("p");
                                    node.replaceChild(p, childNode);
                                    p.appendChild(childNode);
                                }
                            } else if (p !== null) {
                                while (p.lastChild && thisssss._isWhitespace(p.lastChild)) {
                                    p.removeChild(p.lastChild);
                                }
                                p = null;
                            }
                            childNode = nextSibling;
                        }

                        // Sites like http://mobile.slate.com encloses each paragraph with a DIV
                        // element. DIVs with only a P element inside and no text content can be
                        // safely converted into plain P elements to avoid confusing the scoring
                        // algorithm with DIVs with are, in practice, paragraphs.
                        if (thisssss._hasSingleTagInsideElement(node, "P") && thisssss._getLinkDensity(node) < 0.25) {
                            var newNode = node.children[0];
                            node.parentNode.replaceChild(newNode, node);
                            node = newNode;
                            elementsToScore.push(node);
                        } else if (!thisssss._hasChildBlockElement(node)) {
                            node = thisssss._setNodeTag(node, "P");
                            elementsToScore.push(node);
                        }
                    }
                    node = thisssss._getNextNode(node);
                }

                /**
                 * Loop through all paragraphs, and assign a score to them based on how content-y they look.
                 * Then add their score to their parent node.
                 *
                 * A score is determined by things like number of commas, class names, etc. Maybe eventually link density.
                **/
                var candidates = [];
                thisssss._forEachNode(elementsToScore, function (elementToScore) {
                    if (!elementToScore.parentNode || typeof (elementToScore.parentNode.tagName) === "undefined")
                        return;

                    // If this paragraph is less than 25 characters, don't even count it.
                    var innerText = thisssss._getInnerText(elementToScore);
                    if (innerText.length < 25)
                        return;

                    // Exclude nodes with no ancestor.
                    var ancestors = thisssss._getNodeAncestors(elementToScore, 5);
                    if (ancestors.length === 0)
                        return;

                    var contentScore = 0;

                    // Add a point for the paragraph itself as a base.
                    contentScore += 1;

                    // Add points for any commas within this paragraph.
                    contentScore += innerText.split(thisssss.REGEXPS.commas).length;

                    // For every 100 characters in this paragraph, add another point. Up to 3 points.
                    contentScore += Math.min(Math.floor(innerText.length / 100), 3);

                    // Initialize and score ancestors.
                    thisssss._forEachNode(ancestors, function (ancestor, level) {
                        if (!ancestor.tagName || !ancestor.parentNode || typeof (ancestor.parentNode.tagName) === "undefined")
                            return;

                        if (typeof (ancestor.readability) === "undefined") {
                            thisssss._initializeNode(ancestor);
                            candidates.push(ancestor);
                        }

                        // Node score divider:
                        // - parent:             1 (no division)
                        // - grandparent:        2
                        // - great grandparent+: ancestor level * 3
                        if (level === 0)
                            var scoreDivider = 1;
                        else if (level === 1)
                            scoreDivider = 2;
                        else
                            scoreDivider = level * 3;
                        ancestor.readability.contentScore += contentScore / scoreDivider;
                    });
                });

                // After we've calculated scores, loop through all of the possible
                // candidate nodes we found and find the one with the highest score.
                var topCandidates = [];
                for (var c = 0, cl = candidates.length; c < cl; c += 1) {
                    var candidate = candidates[c];

                    // Scale the final candidates score based on link density. Good content
                    // should have a relatively small link density (5% or less) and be mostly
                    // unaffected by this operation.
                    var candidateScore = candidate.readability.contentScore * (1 - thisssss._getLinkDensity(candidate));
                    candidate.readability.contentScore = candidateScore;

                    thisssss.log("Candidate:", candidate, "with score " + candidateScore);

                    for (var t = 0; t < thisssss._nbTopCandidates; t++) {
                        var aTopCandidate = topCandidates[t];

                        if (!aTopCandidate || candidateScore > aTopCandidate.readability.contentScore) {
                            topCandidates.splice(t, 0, candidate);
                            if (topCandidates.length > thisssss._nbTopCandidates)
                                topCandidates.pop();
                            break;
                        }
                    }
                }

                var topCandidate = topCandidates[0] || null;
                var neededToCreateTopCandidate = false;
                var parentOfTopCandidate;

                // If we still have no top candidate, just use the body as a last resort.
                // We also have to copy the body node so it is something we can modify.
                if (topCandidate === null || topCandidate.tagName === "BODY") {
                    // Move all of the page's children into topCandidate
                    topCandidate = doc.createElement("DIV");
                    neededToCreateTopCandidate = true;
                    // Move everything (not just elements, also text nodes etc.) into the container
                    // so we even include text directly in the body:
                    while (page.firstChild) {
                        thisssss.log("Moving child out:", page.firstChild);
                        topCandidate.appendChild(page.firstChild);
                    }

                    page.appendChild(topCandidate);

                    thisssss._initializeNode(topCandidate);
                } else if (topCandidate) {
                    // Find a better top candidate node if it contains (at least three) nodes which belong to `topCandidates` array
                    // and whose scores are quite closed with current `topCandidate` node.
                    var alternativeCandidateAncestors = [];
                    for (var i = 1; i < topCandidates.length; i++) {
                        if (topCandidates[i].readability.contentScore / topCandidate.readability.contentScore >= 0.75) {
                            alternativeCandidateAncestors.push(thisssss._getNodeAncestors(topCandidates[i]));
                        }
                    }
                    var MINIMUM_TOPCANDIDATES = 3;
                    if (alternativeCandidateAncestors.length >= MINIMUM_TOPCANDIDATES) {
                        parentOfTopCandidate = topCandidate.parentNode;
                        while (parentOfTopCandidate.tagName !== "BODY") {
                            var listsContainingThisAncestor = 0;
                            for (var ancestorIndex = 0; ancestorIndex < alternativeCandidateAncestors.length && listsContainingThisAncestor < MINIMUM_TOPCANDIDATES; ancestorIndex++) {
                                listsContainingThisAncestor += Number(alternativeCandidateAncestors[ancestorIndex].includes(parentOfTopCandidate));
                            }
                            if (listsContainingThisAncestor >= MINIMUM_TOPCANDIDATES) {
                                topCandidate = parentOfTopCandidate;
                                break;
                            }
                            parentOfTopCandidate = parentOfTopCandidate.parentNode;
                        }
                    }
                    if (!topCandidate.readability) {
                        thisssss._initializeNode(topCandidate);
                    }

                    // Because of our bonus system, parents of candidates might have scores
                    // themselves. They get half of the node. There won't be nodes with higher
                    // scores than our topCandidate, but if we see the score going *up* in the first
                    // few steps up the tree, that's a decent sign that there might be more content
                    // lurking in other places that we want to unify in. The sibling stuff
                    // below does some of that - but only if we've looked high enough up the DOM
                    // tree.
                    parentOfTopCandidate = topCandidate.parentNode;
                    var lastScore = topCandidate.readability.contentScore;
                    // The scores shouldn't get too low.
                    var scoreThreshold = lastScore / 3;
                    while (parentOfTopCandidate.tagName !== "BODY") {
                        if (!parentOfTopCandidate.readability) {
                            parentOfTopCandidate = parentOfTopCandidate.parentNode;
                            continue;
                        }
                        var parentScore = parentOfTopCandidate.readability.contentScore;
                        if (parentScore < scoreThreshold)
                            break;
                        if (parentScore > lastScore) {
                            // Alright! We found a better parent to use.
                            topCandidate = parentOfTopCandidate;
                            break;
                        }
                        lastScore = parentOfTopCandidate.readability.contentScore;
                        parentOfTopCandidate = parentOfTopCandidate.parentNode;
                    }

                    // If the top candidate is the only child, use parent instead. This will help sibling
                    // joining logic when adjacent content is actually located in parent's sibling node.
                    parentOfTopCandidate = topCandidate.parentNode;
                    while (parentOfTopCandidate.tagName != "BODY" && parentOfTopCandidate.children.length == 1) {
                        topCandidate = parentOfTopCandidate;
                        parentOfTopCandidate = topCandidate.parentNode;
                    }
                    if (!topCandidate.readability) {
                        thisssss._initializeNode(topCandidate);
                    }
                }

                // Now that we have the top candidate, look through its siblings for content
                // that might also be related. Things like preambles, content split by ads
                // that we removed, etc.
                var articleContent = doc.createElement("DIV");
                if (isPaging)
                    articleContent.id = "readability-content";

                var siblingScoreThreshold = Math.max(10, topCandidate.readability.contentScore * 0.2);
                // Keep potential top candidate's parent node to try to get text direction of it later.
                parentOfTopCandidate = topCandidate.parentNode;
                var siblings = parentOfTopCandidate.children;

                for (var s = 0, sl = siblings.length; s < sl; s++) {
                    var sibling = siblings[s];
                    var append = false;

                    thisssss.log("Looking at sibling node:", sibling, sibling.readability ? ("with score " + sibling.readability.contentScore) : "");
                    thisssss.log("Sibling has score", sibling.readability ? sibling.readability.contentScore : "Unknown");

                    if (sibling === topCandidate) {
                        append = true;
                    } else {
                        var contentBonus = 0;

                        // Give a bonus if sibling nodes and top candidates have the example same classname
                        if (sibling.className === topCandidate.className && topCandidate.className !== "")
                            contentBonus += topCandidate.readability.contentScore * 0.2;

                        if (sibling.readability &&
                            ((sibling.readability.contentScore + contentBonus) >= siblingScoreThreshold)) {
                            append = true;
                        } else if (sibling.nodeName === "P") {
                            var linkDensity = thisssss._getLinkDensity(sibling);
                            var nodeContent = thisssss._getInnerText(sibling);
                            var nodeLength = nodeContent.length;

                            if (nodeLength > 80 && linkDensity < 0.25) {
                                append = true;
                            } else if (nodeLength < 80 && nodeLength > 0 && linkDensity === 0 &&
                                nodeContent.search(/\.( |$)/) !== -1) {
                                append = true;
                            }
                        }
                    }

                    if (append) {
                        thisssss.log("Appending node:", sibling);

                        if (thisssss.ALTER_TO_DIV_EXCEPTIONS.indexOf(sibling.nodeName) === -1) {
                            // We have a node that isn't a common block level element, like a form or td tag.
                            // Turn it into a div so it doesn't get filtered out later by accident.
                            thisssss.log("Altering sibling:", sibling, "to div.");

                            sibling = thisssss._setNodeTag(sibling, "DIV");
                        }

                        articleContent.appendChild(sibling);
                        // Fetch children again to make it compatible
                        // with DOM parsers without live collection support.
                        siblings = parentOfTopCandidate.children;
                        // siblings is a reference to the children array, and
                        // sibling is removed from the array when we call appendChild().
                        // As a result, we must revisit this index since the nodes
                        // have been shifted.
                        s -= 1;
                        sl -= 1;
                    }
                }

                if (thisssss._debug)
                    thisssss.log("Article content pre-prep: " + articleContent.innerHTML);
                // So we have all of the content that we need. Now we clean it up for presentation.
                thisssss._prepArticle(articleContent);
                if (thisssss._debug)
                    thisssss.log("Article content post-prep: " + articleContent.innerHTML);

                if (neededToCreateTopCandidate) {
                    // We already created a fake div thing, and there wouldn't have been any siblings left
                    // for the previous loop, so there's no point trying to create a new div, and then
                    // move all the children over. Just assign IDs and class names here. No need to append
                    // because that already happened anyway.
                    topCandidate.id = "readability-page-1";
                    topCandidate.className = "page";
                } else {
                    var div = doc.createElement("DIV");
                    div.id = "readability-page-1";
                    div.className = "page";
                    while (articleContent.firstChild) {
                        div.appendChild(articleContent.firstChild);
                    }
                    articleContent.appendChild(div);
                }

                if (thisssss._debug)
                    thisssss.log("Article content after paging: " + articleContent.innerHTML);

                var parseSuccessful = true;

                // Now that we've gone through the full algorithm, check to see if
                // we got any meaningful content. If we didn't, we may need to re-run
                // grabArticle with different flags set. This gives us a higher likelihood of
                // finding the content, and the sieve approach gives us a higher likelihood of
                // finding the -right- content.
                var textLength = thisssss._getInnerText(articleContent, true).length;
                if (textLength < thisssss._charThreshold) {
                    parseSuccessful = false;
                    page.innerHTML = pageCacheHtml;

                    if (thisssss._flagIsActive(thisssss.FLAG_STRIP_UNLIKELYS)) {
                        thisssss._removeFlag(thisssss.FLAG_STRIP_UNLIKELYS);
                        thisssss._attempts.push({ articleContent: articleContent, textLength: textLength });
                    } else if (thisssss._flagIsActive(thisssss.FLAG_WEIGHT_CLASSES)) {
                        thisssss._removeFlag(thisssss.FLAG_WEIGHT_CLASSES);
                        thisssss._attempts.push({ articleContent: articleContent, textLength: textLength });
                    } else if (thisssss._flagIsActive(thisssss.FLAG_CLEAN_CONDITIONALLY)) {
                        thisssss._removeFlag(thisssss.FLAG_CLEAN_CONDITIONALLY);
                        thisssss._attempts.push({ articleContent: articleContent, textLength: textLength });
                    } else {
                        thisssss._attempts.push({ articleContent: articleContent, textLength: textLength });
                        // No luck after removing flags, just return the longest text we found during the different loops
                        thisssss._attempts.sort(function (a, b) {
                            return b.textLength - a.textLength;
                        });

                        // But first check if we actually have something
                        if (!thisssss._attempts[0].textLength) {
                            return null;
                        }

                        articleContent = thisssss._attempts[0].articleContent;
                        parseSuccessful = true;
                    }
                }

                if (parseSuccessful) {
                    // Find out text direction from ancestors of final top candidate.
                    var ancestors = [parentOfTopCandidate, topCandidate].concat(thisssss._getNodeAncestors(parentOfTopCandidate));
                    thisssss._someNode(ancestors, function (ancestor) {
                        if (!ancestor.tagName)
                            return false;
                        var articleDir = ancestor.getAttribute("dir");
                        if (articleDir) {
                            thisssss._articleDir = articleDir;
                            return true;
                        }
                        return false;
                    });
                    return articleContent;
                }
            }
        },

        /**
         * Check whether the input string could be a byline.
         * This verifies that the input is a string, and that the length
         * is less than 100 chars.
         *
         * @param possibleByline {string} - a string to check whether its a byline.
         * @return Boolean - whether the input string is a byline.
         */
        _isValidByline: function (byline) {
            if (typeof byline == "string" || byline instanceof String) {
                byline = byline.trim();
                return (byline.length > 0) && (byline.length < 100);
            }
            return false;
        },

        /**
         * Converts some of the common HTML entities in string to their corresponding characters.
         *
         * @param str {string} - a string to unescape.
         * @return string without HTML entity.
         */
        _unescapeHtmlEntities: function (str) {
            if (!str) {
                return str;
            }

            var htmlEscapeMap = thisssss.HTML_ESCAPE_MAP;
            return str.replace(/&(quot|amp|apos|lt|gt);/g, function (_, tag) {
                return htmlEscapeMap[tag];
            }).replace(/&#(?:x([0-9a-z]{1,4})|([0-9]{1,4}));/gi, function (_, hex, numStr) {
                var num = parseInt(hex || numStr, hex ? 16 : 10);
                return String.fromCharCode(num);
            });
        },

        /**
         * Try to extract metadata from JSON-LD object.
         * For now, only Schema.org objects of type Article or its subtypes are supported.
         * @return Object with any metadata that could be extracted (possibly none)
         */
        _getJSONLD: function (doc) {
            var scripts = thisssss._getAllNodesWithTag(doc, ["script"]);

            var metadata;

            thisssss._forEachNode(scripts, function (jsonLdElement) {
                if (!metadata && jsonLdElement.getAttribute("type") === "application/ld+json") {
                    try {
                        // Strip CDATA markers if present
                        var content = jsonLdElement.textContent.replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, "");
                        var parsed = JSON.parse(content);
                        if (
                            !parsed["@context"] ||
                            !parsed["@context"].match(/^https?\:\/\/schema\.org\/?$/)
                        ) {
                            return;
                        }

                        if (!parsed["@type"] && Array.isArray(parsed["@graph"])) {
                            parsed = parsed["@graph"].find(function (it) {
                                return (it["@type"] || "").match(
                                    thisssss.REGEXPS.jsonLdArticleTypes
                                );
                            });
                        }

                        if (
                            !parsed ||
                            !parsed["@type"] ||
                            !parsed["@type"].match(thisssss.REGEXPS.jsonLdArticleTypes)
                        ) {
                            return;
                        }

                        metadata = {};

                        if (typeof parsed.name === "string" && typeof parsed.headline === "string" && parsed.name !== parsed.headline) {
                            // we have both name and headline element in the JSON-LD. They should both be the same but some websites like aktualne.cz
                            // put their own name into "name" and the article title to "headline" which confuses Readability. So we try to check if either
                            // "name" or "headline" closely matches the html title, and if so, use that one. If not, then we use "name" by default.

                            var title = thisssss._getArticleTitle();
                            var nameMatches = thisssss._textSimilarity(parsed.name, title) > 0.75;
                            var headlineMatches = thisssss._textSimilarity(parsed.headline, title) > 0.75;

                            if (headlineMatches && !nameMatches) {
                                metadata.title = parsed.headline;
                            } else {
                                metadata.title = parsed.name;
                            }
                        } else if (typeof parsed.name === "string") {
                            metadata.title = parsed.name.trim();
                        } else if (typeof parsed.headline === "string") {
                            metadata.title = parsed.headline.trim();
                        }
                        if (parsed.author) {
                            if (typeof parsed.author.name === "string") {
                                metadata.byline = parsed.author.name.trim();
                            } else if (Array.isArray(parsed.author) && parsed.author[0] && typeof parsed.author[0].name === "string") {
                                metadata.byline = parsed.author
                                    .filter(function (author) {
                                        return author && typeof author.name === "string";
                                    })
                                    .map(function (author) {
                                        return author.name.trim();
                                    })
                                    .join(", ");
                            }
                        }
                        if (typeof parsed.description === "string") {
                            metadata.excerpt = parsed.description.trim();
                        }
                        if (
                            parsed.publisher &&
                            typeof parsed.publisher.name === "string"
                        ) {
                            metadata.siteName = parsed.publisher.name.trim();
                        }
                        if (typeof parsed.datePublished === "string") {
                            metadata.datePublished = parsed.datePublished.trim();
                        }
                        return;
                    } catch (err) {
                        thisssss.log(err.message);
                    }
                }
            });
            return metadata ? metadata : {};
        },

        /**
         * Attempts to get excerpt and byline metadata for the article.
         *
         * @param {Object} jsonld — object containing any metadata that
         * could be extracted from JSON-LD object.
         *
         * @return Object with optional "excerpt" and "byline" properties
         */
        _getArticleMetadata: function (jsonld) {
            var metadata = {};
            var values = {};
            var metaElements = thisssss._doc.getElementsByTagName("meta");

            // property is a space-separated list of values
            var propertyPattern = /\s*(article|dc|dcterm|og|twitter)\s*:\s*(author|creator|description|published_time|title|site_name)\s*/gi;

            // name is a single value
            var namePattern = /^\s*(?:(dc|dcterm|og|twitter|weibo:(article|webpage))\s*[\.:]\s*)?(author|creator|description|title|site_name)\s*$/i;

            // Find description tags.
            thisssss._forEachNode(metaElements, function (element) {
                var elementName = element.getAttribute("name");
                var elementProperty = element.getAttribute("property");
                var content = element.getAttribute("content");
                if (!content) {
                    return;
                }
                var matches = null;
                var name = null;

                if (elementProperty) {
                    matches = elementProperty.match(propertyPattern);
                    if (matches) {
                        // Convert to lowercase, and remove any whitespace
                        // so we can match below.
                        name = matches[0].toLowerCase().replace(/\s/g, "");
                        // multiple authors
                        values[name] = content.trim();
                    }
                }
                if (!matches && elementName && namePattern.test(elementName)) {
                    name = elementName;
                    if (content) {
                        // Convert to lowercase, remove any whitespace, and convert dots
                        // to colons so we can match below.
                        name = name.toLowerCase().replace(/\s/g, "").replace(/\./g, ":");
                        values[name] = content.trim();
                    }
                }
            });

            // get title
            metadata.title = jsonld.title ||
                values["dc:title"] ||
                values["dcterm:title"] ||
                values["og:title"] ||
                values["weibo:article:title"] ||
                values["weibo:webpage:title"] ||
                values["title"] ||
                values["twitter:title"];

            if (!metadata.title) {
                metadata.title = thisssss._getArticleTitle();
            }

            // get author
            metadata.byline = jsonld.byline ||
                values["dc:creator"] ||
                values["dcterm:creator"] ||
                values["author"];

            // get description
            metadata.excerpt = jsonld.excerpt ||
                values["dc:description"] ||
                values["dcterm:description"] ||
                values["og:description"] ||
                values["weibo:article:description"] ||
                values["weibo:webpage:description"] ||
                values["description"] ||
                values["twitter:description"];

            // get site name
            metadata.siteName = jsonld.siteName ||
                values["og:site_name"];

            // get article published time
            metadata.publishedTime = jsonld.datePublished ||
                values["article:published_time"] || null;

            // in many sites the meta value is escaped with HTML entities,
            // so here we need to unescape it
            metadata.title = thisssss._unescapeHtmlEntities(metadata.title);
            metadata.byline = thisssss._unescapeHtmlEntities(metadata.byline);
            metadata.excerpt = thisssss._unescapeHtmlEntities(metadata.excerpt);
            metadata.siteName = thisssss._unescapeHtmlEntities(metadata.siteName);
            metadata.publishedTime = this._unescapeHtmlEntities(metadata.publishedTime);

            return metadata;
        },

        /**
         * Check if node is image, or if node contains exactly only one image
         * whether as a direct child or as its descendants.
         *
         * @param Element
        **/
        _isSingleImage: function (node) {
            if (node.tagName === "IMG") {
                return true;
            }

            if (node.children.length !== 1 || node.textContent.trim() !== "") {
                return false;
            }

            return thisssss._isSingleImage(node.children[0]);
        },

        /**
         * Find all <noscript> that are located after <img> nodes, and which contain only one
         * <img> element. Replace the first image with the image from inside the <noscript> tag,
         * and remove the <noscript> tag. This improves the quality of the images we use on
         * some sites (e.g. Medium).
         *
         * @param Element
        **/
        _unwrapNoscriptImages: function (doc) {
            // Find img without source or attributes that might contains image, and remove it.
            // This is done to prevent a placeholder img is replaced by img from noscript in next step.
            var imgs = Array.from(doc.getElementsByTagName("img"));
            thisssss._forEachNode(imgs, function (img) {
                for (var i = 0; i < img.attributes.length; i++) {
                    var attr = img.attributes[i];
                    switch (attr.name) {
                        case "src":
                        case "srcset":
                        case "data-src":
                        case "data-srcset":
                            return;
                    }

                    if (/\.(jpg|jpeg|png|webp)/i.test(attr.value)) {
                        return;
                    }
                }

                img.parentNode.removeChild(img);
            });

            // Next find noscript and try to extract its image
            var noscripts = Array.from(doc.getElementsByTagName("noscript"));
            thisssss._forEachNode(noscripts, function (noscript) {
                // Parse content of noscript and make sure it only contains image
                var tmp = doc.createElement("div");
                tmp.innerHTML = noscript.innerHTML;
                if (!thisssss._isSingleImage(tmp)) {
                    return;
                }

                // If noscript has previous sibling and it only contains image,
                // replace it with noscript content. However we also keep old
                // attributes that might contains image.
                var prevElement = noscript.previousElementSibling;
                if (prevElement && thisssss._isSingleImage(prevElement)) {
                    var prevImg = prevElement;
                    if (prevImg.tagName !== "IMG") {
                        prevImg = prevElement.getElementsByTagName("img")[0];
                    }

                    var newImg = tmp.getElementsByTagName("img")[0];
                    for (var i = 0; i < prevImg.attributes.length; i++) {
                        var attr = prevImg.attributes[i];
                        if (attr.value === "") {
                            continue;
                        }

                        if (attr.name === "src" || attr.name === "srcset" || /\.(jpg|jpeg|png|webp)/i.test(attr.value)) {
                            if (newImg.getAttribute(attr.name) === attr.value) {
                                continue;
                            }

                            var attrName = attr.name;
                            if (newImg.hasAttribute(attrName)) {
                                attrName = "data-old-" + attrName;
                            }

                            newImg.setAttribute(attrName, attr.value);
                        }
                    }

                    noscript.parentNode.replaceChild(tmp.firstElementChild, prevElement);
                }
            });
        },

        /**
         * Removes script tags from the document.
         *
         * @param Element
        **/
        _removeScripts: function (doc) {
            thisssss._removeNodes(thisssss._getAllNodesWithTag(doc, ["script", "noscript"]));
        },

        /**
         * Check if this node has only whitespace and a single element with given tag
         * Returns false if the DIV node contains non-empty text nodes
         * or if it contains no element with given tag or more than 1 element.
         *
         * @param Element
         * @param string tag of child element
        **/
        _hasSingleTagInsideElement: function (element, tag) {
            // There should be exactly 1 element child with given tag
            if (element.children.length != 1 || element.children[0].tagName !== tag) {
                return false;
            }

            // And there should be no text nodes with real content
            return !thisssss._someNode(element.childNodes, function (node) {
                return node.nodeType === thisssss.TEXT_NODE &&
                    thisssss.REGEXPS.hasContent.test(node.textContent);
            });
        },

        _isElementWithoutContent: function (node) {
            return node.nodeType === thisssss.ELEMENT_NODE &&
                node.textContent.trim().length == 0 &&
                (node.children.length == 0 ||
                    node.children.length == node.getElementsByTagName("br").length + node.getElementsByTagName("hr").length);
        },

        /**
         * Determine whether element has any children block level elements.
         *
         * @param Element
         */
        _hasChildBlockElement: function (element) {
            return thisssss._someNode(element.childNodes, function (node) {
                return thisssss.DIV_TO_P_ELEMS.has(node.tagName) ||
                    thisssss._hasChildBlockElement(node);
            });
        },

        /***
         * Determine if a node qualifies as phrasing content.
         * https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Content_categories#Phrasing_content
        **/
        _isPhrasingContent: function (node) {
            return node.nodeType === thisssss.TEXT_NODE || thisssss.PHRASING_ELEMS.indexOf(node.tagName) !== -1 ||
                ((node.tagName === "A" || node.tagName === "DEL" || node.tagName === "INS") &&
                    thisssss._everyNode(node.childNodes, thisssss._isPhrasingContent));
        },

        _isWhitespace: function (node) {
            return (node.nodeType === thisssss.TEXT_NODE && node.textContent.trim().length === 0) ||
                (node.nodeType === thisssss.ELEMENT_NODE && node.tagName === "BR");
        },

        /**
         * Get the inner text of a node - cross browser compatibly.
         * This also strips out any excess whitespace to be found.
         *
         * @param Element
         * @param Boolean normalizeSpaces (default: true)
         * @return string
        **/
        _getInnerText: function (e, normalizeSpaces) {
            normalizeSpaces = (typeof normalizeSpaces === "undefined") ? true : normalizeSpaces;
            var textContent = e.textContent.trim();

            if (normalizeSpaces) {
                return textContent.replace(thisssss.REGEXPS.normalize, " ");
            }
            return textContent;
        },

        /**
         * Get the number of times a string s appears in the node e.
         *
         * @param Element
         * @param string - what to split on. Default is ","
         * @return number (integer)
        **/
        _getCharCount: function (e, s) {
            s = s || ",";
            return thisssss._getInnerText(e).split(s).length - 1;
        },

        /**
         * Remove the style attribute on every e and under.
         * TODO: Test if getElementsByTagName(*) is faster.
         *
         * @param Element
         * @return void
        **/
        _cleanStyles: function (e) {
            if (!e || e.tagName.toLowerCase() === "svg")
                return;

            // Remove `style` and deprecated presentational attributes
            for (var i = 0; i < thisssss.PRESENTATIONAL_ATTRIBUTES.length; i++) {
                e.removeAttribute(thisssss.PRESENTATIONAL_ATTRIBUTES[i]);
            }

            if (thisssss.DEPRECATED_SIZE_ATTRIBUTE_ELEMS.indexOf(e.tagName) !== -1) {
                e.removeAttribute("width");
                e.removeAttribute("height");
            }

            var cur = e.firstElementChild;
            while (cur !== null) {
                thisssss._cleanStyles(cur);
                cur = cur.nextElementSibling;
            }
        },

        /**
         * Get the density of links as a percentage of the content
         * This is the amount of text that is inside a link divided by the total text in the node.
         *
         * @param Element
         * @return number (float)
        **/
        _getLinkDensity: function (element) {
            var textLength = thisssss._getInnerText(element).length;
            if (textLength === 0)
                return 0;

            var linkLength = 0;

            // XXX implement _reduceNodeList?
            thisssss._forEachNode(element.getElementsByTagName("a"), function (linkNode) {
                var href = linkNode.getAttribute("href");
                var coefficient = href && thisssss.REGEXPS.hashUrl.test(href) ? 0.3 : 1;
                linkLength += thisssss._getInnerText(linkNode).length * coefficient;
            });

            return linkLength / textLength;
        },

        /**
         * Get an elements class/id weight. Uses regular expressions to tell if this
         * element looks good or bad.
         *
         * @param Element
         * @return number (Integer)
        **/
        _getClassWeight: function (e) {
            if (!thisssss._flagIsActive(thisssss.FLAG_WEIGHT_CLASSES))
                return 0;

            var weight = 0;

            // Look for a special classname
            if (typeof (e.className) === "string" && e.className !== "") {
                if (thisssss.REGEXPS.negative.test(e.className))
                    weight -= 25;

                if (thisssss.REGEXPS.positive.test(e.className))
                    weight += 25;
            }

            // Look for a special ID
            if (typeof (e.id) === "string" && e.id !== "") {
                if (thisssss.REGEXPS.negative.test(e.id))
                    weight -= 25;

                if (thisssss.REGEXPS.positive.test(e.id))
                    weight += 25;
            }

            return weight;
        },

        /**
         * Clean a node of all elements of type "tag".
         * (Unless it's a youtube/vimeo video. People love movies.)
         *
         * @param Element
         * @param string tag to clean
         * @return void
         **/
        _clean: function (e, tag) {
            var isEmbed = ["object", "embed", "iframe"].indexOf(tag) !== -1;

            thisssss._removeNodes(thisssss._getAllNodesWithTag(e, [tag]), function (element) {
                // Allow youtube and vimeo videos through as people usually want to see those.
                if (isEmbed) {
                    // First, check the elements attributes to see if any of them contain youtube or vimeo
                    for (var i = 0; i < element.attributes.length; i++) {
                        if (thisssss._allowedVideoRegex.test(element.attributes[i].value)) {
                            return false;
                        }
                    }

                    // For embed with <object> tag, check inner HTML as well.
                    if (element.tagName === "object" && thisssss._allowedVideoRegex.test(element.innerHTML)) {
                        return false;
                    }
                }

                return true;
            });
        },

        /**
         * Check if a given node has one of its ancestor tag name matching the
         * provided one.
         * @param  HTMLElement node
         * @param  String      tagName
         * @param  Number      maxDepth
         * @param  Function    filterFn a filter to invoke to determine whether this node 'counts'
         * @return Boolean
         */
        _hasAncestorTag: function (node, tagName, maxDepth, filterFn) {
            maxDepth = maxDepth || 3;
            tagName = tagName.toUpperCase();
            var depth = 0;
            while (node.parentNode) {
                if (maxDepth > 0 && depth > maxDepth)
                    return false;
                if (node.parentNode.tagName === tagName && (!filterFn || filterFn(node.parentNode)))
                    return true;
                node = node.parentNode;
                depth++;
            }
            return false;
        },

        /**
         * Return an object indicating how many rows and columns this table has.
         */
        _getRowAndColumnCount: function (table) {
            var rows = 0;
            var columns = 0;
            var trs = table.getElementsByTagName("tr");
            for (var i = 0; i < trs.length; i++) {
                var rowspan = trs[i].getAttribute("rowspan") || 0;
                if (rowspan) {
                    rowspan = parseInt(rowspan, 10);
                }
                rows += (rowspan || 1);

                // Now look for column-related info
                var columnsInThisRow = 0;
                var cells = trs[i].getElementsByTagName("td");
                for (var j = 0; j < cells.length; j++) {
                    var colspan = cells[j].getAttribute("colspan") || 0;
                    if (colspan) {
                        colspan = parseInt(colspan, 10);
                    }
                    columnsInThisRow += (colspan || 1);
                }
                columns = Math.max(columns, columnsInThisRow);
            }
            return { rows: rows, columns: columns };
        },

        /**
         * Look for 'data' (as opposed to 'layout') tables, for which we use
         * similar checks as
         * https://searchfox.org/mozilla-central/rev/f82d5c549f046cb64ce5602bfd894b7ae807c8f8/accessible/generic/TableAccessible.cpp#19
         */
        _markDataTables: function (root) {
            var tables = root.getElementsByTagName("table");
            for (var i = 0; i < tables.length; i++) {
                var table = tables[i];
                var role = table.getAttribute("role");
                if (role == "presentation") {
                    table._readabilityDataTable = false;
                    continue;
                }
                var datatable = table.getAttribute("datatable");
                if (datatable == "0") {
                    table._readabilityDataTable = false;
                    continue;
                }
                var summary = table.getAttribute("summary");
                if (summary) {
                    table._readabilityDataTable = true;
                    continue;
                }

                var caption = table.getElementsByTagName("caption")[0];
                if (caption && caption.childNodes.length > 0) {
                    table._readabilityDataTable = true;
                    continue;
                }

                // If the table has a descendant with any of these tags, consider a data table:
                var dataTableDescendants = ["col", "colgroup", "tfoot", "thead", "th"];
                var descendantExists = function (tag) {
                    return !!table.getElementsByTagName(tag)[0];
                };
                if (dataTableDescendants.some(descendantExists)) {
                    thisssss.log("Data table because found data-y descendant");
                    table._readabilityDataTable = true;
                    continue;
                }

                // Nested tables indicate a layout table:
                if (table.getElementsByTagName("table")[0]) {
                    table._readabilityDataTable = false;
                    continue;
                }

                var sizeInfo = thisssss._getRowAndColumnCount(table);
                if (sizeInfo.rows >= 10 || sizeInfo.columns > 4) {
                    table._readabilityDataTable = true;
                    continue;
                }
                // Now just go by size entirely:
                table._readabilityDataTable = sizeInfo.rows * sizeInfo.columns > 10;
            }
        },

        /* convert images and figures that have properties like data-src into images that can be loaded without JS */
        _fixLazyImages: function (root) {
            thisssss._forEachNode(thisssss._getAllNodesWithTag(root, ["img", "picture", "figure"]), function (elem) {
                // In some sites (e.g. Kotaku), they put 1px square image as base64 data uri in the src attribute.
                // So, here we check if the data uri is too short, just might as well remove it.
                if (elem.src && thisssss.REGEXPS.b64DataUrl.test(elem.src)) {
                    // Make sure it's not SVG, because SVG can have a meaningful image in under 133 bytes.
                    var parts = thisssss.REGEXPS.b64DataUrl.exec(elem.src);
                    if (parts[1] === "image/svg+xml") {
                        return;
                    }

                    // Make sure this element has other attributes which contains image.
                    // If it doesn't, then this src is important and shouldn't be removed.
                    var srcCouldBeRemoved = false;
                    for (var i = 0; i < elem.attributes.length; i++) {
                        var attr = elem.attributes[i];
                        if (attr.name === "src") {
                            continue;
                        }

                        if (/\.(jpg|jpeg|png|webp)/i.test(attr.value)) {
                            srcCouldBeRemoved = true;
                            break;
                        }
                    }

                    // Here we assume if image is less than 100 bytes (or 133B after encoded to base64)
                    // it will be too small, therefore it might be placeholder image.
                    if (srcCouldBeRemoved) {
                        var b64starts = elem.src.search(/base64\s*/i) + 7;
                        var b64length = elem.src.length - b64starts;
                        if (b64length < 133) {
                            elem.removeAttribute("src");
                        }
                    }
                }

                // also check for "null" to work around https://github.com/jsdom/jsdom/issues/2580
                if ((elem.src || (elem.srcset && elem.srcset != "null")) && elem.className.toLowerCase().indexOf("lazy") === -1) {
                    return;
                }

                for (var j = 0; j < elem.attributes.length; j++) {
                    attr = elem.attributes[j];
                    if (attr.name === "src" || attr.name === "srcset" || attr.name === "alt") {
                        continue;
                    }
                    var copyTo = null;
                    if (/\.(jpg|jpeg|png|webp)\s+\d/.test(attr.value)) {
                        copyTo = "srcset";
                    } else if (/^\s*\S+\.(jpg|jpeg|png|webp)\S*\s*$/.test(attr.value)) {
                        copyTo = "src";
                    }
                    if (copyTo) {
                        //if this is an img or picture, set the attribute directly
                        if (elem.tagName === "IMG" || elem.tagName === "PICTURE") {
                            elem.setAttribute(copyTo, attr.value);
                        } else if (elem.tagName === "FIGURE" && !thisssss._getAllNodesWithTag(elem, ["img", "picture"]).length) {
                            //if the item is a <figure> that does not contain an image or picture, create one and place it inside the figure
                            //see the nytimes-3 testcase for an example
                            var img = thisssss._doc.createElement("img");
                            img.setAttribute(copyTo, attr.value);
                            elem.appendChild(img);
                        }
                    }
                }
            });
        },

        _getTextDensity: function (e, tags) {
            var textLength = thisssss._getInnerText(e, true).length;
            if (textLength === 0) {
                return 0;
            }
            var childrenLength = 0;
            var children = thisssss._getAllNodesWithTag(e, tags);
            thisssss._forEachNode(children, (child) => childrenLength += thisssss._getInnerText(child, true).length);
            return childrenLength / textLength;
        },

        /**
         * Clean an element of all tags of type "tag" if they look fishy.
         * "Fishy" is an algorithm based on content length, classnames, link density, number of images & embeds, etc.
         *
         * @return void
         **/
        _cleanConditionally: function (e, tag) {
            if (!thisssss._flagIsActive(thisssss.FLAG_CLEAN_CONDITIONALLY))
                return;

            // Gather counts for other typical elements embedded within.
            // Traverse backwards so we can remove nodes at the same time
            // without effecting the traversal.
            //
            // TODO: Consider taking into account original contentScore here.
            thisssss._removeNodes(thisssss._getAllNodesWithTag(e, [tag]), function (node) {
                // First check if this node IS data table, in which case don't remove it.
                var isDataTable = function (t) {
                    return t._readabilityDataTable;
                };

                var isList = tag === "ul" || tag === "ol";
                if (!isList) {
                    var listLength = 0;
                    var listNodes = thisssss._getAllNodesWithTag(node, ["ul", "ol"]);
                    thisssss._forEachNode(listNodes, (list) => listLength += thisssss._getInnerText(list).length);
                    isList = listLength / thisssss._getInnerText(node).length > 0.9;
                }

                if (tag === "table" && isDataTable(node)) {
                    return false;
                }

                // Next check if we're inside a data table, in which case don't remove it as well.
                if (thisssss._hasAncestorTag(node, "table", -1, isDataTable)) {
                    return false;
                }

                if (thisssss._hasAncestorTag(node, "code")) {
                    return false;
                }

                var weight = thisssss._getClassWeight(node);

                thisssss.log("Cleaning Conditionally", node);

                var contentScore = 0;

                if (weight + contentScore < 0) {
                    return true;
                }

                if (thisssss._getCharCount(node, ",") < 10) {
                    // If there are not very many commas, and the number of
                    // non-paragraph elements is more than paragraphs or other
                    // ominous signs, remove the element.
                    var p = node.getElementsByTagName("p").length;
                    var img = node.getElementsByTagName("img").length;
                    var li = node.getElementsByTagName("li").length - 100;
                    var input = node.getElementsByTagName("input").length;
                    var headingDensity = thisssss._getTextDensity(node, ["h1", "h2", "h3", "h4", "h5", "h6"]);

                    var embedCount = 0;
                    var embeds = thisssss._getAllNodesWithTag(node, ["object", "embed", "iframe"]);

                    for (var i = 0; i < embeds.length; i++) {
                        // If this embed has attribute that matches video regex, don't delete it.
                        for (var j = 0; j < embeds[i].attributes.length; j++) {
                            if (thisssss._allowedVideoRegex.test(embeds[i].attributes[j].value)) {
                                return false;
                            }
                        }

                        // For embed with <object> tag, check inner HTML as well.
                        if (embeds[i].tagName === "object" && thisssss._allowedVideoRegex.test(embeds[i].innerHTML)) {
                            return false;
                        }

                        embedCount++;
                    }

                    var linkDensity = thisssss._getLinkDensity(node);
                    var contentLength = thisssss._getInnerText(node).length;

                    var haveToRemove =
                        (img > 1 && p / img < 0.5 && !thisssss._hasAncestorTag(node, "figure")) ||
                        (!isList && li > p) ||
                        (input > Math.floor(p / 3)) ||
                        (!isList && headingDensity < 0.9 && contentLength < 25 && (img === 0 || img > 2) && !thisssss._hasAncestorTag(node, "figure")) ||
                        (!isList && weight < 25 && linkDensity > 0.2) ||
                        (weight >= 25 && linkDensity > 0.5) ||
                        ((embedCount === 1 && contentLength < 75) || embedCount > 1);
                    // Allow simple lists of images to remain in pages
                    if (isList && haveToRemove) {
                        for (var x = 0; x < node.children.length; x++) {
                            let child = node.children[x];
                            // Don't filter in lists with li's that contain more than one child
                            if (child.children.length > 1) {
                                return haveToRemove;
                            }
                        }
                        let li_count = node.getElementsByTagName("li").length;
                        // Only allow the list to remain if every li contains an image
                        if (img == li_count) {
                            return false;
                        }
                    }
                    return haveToRemove;
                }
                return false;
            });
        },

        /**
         * Clean out elements that match the specified conditions
         *
         * @param Element
         * @param Function determines whether a node should be removed
         * @return void
         **/
        _cleanMatchedNodes: function (e, filter) {
            var endOfSearchMarkerNode = thisssss._getNextNode(e, true);
            var next = thisssss._getNextNode(e);
            while (next && next != endOfSearchMarkerNode) {
                if (filter.call(this, next, next.className + " " + next.id)) {
                    next = thisssss._removeAndGetNext(next);
                } else {
                    next = thisssss._getNextNode(next);
                }
            }
        },

        /**
         * Clean out spurious headers from an Element.
         *
         * @param Element
         * @return void
        **/
        _cleanHeaders: function (e) {
            let headingNodes = thisssss._getAllNodesWithTag(e, ["h1", "h2"]);
            thisssss._removeNodes(headingNodes, function (node) {
                let shouldRemove = thisssss._getClassWeight(node) < 0;
                if (shouldRemove) {
                    thisssss.log("Removing header with low class weight:", node);
                }
                return shouldRemove;
            });
        },

        /**
         * Check if this node is an H1 or H2 element whose content is mostly
         * the same as the article title.
         *
         * @param Element  the node to check.
         * @return boolean indicating whether this is a title-like header.
         */
        _headerDuplicatesTitle: function (node) {
            if (node.tagName != "H1" && node.tagName != "H2") {
                return false;
            }
            var heading = thisssss._getInnerText(node, false);
            thisssss.log("Evaluating similarity of header:", heading, thisssss._articleTitle);
            return thisssss._textSimilarity(thisssss._articleTitle, heading) > 0.75;
        },

        _flagIsActive: function (flag) {
            return (thisssss._flags & flag) > 0;
        },

        _removeFlag: function (flag) {
            thisssss._flags = thisssss._flags & ~flag;
        },

        _isProbablyVisible: function (node) {
            // Have to null-check node.style and node.className.indexOf to deal with SVG and MathML nodes.
            return (!node.style || node.style.display != "none")
                && (!node.style || node.style.visibility != "hidden")
                && !node.hasAttribute("hidden")
                //check for "fallback-image" so that wikimedia math images are displayed
                && (!node.hasAttribute("aria-hidden") || node.getAttribute("aria-hidden") != "true" || (node.className && node.className.indexOf && node.className.indexOf("fallback-image") !== -1));
        },

        /**
         * Runs readability.
         *
         * Workflow:
         *  1. Prep the document by removing script tags, css, etc.
         *  2. Build readability's DOM tree.
         *  3. Grab the article content from the current dom tree.
         *  4. Replace the current DOM tree with the new one.
         *  5. Read peacefully.
         *
         * @return void
         **/
        parse: function () {
            // Avoid parsing too large documents, as per configuration option
            if (thisssss._maxElemsToParse > 0) {
                var numTags = thisssss._doc.getElementsByTagName("*").length;
                if (numTags > thisssss._maxElemsToParse) {
                    throw new Error("Aborting parsing document; " + numTags + " elements found");
                }
            }

            // Unwrap image from noscript
            thisssss._unwrapNoscriptImages(thisssss._doc);

            // Extract JSON-LD metadata before removing scripts
            var jsonLd = thisssss._disableJSONLD ? {} : thisssss._getJSONLD(thisssss._doc);

            // Remove script tags from the document.
            thisssss._removeScripts(thisssss._doc);

            thisssss._prepDocument();

            var metadata = thisssss._getArticleMetadata(jsonLd);
            thisssss._articleTitle = metadata.title;

            var articleContent = thisssss._grabArticle();
            if (!articleContent)
                return null;

            thisssss.log("Grabbed: " + articleContent.innerHTML);

            thisssss._postProcessContent(articleContent);

            // If we haven't found an excerpt in the article's metadata, use the article's
            // first paragraph as the excerpt. This is used for displaying a preview of
            // the article's content.
            if (!metadata.excerpt) {
                var paragraphs = articleContent.getElementsByTagName("p");
                if (paragraphs.length > 0) {
                    metadata.excerpt = paragraphs[0].textContent.trim();
                }
            }

            var textContent = articleContent.textContent;
            return {
                title: thisssss._articleTitle,
                byline: metadata.byline || thisssss._articleByline,
                dir: thisssss._articleDir,
                lang: thisssss._articleLang,
                content: thisssss._serializer(articleContent),
                textContent: textContent,
                length: textContent.length,
                excerpt: metadata.excerpt,
                siteName: metadata.siteName || thisssss._articleSiteName,
                publishedTime: metadata.publishedTime
            };
        }
    };

    // In some older versions, people passed a URI as the first argument. Cope:
    if (options && options.documentElement) {
        doc = options;
        options = arguments[2];
    } else if (!doc || !doc.documentElement) {
        throw new Error("First argument to Readability constructor should be a document object.");
    }
    options = options || {};

    thisssss._doc = doc;
    thisssss._docJSDOMParser = thisssss._doc.firstChild.__JSDOMParser__;
    thisssss._articleTitle = null;
    thisssss._articleByline = null;
    thisssss._articleDir = null;
    thisssss._articleSiteName = null;
    thisssss._attempts = [];

    // Configurable options
    thisssss._debug = !!options.debug;
    thisssss._maxElemsToParse = options.maxElemsToParse || thisssss.DEFAULT_MAX_ELEMS_TO_PARSE;
    thisssss._nbTopCandidates = options.nbTopCandidates || thisssss.DEFAULT_N_TOP_CANDIDATES;
    thisssss._charThreshold = options.charThreshold || thisssss.DEFAULT_CHAR_THRESHOLD;
    thisssss._classesToPreserve = ["page"];
    thisssss._keepClasses = !!options.keepClasses;
    thisssss._serializer = options.serializer || function (el) {
        return el.innerHTML;
    };
    thisssss._disableJSONLD = !!options.disableJSONLD;
    thisssss._allowedVideoRegex = options.allowedVideoRegex || thisssss.REGEXPS.videos;

    // Start with all flags set
    thisssss._flags = thisssss.FLAG_STRIP_UNLIKELYS |
        thisssss.FLAG_WEIGHT_CLASSES |
        thisssss.FLAG_CLEAN_CONDITIONALLY;


    // Control whether log messages are sent to the console
    if (thisssss._debug) {
        let logNode = function (node) {
            if (node.nodeType == node.TEXT_NODE) {
                return `${node.nodeName} ("${node.textContent}")`;
            }
            let attrPairs = Array.from(node.attributes || [], function (attr) {
                return `${attr.name}="${attr.value}"`;
            }).join(" ");
            return `<${node.localName} ${attrPairs}>`;
        };
        thisssss.log = function () {
            if (typeof console !== "undefined") {
                let args = Array.from(arguments, arg => {
                    if (arg && arg.nodeType == thisssss.ELEMENT_NODE) {
                        return logNode(arg);
                    }
                    return arg;
                });
                args.unshift("Reader: (Readability)");
                console.log.apply(console, args);
            } else if (typeof dump !== "undefined") {
                /* global dump */
                var msg = Array.prototype.map.call(arguments, function (x) {
                    return (x && x.nodeName) ? logNode(x) : x;
                }).join(" ");
                dump("Reader: (Readability) " + msg + "\n");
            }
        };
    } else {
        thisssss.log = function () { };
    }

    return thisssss;
}

var REGEXPS = {
    // NOTE: These two regular expressions are duplicated in
    // Readability.js. Please keep both copies in sync.
    unlikelyCandidates: /-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i,
    okMaybeItsACandidate: /and|article|body|column|content|main|shadow/i,
};

function isNodeVisible(node) {
    // Have to null-check node.style and node.className.indexOf to deal with SVG and MathML nodes.
    return (!node.style || node.style.display != "none")
        && !node.hasAttribute("hidden")
        //check for "fallback-image" so that wikimedia math images are displayed
        && (!node.hasAttribute("aria-hidden") || node.getAttribute("aria-hidden") != "true" || (node.className && node.className.indexOf && node.className.indexOf("fallback-image") !== -1));
}

/**
 * Decides whether or not the document is reader-able without parsing the whole thing.
 * @param {Object} options Configuration object.
 * @param {number} [options.minContentLength=140] The minimum node content length used to decide if the document is readerable.
 * @param {number} [options.minScore=20] The minumum cumulated 'score' used to determine if the document is readerable.
 * @param {Function} [options.visibilityChecker=isNodeVisible] The function used to determine if a node is visible.
 * @return {boolean} Whether or not we suspect Readability.parse() will suceeed at returning an article object.
 */
function isProbablyReaderable(doc, options = {}) {
    // For backward compatibility reasons 'options' can either be a configuration object or the function used
    // to determine if a node is visible.
    if (typeof options == "function") {
        options = { visibilityChecker: options };
    }

    var defaultOptions = { minScore: 20, minContentLength: 140, visibilityChecker: isNodeVisible };
    options = Object.assign(defaultOptions, options);

    var nodes = doc.querySelectorAll("p, pre, article");

    // Get <div> nodes which have <br> node(s) and append them into the `nodes` variable.
    // Some articles' DOM structures might look like
    // <div>
    //   Sentences<br>
    //   <br>
    //   Sentences<br>
    // </div>
    var brNodes = doc.querySelectorAll("div > br");
    if (brNodes.length) {
        var set = new Set(nodes);
        [].forEach.call(brNodes, function (node) {
            set.add(node.parentNode);
        });
        nodes = Array.from(set);
    }

    var score = 0;
    // This is a little cheeky, we use the accumulator 'score' to decide what to return from
    // this callback:
    return [].some.call(nodes, function (node) {
        if (!options.visibilityChecker(node)) {
            return false;
        }

        var matchString = node.className + " " + node.id;
        if (REGEXPS.unlikelyCandidates.test(matchString) &&
            !REGEXPS.okMaybeItsACandidate.test(matchString)) {
            return false;
        }

        if (node.matches("li p")) {
            return false;
        }

        var textContentLength = node.textContent.trim().length;
        if (textContentLength < options.minContentLength) {
            return false;
        }

        score += Math.sqrt(textContentLength - options.minContentLength);

        if (score > options.minScore) {
            return true;
        }
        return false;
    });
}