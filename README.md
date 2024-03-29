# Mozilla Readibility as a single executable binary

The original package is available at https://github.com/mozilla/readability.

The cli executable tool from this repository strips away clutter like buttons, ads, background images, and videos. It outputs html and text great for reading or parsing (for a web crawler for example).

# Binary Download and Installation

For a quick start, you can download a pre-compiled binary available in the Releases section of this repository. It provides an effortless way to access the package without delving into the compilation process.

# Compiling the Package

Install Deno:

(Instruction for Macos and Linux, more options available at https://deno.land/manual@v1.34.3/getting_started/installation)
```
curl -fsSL https://deno.land/x/install/install.sh | sh
```

Then run:
```
deno compile --unstable --allow-read --allow-write --allow-net --allow-env --output=readability_cli readability_cli.js
deno compile --unstable --allow-read --allow-write --allow-net --allow-env --output=readability_httpserver readability_httpserver.js
```

# How to use

## HTTP Server

```
./readability_httpserver --homedir /path/to/home/directory --listenon "127.0.0.1" --port 8080
```

Then `curl -X POST "/path/to/home/directory/path/to/html/file/to/make/more/readable.html"`, readability_httpserver will write `/path/to/home/directory/path/to/html/file/to/make/more/readable.readable.html` and `/path/to/home/directory/path/to/html/file/to/make/more/readable.readable.txt` in the same location.

## CLI

```
./readability_cli --sourcefile index.html --outputfile very_readable.html
```

# License

See LICENSE.md. 
It is the license from Arc90 javascript library upon which Readability is based. 
It is also the one adopted by the Mozilla repository.

# Credits

https://github.com/mozilla/readability
