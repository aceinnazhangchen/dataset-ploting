var path = require('path');
const file_sys = require('../utils/file_sys');
const config = require('../config.json');

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

var fn_file_list = async (ctx, next) => {
    var set = ctx.query.set;
    var setPath = "";
    if(set == "tesla"){
        setPath = config.tesla_set;
    }else{
        setPath = config.data_set;
    }
    var parent = ctx.query.parent || "";
    var dir = ctx.query.dir || "";
    var version = ctx.query.ver;
    parent = path.join(parent,dir);
    var pathName = path.join(setPath,version,parent);
    console.log(pathName);
    let {err,data} = await file_sys.readDir(pathName);
    if(err){
        let msg = "search dir "+ pathName + " error !";
        await ctx.render('error.html', {title: 'error',msg});
    }else{
        var list = [];
        for(let i in data){
            let info = await file_sys.fileStat(path.join(pathName,data[i]));
            if(info.isDirectory() == false && path.extname(data[i]) != ".dif") continue;
            list.push({name:data[i],dir:info.isDirectory(),size:formatBytes(info.size)});
        }
        await ctx.render('fle_list.html', {title: 'List',set,version,parent,list});
    }
}

module.exports = {
    'GET /list': fn_file_list
};
