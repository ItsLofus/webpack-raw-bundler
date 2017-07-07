A Webpack plugin to merge your files together, unedited, into a single file.

# Getting Started

```bash
npm install webpack-raw-bundler
```

# Usage

When you need to include a bunch of libraries, but don't have time to make the ordinary require statements, use this to bundle them all together so that their globals are actually global.
In other words, From the old:
``` html
<script src="js/jquery.js"></script>
<script src="js/silly.js"></script>
<script>
	$(silly()); // Some function in silly.js's global scope
</script>
```
To the new:
``` html
<script src="js/bundle.js"></script>
<script>
	$(silly()); 
</script>
```


# Installing to the config
``` javascript
var RawBundlerPlugin = require('webpack-raw-bundler');
  
module.exports = {
plugins: [
    new RawBundlerPlugin({
            excludedFilenames: [/angulartics/],
            readEncoding: "utf-8",
            includeFilePathComments: false,
			allowDuplicatesInBundle: false,
			printProgress: false,
			fileEnding: "\n\n",
			commentTags: { Start: "/* ", End: " */" },
            bundles: [ "vendor.js", "styles.css", "vendor.lib.js" ],
            "vendor.js": [
			'js/*.js'
            ],
			"vendor.lib.js": [{
                path: "../build/*.js",
                match: /vendor/
            }],
			"styles.css": [
			'css/bootstrap.css',
			'css/edits.css'
			]
    })
]
}

```
## Example Output

This generates two files with merged js and css content.

``` html
<script src="./vendor.js"></script>
<link rel="stylesheet" href="./styles.css">
```

### What Actually Happens
Say we have a bundle defined as follows:

``` javascript
"complete.js": [
	"a.js",
	"b.js"
]
```
And the following file contents:
``` javascript
// a.js
function a_simple() {
	console.log("a_simple called.");
}
var a_global = function () { a_simple(); };
```
``` javascript
// b.js
function b_simple() {
	console.log("b_simple called.");
}
var b_global = function () { a_simple(); b_simple(); };
```
When webpack is called, the following complete.js will be made:
``` javascript
// complete.js

// a.js
function a_simple() {
	console.log("a_simple called.");
}
var a_global = function () { a_simple(); };

// b.js
function b_simple() {
	console.log("b_simple called.");
}
var b_global = function () { a_simple(); b_simple(); };
```
Note: The file names will not be appended to the tops of the files. I just wrote that for clarity. If you want to see what files are being bundled, flag `includeFilePathComments` as true.
# Options

## bundles 
(Required)

The output files to be made. These will be outputted to the same directory as set in `module.exports.output.path` of your webpack.config

## [Files] 
(Required)
 
Must have the same name as a member of bundles. The sub-array are the files to are be included in the bundle. The sub-array has the following format options:
``` javascript
"bundle_name.extension" : [
	"pathtype1.ext",
	"*.ext",
	{
		path: "pathtype2.ext"
		match: /good_file_standard/ /* Overpowerd by the exlusion variable */
	},
	{ path: "*.ext2" }
]
```
If a path is given a wildcard, it will add all files, including all subdirectories, with the appropiate file extension from that folder on.

## excludedFilenames
default: []

An array of regexp expressions that if a dynamically found filename is matched, will not be included.

## readEncoding
default: utf-8

The encoding nodejs reads in. Look up the documentation for more information.

## includeFilePathComments
default: false 

Puts the file path of the added file in a `/**/` comment style before the bundled file contents.
Note: If reading from an invlaid encoding type, ie: settings are utf-8 but file is encoded in utf-8-BOM, then you may seem some non-rendering character generated after this.

## allowDuplicatesInBundle
default: false

Per individual file bundle, are identical file names allowed to be parsed?

## printProgress
default: false

At compile time, prints the current files being bundled to the console. Note: Since this plugin runs with async helpers, this output tends to get messy with multiple bundles.

## commentTags
default: `{ Start: "/* ", End: " */" }`

The comment flags that the path to the current bundled file gets wrapped in. Only read if `includeFilePathComments` is true. 

## fileEnding
default: `\n\n`

The string that gets appended to the end of a bundled file. Two new lines are the default for easy reading. 

### TODO
```
Add support for `useAsLoader`
Add per bundle support for exlcusions
```