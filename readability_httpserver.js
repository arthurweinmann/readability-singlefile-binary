import { parse } from "https://deno.land/std@0.83.0/flags/mod.ts";
import { readFileSync, writeFile } from "node:fs";
import { join } from "https://deno.land/std@0.212.0/path/join.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts"
import { Readability } from "./readability";

const { homedir, listenon, port } = parse(Deno.args);
const nport = parseInt(port);
if (typeof nport !== 'number') {
    throw new Error("we need port to represent a valid number");
}

Deno.serve({ port: nport, hostname: listenon }, (_req, _info) => {
    const pathname = new URL(_req.url).pathname;
    if (containsDotDot(pathname)) {
        return new Response("403: double dots in pathname are forbidden to enhance security", {
            status: 403,
        });
    }

    const filelocation = join(homedir, pathname);

    let source;
    try {
        source = readFile(filelocation);
    } catch (e) {
        return new Response("404: file not found: " + e, {
            status: 404,
        });
    }
    let rd = Readability(sourceToDoc(source)).parse();

    let content = rd.content.replace(`<div id="readability-page-1" class="page"><div>`, `<div id="readability-page-1" class="page"><div>\n<h1>` + rd.title + `</h1>`);

    let p = new Promise((resolve, reject) => {
        let done = 0;
        let sent = false;
        const cb = (err) => {
            if (sent) {
                return;
            }
            if (err) {
                sent = true;
                resolve(new Response("501: " + err, {
                    status: 501,
                }));
                return;
            }
            done++;
            if (done === 2) {
                sent = true;
                resolve(new Response({ success: true }, {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }));
                return;
            }
        };
        writeFile(filelocation + ".readable.html", content, cb);
        writeFile(filelocation + ".readable.txt", rd.title + "\n" + rd.textContent, cb);
    });

    return p;
});

// Check for .. in the path and respond with an error if it is present
// otherwise users could access any file on the server
function containsDotDot(v) {
    if (!v.includes("..")) {
        return false;
    }
    const fields = v.split(/[/\\]/);
    for (let i = 0; i < fields.length; i++) {
        if (fields[i] === "..") {
            return true;
        }
    }
    return false;
}

function readFile(filePath) {
    return readFileSync(filePath, { encoding: "utf-8" }).trim();
}

// source is a string of all the html
function sourceToDoc(source) {
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