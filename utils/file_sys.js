var path = require('path');
var fs = require("fs");


function mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
        return true;
    } else {
        if (mkdirsSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname);
            return true;
      }
    }
}

const fileExists = function (src) {
    return new Promise((resolve, reject) => {
        fs.exists(src, (exists) => {
            resolve(exists);
        });
    });
}

const readFile = function (src) {
    return new Promise((resolve, reject) => {
        fs.readFile(src, (err, data) => {
            if (err) reject(err);
            resolve(data);
        });
    });
}

const readDir = function (src) {
    return new Promise((resolve, reject) => {
        fs.readdir(src, (err, data) => {
            resolve({err,data});
        });
    });
}

module.exports = {
    mkdirsSync,
    fileExists,
    readFile,
    readDir,
};
  