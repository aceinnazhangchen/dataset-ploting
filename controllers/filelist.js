const file_sys = require('../utils/file_sys');

var fn_file_list = async (ctx, next) => {
    var version = ctx.query.ver;
    var pathName = path.join(process.cwd(),"date",version);
    console.log(pathName);
    let {err,data} = await file_sys.readDir(pathName);
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
