/**
 * Created by Rookie on 27.07.14.
 */
var request = require('request');
var fs = require('graceful-fs');
var async = require('async');

var domain_id = {
    "berezka": -38594501,
    "loooch": -63437668,
    "agentamxyu": -62344230,
    "mluch": -48155121,
    "ppk": -47843525,
    "landoz": -47295982,
    "bnbt": -5652334,
    "duran": -25336774
};

function loadPictures(oid, domain) {
    var url = "http://api.vk.com/method/photos.get?album_id=wall&count=1000&rev=1&owner_id=" + oid;
    var photos = [];

    function getRecords(offset) {
        if (!offset)
            offset = 0;
        request.get(url + "&offset=" + offset, {}, function (error, response, body) {
            if (!error && body) {
                var resp = (JSON.parse(body)).response;
                if (resp && resp.length > 0) {
                    photos.push.apply(photos, resp);
                    getRecords(offset + 1000);
                } else {
                    console.log("JSON list downloaded");
                    processList();
                }
            }
        });
    }

    function processList() {
        if (!fs.existsSync("../" + domain))
            fs.mkdirSync("../" + domain);

        var total = photos.length;
        var downloaded = 0;

        function downloadImg(img, callback) {
            //Bad object
            if (!img.localpath) {
                callback("No file", img);
                return;
            }

            //Trying to connect
            try {
                var out = request({ uri: img.url});
                out.on("response", function (resp) {
                    if (resp.statusCode == 200) {
                        try {
                            var stream = fs.createWriteStream(img.localpath);
                            out.pipe(stream);

                            stream.on("close", function () {
                                downloaded++;
                                callback(null, img)
                            });
                        }
                        catch (e) {
                            fs.unlinkSync(img.localpath);
                            callback("Error saving ", img);
                        }
                    }
                    else {
                        callback("Bad HTTP response ", img)
                    }
                });

                out.on("error", function (resp) {
                    callback("Bad request ", img);
                });
            }
            catch (e) {
                callback(e, img);
            }
        }

        async.forEach(photos,
            function (p, cb) {
                var img = {};
                img.url = p.src_xxxbig || p.src_xxbig || p.src_xbig || p.src_big;
                img.filename = img.url.substring(img.url.lastIndexOf('/') + 1);
                img.localpath = "../" + domain + "/" + img.filename;

                if (!fs.existsSync(img.localpath))
                    downloadImg(img,
                        function (err, result) {
                            if (err)
                                console.log(err, ": ", result.filename);
                            else
                                console.log("Finished: ", result.filename);
                            cb();
                        });
                else {
                    console.log("File already exists: ", img.localpath);
                    cb();
                }
            },
            function (err) {
                console.log("--------------");
                console.log("Downloaded ", downloaded, "/", total);
            }
        );
    }

    getRecords();
}

if (process.argv.length < 3) {
    console.log("Domain name is required.");
    process.exit(0);
} else {
    var _domain = process.argv[2];
    var owner_id;

    if (domain_id[_domain]) {
        owner_id = domain_id[_domain];
        loadPictures(owner_id, _domain);
    } else {
        request.get("http://api.vk.com/method/groups.getById?gid=" + _domain, function (error, response, body) {
            if (!error && body) {
                var resp = (JSON.parse(body)).response;
                if (resp && resp.length > 0) {
                    owner_id = -(resp[0].gid);
                    console.log("Owner_id of domain '" + _domain + "' is " + owner_id);
                    loadPictures(owner_id, _domain);
                } else {
                    console.log("Public not found.");
                    process.exit(0);
                }
            }
        });
    }
}
