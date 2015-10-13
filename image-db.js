var cluster = require('cluster');
var os = require('os');
var imageProxy = require('./lib/image_proxy.js');

var config = require('./config.json');

var numCpus = os.cpus().length;

if (cluster.isMaster) {

    console.info('daemon running with pid ' + process.pid);

    for (var i = 0; i < numCpus; i++) {
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        console.warn('worker ' + worker.pid + ' died with code ' + code + ', restarting');
        cluster.fork();
    });

} else {

    console.log('worker started with pid ' + process.pid);
    imageProxy.start(config);

}
