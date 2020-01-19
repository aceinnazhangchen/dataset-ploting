var path = require('path');
const file_sys = require('../utils/file_sys');
const utils = require('../utils/');
const moment = require('moment');

var fn_version_list = async (ctx, next) => {
    var pathName = path.join(appRoot,"date");
    console.log(pathName);
    let {err,data} = await file_sys.readDir(pathName);
    if(err){
        let msg = "search dir "+ pathName + " error !";
        await ctx.render('error.html', {title: 'error',msg});
    }else{
        var list = [];
        for(let i in data){
            //let info = fs.stat(path.join(pathName,file));
            console.log("version",path.join(pathName,data[i]));
            let info = await file_sys.fileStat(path.join(pathName,data[i]));
            //console.log(info);
            list.push({name:data[i],timeSec:parseInt(info.birthtimeMs),time:moment(info.birthtimeMs).format('YYYY-MM-DD HH:mm:ss')});
        }
        list = list.sort(utils.keysort('timeSec',false));
        await ctx.render('version_list.html', {title: 'Version',list});
    }
}

module.exports = {
    'GET /': fn_version_list
};
