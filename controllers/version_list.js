const file_sys = require('../utils/file_sys');

var fn_version_list = async (ctx, next) => {
    var pathName = path.join(process.cwd(),"date");
    console.log(pathName);
    let {err,data} = await file_sys.readDir(pathName);
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
