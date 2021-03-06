const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const controller = require('./controller');
let staticFiles = require('./static-files');
let templating = require('./templating');
const file_sys = require('./utils/file_sys');
var path = require('path');

global.appRoot = path.resolve(__dirname);

var dataPath = path.join(appRoot,"date");

file_sys.mkdirsSync(dataPath);

const app = new Koa();
const isProduction = process.env.NODE_ENV === 'production';

app.on('error', err => {
    console.error('server error', err)
});

app.on('error', (err, ctx) => {
    console.error('server error', err, ctx)
});

app.use(async (ctx, next) => {
    console.log(`${ctx.request.method} ${ctx.request.url}`);
    const start = new Date().getTime(); // 当前时间
    await next(); // 调用下一个middleware
    const execTime = new Date().getTime() - start; // 耗费时间
    ctx.response.set('X-Response-Time', `${execTime}ms`);
});

// add router middleware:
app.use(staticFiles('/static/', __dirname + '/static'));
app.use(bodyParser());
app.use(templating(__dirname + '/views', {
    noCache: !isProduction,
    watch: !isProduction
}));
//app.use(router.routes());
app.use(controller());

app.listen(9690);
console.log('app started at port 9690...');