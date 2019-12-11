const path = require("path");
const fs = require("fs");

const readDir = function (src) {
    return new Promise((resolve, reject) => {
        fs.readdir(src, (err, data) => {
            resolve({err,data});
        });
    });
}

var fn_version_list = async (ctx, next) => {
    var pathName = path.join(process.cwd(),"date");
    console.log(pathName);
    let {err,data} = await readDir(pathName);
    if(err){
        let msg = "search dir "+ pathName + " error !";
        await ctx.render('error.html', {title: 'error',msg});
    }else{
        await ctx.render('version_list.html', {title: 'Version',list: data});
    }
}

module.exports = {
    'GET /': fn_version_list
};
