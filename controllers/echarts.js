const path = require("path");
const fs = require("fs");

const interval = 0.005;

const readFile = function (src) {
    return new Promise((resolve, reject) => {
        fs.readFile(src, (err, data) => {
            if (err) reject(err);
            resolve(data);
        });
    });
}

const fileExists = function (src) {
    return new Promise((resolve, reject) => {
        fs.exists(src, (exists) => {
            resolve(exists);
        });
    });
}

var fn_echart = async (ctx, next) => {
    var version = ctx.query.ver;
    var filename = ctx.query.file;
    if(filename == undefined){
        let msg = "No file name!";
        await ctx.render('error.html', {title: 'error',msg});
        return;
    }
    var file_path = path.join(process.cwd(),"date",version,filename);
    let exist = await fileExists(file_path);
    if (!exist){
        let msg = "Can't find file "+ filename + " !";
        await ctx.render('error.html', {title: 'error',msg});
        return;
    }
    let content = await readFile(file_path);
    let lines = content.toString().split('\n');
    console.log(lines.length);
    var offList = [];
    var xAxis = [];
    var series = [];
    var map = {0:0};
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
        if(ref_fix != 4){
            continue;
        }
        let E = parseFloat(array[4]);
        let N = parseFloat(array[5]);
        let offset = Math.sqrt(E*E+N*N);
        offList.push(offset);
    }
    offList.sort();
    var m = 0;
    for(let n in offList){
        if(offList[n] > 1)
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
    for (let k in map ) {
        xAxis.push((k*interval).toFixed(3));
        series.push(100*map[k]/offList.length);
    }
    await ctx.render('echart.html',{filename,version,xAxis,series});
};

module.exports = {
    'GET /echart': fn_echart
};
