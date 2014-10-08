Package.describe({
    name: 'balkan:blob',
  summary: " helevelevelvele",
  version: "1.0.0",
  git: "git://helevelvelvelve "
});


Package.onUse(function(api) {

  api.versionsFrom('METEOR@0.9.3.1');
  api.use(['templating', 'underscore']);
  api.addFiles(['balkan:blob.html',  'balkan:blob.js'], 'client');
});

