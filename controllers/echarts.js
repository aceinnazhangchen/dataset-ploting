var path = require('path');
const file_sys = require('../utils/file_sys');
const utils = require('../utils/');
const moment = require('moment');
const config = require('../config.json');
var util = require('util');

const interval = 0.005;
const range_limit = 5;

function getSetPath(set){
    var setPath = "";
    if(set == "tesla"){
        setPath = config.tesla_set;
    }else{
        setPath = config.data_set;
    }
    return setPath;
}

function parseDiff(lines,offList,out_data,set,rov_filter){
    for(let i = 0;i < lines.length;i++){
        if(lines[i].trim()==""){
            continue;
        }
        let array = lines[i].split(',');
        if(array.length != 15){
            continue;
        }
        let ref_fix =  parseInt(array[13]);
        let rov_fix =  parseInt(array[14]);
        if(ref_fix == 4){
            out_data.ref_fix_count++;
        }
        if(rov_fix == 4){
            out_data.rov_fix_count++;
        }
        if(set == "tesla"){
            if(ref_fix != 1 && ref_fix != 2){
                continue;
            }
        }else{
            if( ref_fix != 4){
                continue;
            }
        }
        if(rov_fix < 2){
            continue;
        }
        if(rov_filter == "fix"){
            if(rov_fix != 4){
                continue;
            }
        }
        if(rov_filter == "nofix"){
            if(rov_fix == 4){
                continue;
            }
        }

        let E = parseFloat(array[4]);
        let N = parseFloat(array[5]);
        let square = E*E+N*N;
        let offset = Math.sqrt(square);
        if(offset > 2){
            out_data.larger_than_2m++;
        }
        if(offset > 5){
            out_data.larger_than_5m++;
        }
        out_data.square_sum += square;
        offList.push(offset);
    }
    offList.sort(function(a,b){return a-b});
};

function createCDFMap(offList,map){
    var m = 0;
    for(let n in offList){
        if(offList[n] > range_limit)
        {
            break;
        }
        if(offList[n] <= interval*m){
            if(map[m] == undefined){
                map[m]=1;
            }else{
                map[m]++;
            }
        }
        else{
            while(offList[n] > interval*m){
                m++;
                if(map[m] == undefined){
                    map[m]=map[m-1];
                }
            }
            map[m]++;
        }
    }
}

function generateTableData(map,offList,out_data,table_data,xAxis,series){
    table_data.RMS = Math.sqrt(out_data.square_sum/offList.length).toFixed(3);
    table_data.fixedRate = (out_data.rov_fix_count/out_data.total_count*100).toFixed(2);
    //table_data.gross_error = (out_data.larger_than_2m/(offList.length)*100).toFixed(2);
    console.log(table_data);
    var last_y = 0;
    var last_k = 0;
    var R50_index = Math.floor(offList.length*0.50)
    var R68_index = Math.floor(offList.length*0.68)
    var R95_index = Math.floor(offList.length*0.95)
    var R99_index = Math.floor(offList.length*0.99)
    table_data.R50 = (offList[R50_index]*100).toFixed(1);
    table_data.R68 = (offList[R68_index]*100).toFixed(1);
    table_data.R95 = (offList[R95_index]*100).toFixed(1);
    table_data.R99 = (offList[R99_index]*100).toFixed(1);
    for (let k in map ) {
        let x = (100*k*interval).toFixed(1);
        let y = 100*map[k]/offList.length;
        last_y = y;
        last_k = k;
        xAxis.push(x);
        series.push(y);
    }
    while(last_k <= range_limit/interval){
        last_k++;
        let x = (100*last_k*interval).toFixed(1);
        xAxis.push(x);
        series.push(last_y);
    }
}

 async function transFileToCDF(file_path,table_data,xAxis,series,set,rov_filter){
    let content = await file_sys.readFile(file_path);
    var offList = [];
    var out_data = {
        square_sum:0,
        ref_fix_count:0,
        rov_fix_count:0,
        total_count:0,
        larger_than_2m:0,
        larger_than_5m:0
    };
    let lines = content.toString().split('\n');
    out_data.total_count = lines.length;
    parseDiff(lines,offList,out_data,set,rov_filter);
    var map = {0:0};
    createCDFMap(offList,map);
    generateTableData(map,offList,out_data,table_data,xAxis,series);
    table_data.total_count = out_data.total_count;
    table_data.rov_fix_count = out_data.rov_fix_count;
    table_data.larger_than_2m = out_data.larger_than_2m;
    table_data.larger_than_5m = out_data.larger_than_5m;
}

