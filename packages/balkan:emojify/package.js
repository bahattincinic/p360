Package.describe({
  name: 'balkan:emojify',
  summary: ' emojifyjs ',
  version: '1.0.0',
  git: 'git://helevelevelvele'
});

Package.onUse(function(api) {
    api.versionsFrom('METEOR@0.9.3.1');
    api.use(['templating', 'underscore']);
    api.addFiles(['emojify.min.js', 'emojify.min.css', 'small.css'], 'client');

    var fs = Npm.require("fs"),
        path = Npm.require("path"),
        imagesDir = 'packages/balkan:emojify/images/emoji/';
    fs.readdir(imagesDir, function (err, files) {
        if (err)
          throw err;
        files.forEach(function(file) {
            api.add_files('images/emoji/' + file, 'client', {isAsset: true});
        });
    });
});

