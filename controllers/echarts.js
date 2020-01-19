var path = require('path');
const file_sys = require('../utils/file_sys');
const utils = require('../utils/');
const moment = require('moment');

const interval = 0.005;

function parseDiff(content,offList,out_data){
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
            continue;
        }
        if(ref_fix == 4){
            out_data.ref_fix_count++;
        }
        if(rov_fix == 4){
            out_data.rov_fix_count++;
        }  

        let E = parseFloat(array[4]);
        let N = parseFloat(array[5]);
        let square = E*E+N*N;
        let offset = Math.sqrt(square);
        if(offset > 2){
            out_data.larger_than_2m++;
            continue;
        }
        out_data.square_sum += square;
        offList.push(offset);
    }
    offList.sort();
};

function createCDFMap(offList,map){
    var m = 0;
    for(let n in offList){
        if(offList[n] > 2)
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
    table_data.fixedRate = (Math.sqrt(out_data.rov_fix_count/out_data.ref_fix_count)*100).toFixed(2);
    table_data.gross_error = (out_data.larger_than_2m/(offList.length+out_data.larger_than_2m)*100).toFixed(2);
    console.log(table_data);
    for (let k in map ) {
        let x = (100*k*interval).toFixed(1);
        let y = 100*map[k]/offList.length;
        if(y >= 68 && table_data.R68 == 0){
            table_data.R68 = x;  
        }
        if(y >= 95 && table_data.R95 == 0){
            table_data.R95 = x;  
        }
        xAxis.push(x);
        series.push(y);
    }
}

 async function transFileToCDF(file_path,table_data,xAxis,series){
    let content = await file_sys.readFile(file_path);
    var offList = [];
    var out_data = {
        square_sum:0,
        ref_fix_count:0,
        rov_fix_count:0,
        larger_than_2m:0
    };
    parseDiff(content,offList,out_data);
    var map = {0:0};
    createCDFMap(offList,map);
    generateTableData(map,offList,out_data,table_data,xAxis,series);
}

var fn_cdf_echart = async (ctx, next) => {
    var version = ctx.query.ver;
    var filename = ctx.query.file;
    if(filename == undefined){
        let msg = "No file name!";
        await ctx.render('error.html', {title: 'error',msg});
        return;
    }
    var file_path = path.join(appRoot,"date",version,filename);
    let exist = await file_sys.fileExists(file_path);
    if (!exist){
        let msg = "Can't find file "+ filename + " !";
        await ctx.render('error.html', {title: 'error',msg});
        return;
    }
    var xAxis = [];
    var series = [];
    var table_data = {
        RMS:0,
        fixedRate:0,
        gross_error:0,
        R68:0,
        R95:0,
    };
    await transFileToCDF(file_path,table_data,xAxis,series);
    await ctx.render('echart_cdf.html',{filename,version,xAxis,series,table_data});
};

var fn_sd_echart = async (ctx, next) => {
    var version = ctx.query.ver;
    var filename = ctx.query.file;
    if(filename == undefined){
        let msg = "No file name!";
        await ctx.render('error.html', {title: 'error',msg});
        return;
    }
    var file_path = path.join(appRoot,"date",version,filename);
    let exist = await file_sys.fileExists(file_path);
    if (!exist){
        let msg = "Can't find file "+ filename + " !";
        await ctx.render('error.html', {title: 'error',msg});
        return;
    }
    let content = await file_sys.readFile(file_path);
    let lines = content.toString().split('\n');

    var offList = [];
    var timeList = [];
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
            continue;
        }
        
        let E = parseFloat(array[4]);
        let N = parseFloat(array[5]);
        let square = E*E+N*N;
        let offset = Math.sqrt(square);
        if(offset > 5){
           continue;
        }
        offList.push(offset);
        timeList.push(array[0]);
    }

    xAxis = timeList;
    series = offList;
    await ctx.render('echart_sd.html',{filename,version,xAxis,series});
};

var fn_compare = async (ctx, next) => {
    var filename = ctx.query.file;
    var rootpath = path.join(appRoot,"date");
    console.log(rootpath);
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
            var file_path = path.join(appRoot,"date",version,filename);
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

module.exports = {
    'GET /cdf': fn_cdf_echart,
    'GET /sd': fn_sd_echart,
    'GET /compare':fn_compare
};
