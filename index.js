var fs = require('fs');

var ExcludeRegexp;
var useAsLoader;
var Bundles;
var includeFilePaths;
var Encoding;
var AllowDuplicatesInBundle;


function MergeIntoFile(options) {
    ExcludeRegexp = options.excludedFilenames || null;
    useAsLoader = options.useAsLoader || false;
    includeFilePaths = options.includeFilePathComments || false;
    Encoding = options.readEncoding || null;
    AllowDuplicatesInBundle = options.allowDuplicatesInBundle || false;
    Bundles = options.bundles;

    this.options = options;
}


function isExcluded(aString, currentBundleOptions) {
    var isIncluded = (currentBundleOptions && currentBundleOptions.match)
        ? currentBundleOptions.match.test(aString)
        : true;

    return ExcludeRegexp && isIncluded
        ? ExcludeRegexp.some(function (exp) {
            return exp.test(aString)
        })
        : !isIncluded;
}


// List all files in a directory in Node.js recursively in a synchronous fashion
var walkSync = function (dir, filelist, ext, currentBundleOptions) {
    var path = path || require('path');
    var fs = fs || require('fs');
    var files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            filelist = walkSync(path.join(dir, file), filelist, ext, currentBundleOptions);
        }
        else {
            if (file.match(new RegExp("." + ext + "$")) && !isExcluded(file, currentBundleOptions))
                filelist.push(path.join(dir, file));
        }
    });
    return filelist;
};

var RelativeRegexp = /(.*?)\*.(.*?)$/;
var FileExt = null;
var BeenHere = {};
function mergeFiles(list, currentBundleOptions, callback, ind) {
    if (!ind) ind = 0;
    if (!AllowDuplicatesInBundle && BeenHere[list]) ind++; else BeenHere[list] = 1;
    
    // Parse a folder for it's files dynamically 
    if (FileExt == null && (currentBundleOptions || typeof list == "string")) {
        var useThisString = (currentBundleOptions) ? currentBundleOptions.path : ((typeof list == "string") ? list : list[ind]);
        var Matched = useThisString.match(RelativeRegexp);
        if (Matched) {
            FileExt = Matched[2];
            list = walkSync(Matched[1], [], FileExt, currentBundleOptions);
            currentBundleOptions = null; // Clear out the options to keep on processing
        } 
    }

    var curfile = (currentBundleOptions) ? currentBundleOptions.path : ((typeof list == "string") ? list : list[ind]);
    //console.log("cf: " + curfile + " | i: " + ind);

    // Recursive ending conditions
    if (typeof list == "string") {
        if (ind > 0) {
            return callback(null, "");
        }
    } else if (ind >= list.length) {
        return callback(null, "");
    }

  

  fs.readFile(curfile, Encoding, (err, body) =>{ 
      if (err) return callback(err);

      // Add the debug tags to see what file is what
      if(includeFilePaths)
        body = "/* " + curfile + " */\n" + body;


    mergeFiles(list, currentBundleOptions, (err, otherFilesBody)=>{
      if(err) return callback(err);
      callback(null, body+"\n\n"+otherFilesBody)
    }, ind+1)
  })
}

MergeIntoFile.prototype.apply = function(compiler) {
  var options = this.options;
  compiler.plugin('emit', function(compilation, callback) {
    var count=0;
    var file2createCnt = 0;
    Bundles.forEach(function (filename) {
        var files = options[filename];
        BeenHere = {};
        // files gets the array of the bundle's options
        for (var i = 0; i < files.length; i++) {
            FileExt = null;
            var BundleMe;
            var currentBundlePartOptions;

            if (typeof files[i] == "string") {
                BundleMe = files[i];
                currentBundlePartOptions = null;
            } else {
                BundleMe = files[i].path;
                currentBundlePartOptions = files[i];
            }

            file2createCnt++;
            (function (filenaname2create) {
                mergeFiles(BundleMe, currentBundlePartOptions, (err, content) => {
                    if (err) return callback(err);
                    compilation.assets[filenaname2create] = {
                        source: function () {
                            return content;
                        },
                        size: function () {
                            return content.length;
                        }
                    };
                    count++;
                    if (file2createCnt === count) {
                        callback();
                    }
                });
            })(filename);
        }
    });
  });
};

module.exports = MergeIntoFile;

