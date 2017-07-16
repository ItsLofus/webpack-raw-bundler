var fs = require('fs');

var ExcludeRegexp;
var useAsLoader;
var Bundles;
var includeFilePaths;
var Encoding;
var AllowDuplicatesInBundle;
var printProgress;
var CommentTags = { Start: "/* ", End: " */" };
var FileEnding;


function MergeIntoFile(options) {
    ExcludeRegexp = options.excludedFilenames || null;
    useAsLoader = options.useAsLoader || false;
    includeFilePaths = options.includeFilePathComments || false;
    Encoding = options.readEncoding || null;
    AllowDuplicatesInBundle = options.allowDuplicatesInBundle || false;
    Bundles = options.bundles;
    printProgress = options.printProgress || false;
    FileEnding = options.fileEnding || "\n\n";

    if (includeFilePaths)
        CommentTags = options.commentTags || CommentTags;


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
var BeenHere = {};
function mergeFiles(list, currentBundleOptions, FileExt, BeenHere, callback, ind) {
    if (!ind) ind = 0;
    if (!AllowDuplicatesInBundle && list[ind] && BeenHere[list[ind]]) ind++; else BeenHere[list] = 1;

    // Recursive ending conditions
    if (typeof list == "string") {
        if (ind > 0) {
            return callback(null, "");
        }
    } else if (ind >= list.length) {
        return callback(null, "");
    }


    // Parse a folder for it's files dynamically
    if (FileExt == null && (currentBundleOptions || typeof list == "string" || typeof list[ind] == "string")) {
        var useThisString = (currentBundleOptions) ? currentBundleOptions.path : ((typeof list == "string") ? list : list[ind]);
        var Matched = useThisString.match(RelativeRegexp);
        if (Matched) {
            FileExt = Matched[2];

            // Merge the newly found files into the list of things to deal with
            list = walkSync(Matched[1], [], FileExt, currentBundleOptions).concat(list.slice(ind+1));
            ind = 0;
            currentBundleOptions = null; // Clear out the options to keep on processing
        }
    }

    var curfile = (currentBundleOptions) ? currentBundleOptions.path : ((typeof list == "string") ? list : list[ind]);

    if (printProgress)
        console.log("Bundling: " + curfile + "[" + (ind + 1) + "/" + list.length + "]");


    if (typeof curfile == "undefined")
        return callback(null, "");



  fs.readFile(curfile, Encoding, (err, body) =>{
      if (err) return callback(err);

      // Add the debug tags to see what file is what
      if(includeFilePaths)
        body = CommentTags.Start + curfile + CommentTags.End + "\n" + body;

      var nextOptions = (list[ind + 1] && list[ind + 1].path) ? list[ind + 1] : null;

    mergeFiles(list, nextOptions, FileExt, BeenHere, (err, otherFilesBody)=>{
      if(err) return callback(err);
      callback(null, body + FileEnding + otherFilesBody)
    }, ind+1)
  })
}



MergeIntoFile.prototype.apply = function(compiler) {
  var options = this.options;
  compiler.plugin('emit', function(compilation, callback) {
    var count=0;
    var file2createCnt = 0;
    Bundles.forEach(function (filename) {

        if (printProgress)
            console.log("Starting to bundle: " + filename);

        var files = options[filename];
            var BundleMe;
            var currentBundlePartOptions;


            if (typeof files[0] == "string") {
                //BundleMe = files[0];
                currentBundlePartOptions = null;
            } else {
                //BundleMe = files[0].path;
                currentBundlePartOptions = files[0];
            }

            // files = [./bin/file1.txt
            //        ./bin/*.txt]
            file2createCnt++;
            (function (filenaname2create) {
                mergeFiles(files, currentBundlePartOptions, null, {}, (err, content) => {
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
    });
  });
};

module.exports = MergeIntoFile;
