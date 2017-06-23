var fs = require('fs');

var ExcludeRegexp;
var useAsLoader;
var Bundles;
var includeFilePaths;
var Encoding;


function MergeIntoFile(options) {
    ExcludeRegexp = options.excludedFilenames || null;
    useAsLoader = options.useAsLoader || false;
    includeFilePaths = options.includeFilePathComments || false;
    Encoding = options.readEncoding || null;
    Bundles = options.bundles;

    this.options=options;
}


function isExcluded(aString) {
    return ExcludeRegexp
        ? ExcludeRegexp.some(function (exp) {
            return exp.test(aString);
        })
        : false;
}


// List all files in a directory in Node.js recursively in a synchronous fashion
var walkSync = function (dir, filelist, ext) {
    var path = path || require('path');
    var fs = fs || require('fs'),
        files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            filelist = walkSync(path.join(dir, file), filelist, ext);
        }
        else {
            if (file.match(new RegExp("." + ext + "$")) && !isExcluded(file))
                filelist.push(path.join(dir, file));
        }
    });
    return filelist;
};

var RelativeRegexp = /(.*?)\*.(.*?)$/;
var FileExt = null;

function mergeFiles(list, callback, ind){
    if (!ind) ind = 0;

    // Parse a folder for it's files dynamically 
    if (FileExt == null) {
        var Matched = list[ind].match(RelativeRegexp);
        if (Matched) {
            FileExt = Matched[2];
            list = walkSync(Matched[1], [], FileExt);
        }
    }


  if (ind >= list.length) return callback(null, "");
  
  var curfile = list[ind];
  fs.readFile(curfile, Encoding, (err, body) =>{
      if (err) return callback(err);

      // Add the debug tags to see what file is what
      if(includeFilePaths)
        body = "/* " + curfile + " */\n" + body;


    mergeFiles(list, (err, otherFilesBody)=>{
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


        file2createCnt++;
        (function (filenaname2create) {
            mergeFiles(files, (err, content) => {
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

