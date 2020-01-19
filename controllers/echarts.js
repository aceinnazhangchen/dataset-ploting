var path = require('path');
const file_sys = require('../utils/file_sys');

const interval = 0.005;

var fn_cdf_echart = async (ctx, next) => {
    var version = ctx.query.ver;
    var filename = ctx.query.file;
    if(filename == undefined){SPARTN
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
    //console.log(lines.length);
    var offList = [];
    var xAxis = [];
    var series = [];
    var map = {0:0};
    var square_sum = 0;
    var ref_fix_count = 0;
    var rov_fix_count = 0;
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
            ref_fix_count++;
        }
        if(rov_fix == 4){
            rov_fix_count++;
        }  

        let E = parseFloat(array[4]);
        let N = parseFloat(array[5]);
        let square = E*E+N*N;
        let offset = Math.sqrt(square);
        if(offset <= 2){
            square_sum += square;
            offList.push(offset);
        }
    }
    offList.sort();
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
    var table_data = {};
    table_data.RMS = Math.sqrt(square_sum/offList.length).toFixed(3);
    table_data.fixedRate = (Math.sqrt(rov_fix_count/ref_fix_count)*100).toFixed(2);
    console.log(table_data);
    for (let k in map ) {
        let x = (100*k*interval).toFixed(1);
        let y = 100*map[k]/offList.length;
        if(y >= 68 && table_data.R68 == undefined){
            table_data.R68 = x;  
        }
        if(y >= 95 && table_data.R95 == undefined){
            table_data.R95 = x;  
        }
        if(k == map.length -1){
            if(table_data.R68 == undefined){
                 table_data.R68 = x;
            }
            if(table_data.R95 == undefined) {
                table_data.R95 = x; 
            }
        }
        xAxis.push(x);
        series.push(y);
    }
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

module.exports = {
    'GET /cdf': fn_cdf_echart,
    'GET /sd': fn_sd_echart
};