var fn_cdf_echart = async (ctx, next) => {
    var setPath = getSetPath(ctx.query.set);
    var version = ctx.query.ver;
    var filename = ctx.query.file;
    if(filename == undefined){
        let msg = "No file name!";
        await ctx.render('error.html', {title: 'error',msg});
        return;
    }
    var parent = ctx.query.parent || "";
    var file_path = path.join(setPath,version,parent,filename);
    let exist = await file_sys.fileExists(file_path);
    if (!exist){
        let msg = "Can't find file "+ filename + " !";
        await ctx.render('error.html', {title: 'error',msg});
        return;
    }
    var xAxis_1 = [];
    var xAxis_2 = [];
    var xAxis_3 = [];
    var series_1 = [];
    var series_2 = [];
    var series_3 = [];
    var table_data_1 = {};
    var table_data_2 = {};
    var table_data_3 = {};
    await transFileToCDF(file_path,table_data_1,xAxis_1,series_1,ctx.query.set,"all");
    await transFileToCDF(file_path,table_data_2,xAxis_2,series_2,ctx.query.set,"fix");
    await transFileToCDF(file_path,table_data_3,xAxis_3,series_3,ctx.query.set,"nofix");
    await ctx.render('echart_cdf.html',{filename,version,xAxis_1,series_1,series_2,series_3,table_data_1});
};

var fn_cep_echart = async (ctx, next) => {
    var setPath = getSetPath(ctx.query.set);
    var version = ctx.query.ver;
    var filename = ctx.query.file;
    if(filename == undefined){
        let msg = "No file name!";
        await ctx.render('error.html', {title: 'error',msg});
        return;
    }
    var parent = ctx.query.parent || "";
    var file_path = path.join(setPath,version,parent,filename);
    let exist = await file_sys.fileExists(file_path);
    if (!exist){
        let msg = "Can't find file "+ filename + " !";
        await ctx.render('error.html', {title: 'error',msg});
        return;
    }
    var xAxis_1 = [];
    var xAxis_2 = [];
    var xAxis_3 = [];
    var series_1 = [];
    var series_2 = [];
    var series_3 = [];
    var table_data_1 = {};
    var table_data_2 = {};
    var table_data_3 = {};
    await transFileToCDF(file_path,table_data_1,xAxis_1,series_1,ctx.query.set,"all");
    await transFileToCDF(file_path,table_data_2,xAxis_2,series_2,ctx.query.set,"fix");
    await transFileToCDF(file_path,table_data_3,xAxis_3,series_3,ctx.query.set,"nofix");
    var xAxis_cep = ['50%','68%','95%','99%'];
    var series_cep_1 = [table_data_1.R50,table_data_1.R68,table_data_1.R95,table_data_1.R99];
    var series_cep_2 = [table_data_2.R50,table_data_2.R68,table_data_2.R95,table_data_2.R99];
    var series_cep_3 = [table_data_3.R50,table_data_3.R68,table_data_3.R95,table_data_3.R99];
    await ctx.render('echart_cep.html',{filename,version,xAxis_cep,series_cep_1,series_cep_2,series_cep_3});
};

async function parse_dif_file_to_array(file,xAxis,series){
    let content = await file_sys.readFile(file);
    let lines = content.toString().split('\n');

    for(let i = 0;i < lines.length;i++){
        if(lines[i].trim()==""){
            continue;
        }
        let array = lines[i].split(',');
        if(array.length != 15){
            continue;
        }
        let ref_fix =  parseFloat(array[13]);
        let rov_fix =  parseFloat(array[14]);
        if(ref_fix != 4 || (rov_fix!=4 && rov_fix !=5)){
//            continue;
        }
        
        let E = parseFloat(array[4]);
        let N = parseFloat(array[5]);
        let square = E*E+N*N;
        let offset = Math.sqrt(square);
        if(offset > 5){
           //continue;
           offset = 0;
        }
        series.push(offset);

        let time = array[1].split('.')[0].trim();
        if(time.length < 6){
            let zero = "000000";
            time = zero.substr(0,6-time.length)+time;
        }
        let timef = time.substr(0,2)+":"+time.substr(2,2)+":"+time.substr(4,2)
        xAxis.push(timef);
    }
}

