# Mozilla Readibility as a single executable binary

The original package is available at https://github.com/mozilla/readability.

An already compiled binary is available as a github release in this repository. You can also compile it yourself with the instructions below.

# How to use

```
./readability --sourcefile index.html --outputfile very_readable.html
```

# Compile your own version

Install Deno:

(Instruction for Macos and Linux, more options available at https://deno.land/manual@v1.34.3/getting_started/installation)
```
curl -fsSL https://deno.land/x/install/install.sh | sh
```

Then run:
```
deno compile --allow-read --unstable --allow-env --allow-net --output=readability readability.js
```

# License

See LICENSE.md. 
It is the license from Arc90 javascript library upon which Readability is based. 
It is also the one adopted by the Mozilla repository.

# Credits

https://github.com/mozilla/readability