const path = require("path");
const fs = require("fs");

const readDir = function (src) {
    return new Promise((resolve, reject) => {
        fs.readdir(src, (err, data) => {
            resolve({err,data});
        });
    });
}

var fn_file_list = async (ctx, next) => {
    var version = ctx.query.ver;
    var pathName = path.join(process.cwd(),"date",version);
    console.log(pathName);
    let {err,data} = await readDir(pathName);
    if(err){
        let msg = "search dir "+ pathName + " error !";
        await ctx.render('error.html', {title: 'error',msg});
    }else{
        await ctx.render('fle_list.html', {title: 'List',version,list: data});
    }
}

module.exports = {
    'GET /list': fn_file_list
};
