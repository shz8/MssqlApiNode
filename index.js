let apiport = 8099, apiurl = '136.100.100.35';
var ec = require('child_process');
var express = require('express');
var app = express();
var request = require('request-json');
var fs = require('fs');
var sql = require('mssql');
var log4js = require('log4js');
var bodyParser = require('body-parser');
var cfg = require('./config').config;
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    next();
});
var userClient = request.createClient(cfg.userapi);
log4js.configure({
    appenders: [
        { type: 'console', category: 'errorinfo' }, //控制台输出
        {
            type: 'file', //文件输出
            filename: 'logs/normal.log',
            maxLogSize: 80240,
            backups: 3,
            category: 'normal'
        },
        {
            type: 'file', //文件输出
            filename: 'logs/error.log',
            maxLogSize: 80240,
            backups: 3,
            category: 'errorinfo'
        },
        {
            type: 'file', //文件输出
            filename: 'logs/access.log',
            maxLogSize: 80240,
            backups: 3,
        }
    ]
});
var logger = log4js.getLogger('normal');

var noParms = ['sign', 'time'];//不需要传入的parm
var proParms = {};
app.use('/pro/:name', function (req, res) {
    try {
        let appid = req.headers['appid'] || req.query['appid'];
        if (apps[appid]) {
            var d = req.method == 'POST' ? req.body : req.query;
            /*if (!d || !d['sign'] || !d['time']) {
                //
                res.send({ errorcode: -11, errorinfo: '缺少必须的参数sign或time！' });
                return;
            }
            //判断时间戳
            let cTime = parseInt(new Date().getTime() / 1000);//当前时间
            if (Math.abs(cTime - d['time']) < 60) {
                let sign = md5(apps[appid].AppKey + '' + d['time']);
                if (sign.toLowerCase() != d['sign'].toLowerCase()) {
                    res.send({ errorcode: -13, errorinfo: 'sign无效' });
                    return;
                }
            }
            else {
                res.send({ errorcode: -12, errorinfo: '参数time过期' });
                return;
            }
            */
            //获取存储过程所有参数
            sql.connect("mssql://" + apps[appid].DBConnection).then(function () {
                let exeSql = new sql.Request();
                if (d) {
                    for (var k in d) {
                        if (noParms.indexOf(k.toLowerCase()) < 0) {
                            exeSql.input(k, d[k]);
                        }
                    }
                    exeSql.execute(req.params.name, (err, result) => {
                        var rlt = {};
                        if (err)
                            rlt = { errorinfo: err.message, errorcode: err.code, name: err.name };
                        else {
                            //配置表改为放在最后，兼容以前的
                            let l = result.length - 1;
                            if (result.length > 0 && result[l].length > 0 && result[l][0].isconfig == 1) {
                                if (result[l][0].isroot == 1) {
                                    rlt = result[result[l][0].tableIdx];
                                }
                                else {
                                    for (let i = 0; i < result[l].length; i++) {
                                        let d = result[result[l][i].tableIdx];
                                        switch (result[l][i].dataType) {
                                            case 1:
                                                if (d && d.length > 0) {
                                                    d = d[0];
                                                }
                                                else
                                                    d = {};
                                                break;
                                            case 2:
                                                if (d && d.length > 0) {
                                                    for (var k in d[0]) {
                                                        d = d[0][k];
                                                        break;
                                                    }
                                                }
                                                else
                                                    d = '';
                                                break;
                                            default:
                                        }
                                        rlt[result[l][i].tableName] = d;
                                    }
                                }
                            }
                            else {
                                rlt = result;//即使只有一个table也作为array返回，增强确定性
                            }
                        }
                        res.send(rlt);
                    });
                }
            }).catch(function (err) {
                res.send({ errorinfo: err.message, errorcode: err.code, name: err.name });
            });
        }
        else {
            res.send({ errorcode: -10, errorinfo: '根据appid未找到应用信息！' });
        }
    }
    catch (err) {
        console.log(err);
        res.send({ errorinfo: err.message, errorcode: err.code, name: err.name });
    }

})
var server = app.listen(apiport, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Example app listening at http://%s:%s', host, port);
});
