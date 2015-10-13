var path = require('path');
var url = require('url');
var fs = require('fs');
var querystring = require('querystring');
var http = require('http');
var gm = require('gm');
var md5 = require('md5');
var mkdirp = require('mkdirp');

exports.start = function(config) {

    var requestHandler = function(req, res) {

        var parsedUrl = url.parse(req.url);
        var requestPathName = path.normalize(parsedUrl.pathname);
        var args = querystring.parse(parsedUrl.query);
        var secretHolder = null;

        if (config.secrets !== null) {
            if (!args.secret || config.secrets[args.secret] === undefined) {
                res.writeHead(403, { 'Content-Type': 'text/plain' });
                res.end('403 forbidden');
                console.log('[' + req.url + '] no or wrong secret');
                return;
            } else {
                secretHolder = config.secrets[args.secret];
            }
        }

        var fileExtension = path.extname(requestPathName);
        var filePath = process.cwd() + '/images' + requestPathName;

        var requestPathNameHash = md5(requestPathName);

        var queryWithoutSecret = parsedUrl.query.replace(/(^|&)secret=(.*?)($|&)/, '$1');
        var argHash = md5(queryWithoutSecret);
        var cacheFolder = process.cwd() + '/cache/' + argHash + '/' + requestPathNameHash.substr(0, 2) + '/';

        mkdirp(cacheFolder, function(err) {

            fs.exists(cacheFolder + requestPathName, function(exists) {

                if (exists) {

                    var contentType = 'text/plain';

                    switch (fileExtension) {
                        case '.jpg':
                        case '.jpeg':
                            contentType = 'image/jpg';
                            break;
                        case '.gif':
                            contentType = 'image/gif';
                            break;
                        case '.png':
                            contentType = 'image/png';
                            break;
                    }

                    res.writeHead(200, { 'Content-Type': contentType });
                    fs.createReadStream(cacheFolder + requestPathName).pipe(res);

                    console.log('[' + req.url + ']' + ((secretHolder !== null) ? ' [' + secretHolder + ']' : '') + ' [cached]');

                } else {

                    fs.exists(filePath, function(exists) {

                        if (exists) {

                            var done = [];

                            var contentType = 'text/plain';

                            switch (fileExtension) {
                                case '.jpg':
                                case '.jpeg':
                                    contentType = 'image/jpg';
                                    break;
                                case '.gif':
                                    contentType = 'image/gif';
                                    break;
                                case '.png':
                                    contentType = 'image/png';
                                    break;
                            }

                            var readStream = fs.createReadStream(filePath);
                            var gmObj = gm(readStream);

                            res.writeHead(200, { 'Content-Type': contentType });

                            // remove exif profile data
                            gmObj.noProfile();

                            if (args.bg !== null) {
                                gmObj.background('#' + args.bg);
                            }

                            if ((args.w !== undefined && args.w > 0) || (args.h !== undefined && args.h > 0)) {
                                gmObj.resize(args.w, args.h, (args.kar === undefined) ? '!' : null);
                                done.push('[resize ' + args.w + '/' + args.h + ']');
                            }

                            if (args.kar !== undefined && args.w !== undefined && args.h !== undefined) {
                                gmObj.gravity('Center').extent(args.w, args.h);
                            }

                            if (args.sepia !== undefined) {
                                gmObj.sepia();
                                done.push('[sepia]');
                            }

                            if (args.swirl !== undefined && args.swirl >= 0 && args.swirl <= 360) {
                                gmObj.swirl(args.swirl);
                                done.push('[swirl=' + args.swirl + ']');
                            }

                            if (args.flip !== undefined) {
                                gmObj.flip();
                                done.push('[flip]');
                            }

                            if (args.flop !== undefined) {
                                gmObj.flop();
                                done.push('[flop]');
                            }

                            if (args.monochrome !== undefined) {
                                gmObj.monochrome();
                                done.push('[monochrome]');
                            }

                            if (args.negative !== undefined) {
                                gmObj.negative();
                                done.push('[negative]');
                            }

                            var writeStream = fs.createWriteStream(cacheFolder + requestPathName);

                            var gmObjStream = gmObj.stream();

                            gmObjStream.pipe(res);
                            gmObjStream.pipe(writeStream);

                            console.log('[' + req.url + ']' + ((secretHolder !== null) ? ' [' + secretHolder + ']' : '') + ' ' + done.join(' '));

                        } else {

                            res.writeHead(404, { 'Content-Type': 'text/plain' });
                            res.end('404 File Not Found');

                        }

                    });

                }

            });

        });

    };

    var httpServer = http.createServer(requestHandler);
    httpServer.listen(8888, '::');

    console.log('listening on port 8888');
};
