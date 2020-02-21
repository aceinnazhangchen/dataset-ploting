var path = require('path');
const file_sys = require('../utils/file_sys');
const utils = require('../utils/');
const moment = require('moment');
const config = require('../config.json');

var fn_version_list = async (ctx, next) => {
    var set = ctx.query.set;
    var setPath = "";
    if(set == "tesla"){
        setPath = config.tesla_set;
    }else{
        setPath = config.data_set;
    }
    console.log(setPath);
    let {err,data} = await file_sys.readDir(setPath);
    if(err){
        let msg = "search dir "+ setPath + " error !";
        await ctx.render('error.html', {title: 'error',msg});
    }else{
        var list = [];
        for(let i in data){
            //let info = fs.stat(path.join(pathName,file));
            console.log("version",path.join(setPath,data[i]));
            let info = await file_sys.fileStat(path.join(setPath,data[i]));
            //console.log(info);
            list.push({name:data[i],timeSec:parseInt(info.birthtimeMs),time:moment(info.birthtimeMs).format('YYYY-MM-DD HH:mm:ss')});
        }
        list = list.sort(utils.keysort('timeSec',false));
        await ctx.render('version_list.html', {title: 'Version',set,list});
    }
}

module.exports = {
    'GET /version': fn_version_list
};