var fn_sd_echart = async (ctx, next) => {
    var setPath = getSetPath(ctx.query.set);
    var version = ctx.query.ver;
    var filename = ctx.query.file;
    if(filename == undefined){
        let msg = "No file name!";
        await ctx.render('error.html', {title: 'error',msg});
        return;
    }
    var parent = ctx.query.parent || "";
    var file_path = path.join(setPath,version,parent,filename);
    let exist = await file_sys.fileExists(file_path);
    if (!exist){
        let msg = "Can't find file "+ filename + " !";
        await ctx.render('error.html', {title: 'error',msg});
        return;
    }

    var xAxis = [];
    var series = [];
    await parse_dif_file_to_array(file_path,xAxis,series);

    await ctx.render('echart_sd.html',{filename,version,xAxis,series});
};

var fn_dy_sd_echart = async (ctx, next) => {
    var setPath = getSetPath(ctx.query.set);
    var version = ctx.query.ver;
    var filename = ctx.query.file;
    if(filename == undefined){
        let msg = "No file name!";
        await ctx.render('error.html', {title: 'error',msg});
        return;
    }
    var parent = ctx.query.parent || "";
    var file_path = path.join(setPath,version,parent,filename);
    let exist = await file_sys.fileExists(file_path);
    if (!exist){
        let msg = "Can't find file "+ filename + " !";
        await ctx.render('error.html', {title: 'error',msg});
        return;
    }
    var filename1 = "CPT7-2020_06_22_13_19_28--openrtk_01-new.dif"
    var file_path1 = path.join(setPath,version,parent,filename1);
    var xAxis1 = [];
    var series1 = [];
    var filename2 = "CPT7-2020_06_22_13_19_28--ublox_f9p_01.dif"
    var file_path2 = path.join(setPath,version,parent,filename2);
    var xAxis2 = [];
    var series2 = [];
    await parse_dif_file_to_array(file_path1,xAxis1,series1);
    await parse_dif_file_to_array(file_path2,xAxis2,series2);
    console.log(xAxis1.length);
    console.log(xAxis2.length);

    await ctx.render('echart_sd_dynamic.html',{filename,version,xAxis1,series1,series2});
};

var fn_compare = async (ctx, next) => {
    var filename = ctx.query.file;
    var rootpath = getSetPath(ctx.query.set);
    console.log(rootpath);
    var parent = ctx.query.parent || "";
    let {err,data} = await file_sys.readDir(rootpath);
    if(err){
        let msg = "search dir "+ pathName + " error !";
        await ctx.render('error.html', {title: 'error',msg});
    }else{
        var list = [];
        for(let i in data){
            let info = await file_sys.fileStat(path.join(rootpath,data[i]));
            //console.log(info);
            list.push({name:data[i],timeSec:parseInt(info.birthtimeMs),time:moment(info.birthtimeMs).format('YYYY-MM-DD HH:mm:ss')});
        }
        list = list.sort(utils.keysort('timeSec',false));

        var table = [];
        for(let i in list){
            let version = list[i].name;
            if(version.substr(0,8) == "res_msvc"){
                continue;
            }
            var file_path = path.join(rootpath,version,parent,filename);
            let exist = await file_sys.fileExists(file_path);
            if (!exist){
                continue;
            }
            var xAxis = [];
            var series = [];
            var table_data = {
                version:version,
                RMS:0,
                fixedRate:0,
                gross_error:0,
                R68:0,
                R95:0,
            };
            await transFileToCDF(file_path,table_data,xAxis,series);
            table.push(table_data);
        }
        await ctx.render('compare_table.html', {title: 'Table',table});
    }
}

var dynamic_data = async (ctx, next) => {

    await ctx.render('dynamic_data.html',{});
}

module.exports = {
    'GET /cdf': fn_cdf_echart,
    'GET /cep': fn_cep_echart,
    'GET /sd': fn_sd_echart,
    'GET /compare':fn_compare,
    'GET /dynamic_data':dynamic_data
};
