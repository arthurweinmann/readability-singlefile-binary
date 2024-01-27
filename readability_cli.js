import { parse } from "https://deno.land/std@0.83.0/flags/mod.ts";
import { readFileSync, writeFile } from "node:fs";
import { Readability } from "./readability";
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