var rec = null;                 // main recording device
Meteor.recStat = new Recording;
// session defaults
Session.setDefault('talking', false);
Session.setDefault('searching', false);
Session.setDefault('typing', false);
Session.setDefault('sound', false);
Session.setDefault('expirationDate', null);
Session.setDefault('avatarId', null);
Session.setDefault('countdown', Settings.countdown);

Template.chat.events({
    // recording events
    'click #start': function(e) {
        /**
            Set for audio recording
            requesting permission from the user
        **/
        navigator.getUserMedia({audio: true},
            function(mediaStream) {
                var audioContext = new window.AudioContext();
                var inputPoint = audioContext.createGain();
                var mediaStreamSource = audioContext.createMediaStreamSource(mediaStream);
                mediaStreamSource.connect(inputPoint);
                // analyser
                analyserNode = audioContext.createAnalyser();
                analyserNode.fftsize = 2048;
                inputPoint.connect(analyserNode);
                // create recorder
                rec = new Recorder(mediaStreamSource, {}, Meteor.recStat);
                rec.clear();
                rec.record();
        }, function(error) {
            console.log(JSON.stringify(error));
        });
    },
    'click #stop': function(e) {
        /**
            Stop recording and create a CollectionFS file
            from blob, then proceed to insert this file
            to approporiate collection
        **/
        rec.stop();
        rec.exportWAV(function(blob) {
            console.dir(blob);
            var fsFile = new FS.File(blob);
            fsFile.owner = Meteor.userId();
            var roomId = Session.get('roomId') || '__no_room__';
            fsFile.name('recording--' + roomId + '.wav');

            var audio = Audios.insert(fsFile, function (err) {
                if (err) {
                    alertify.error("Wave could not be recorded");
                    throw new Meteor.Error(err);
                } else {
                    alertify.success("Wave sent..");
                    console.log(audio);

                    Meteor.socket.emit('message', {
                        body: null,
                        type: 'audio',
                        payloadId: audio._id
                    });
                }
            });
        });
    },
    // usual ui events
    'keydown #input360': _.throttle(function(e, t) {
        Meteor.socket.emit('typing', true);
    }, 750, {trailing: false}),
    'keyup #input360' : _.debounce(function(e, t) {
        Meteor.socket.emit('typing', false);
    }, 1500, false),
    'submit #form360, click #messageSend': function(e, form) {
        e.preventDefault();
        var body = $.trim($('input[id=input360]').val());
        if(body){
        Meteor.socket.emit('message', body);
            $('input[id=input360]').val('');
        }
    },
    'click #next': function(e, t) {
        // can leave only when talking
        if (Session.get('talking')) {
        Meteor.socket.emit('leave');
            $('#next').toggleClass("yanyan");
        }
    },
    // starts searching for a room
    'click #ping': function() {
        if (Session.get('talking')) return;
        Meteor.call('startSearching', Meteor.user()._id);
    },
    // stops searching for a room
    'click #don': function() {
        if (Session.get('talking')) return;
        Meteor.call('stopSearching', Meteor.user()._id);
    },
    'click #changeSound': function(){
        var newSound = !Session.get('sound');
        Meteor.socket.emit('sound', newSound);
    }
});


// room autorun
Tracker.autorun(function() {
    if (Session.get('roomId')) {
        // sub to this room messages
        Meteor.subscribe('messages', Session.get('roomId'));
        Messages.find().observe({
            added: function (document) {
                Meteor.setTimeout(function() { emojify.run(); }, 100);
            }
        });
        // sub to this room
        Meteor.subscribe('rooms', Session.get('roomId'));

        Rooms.find({'_id': Session.get('roomId')}).observe({
            changed: function (newDocument, oldDocument) {
                // refresh countdown here
                Session.set('countdown', newDocument.countdown);
            }
        });
    } else {
        Session.set('countdown', Settings.countdown);
    }
});

// recording autorun
Tracker.autorun(function() {
    if (Meteor.recStat.getRecording()) {
        // wait for analyser element to be available on dom
        Meteor.setTimeout(updateAnalysers, 250);
    } else {
        cancelAnalyserUpdates();
    }
});

// sound autorun
Tracker.autorun(function() {
    if (Meteor.user() && Session.get('sound') && Session.get('roomId')) {
        Messages.find(
            {'roomId': Session.get('roomId'), 'to': Meteor.user().username}).observe({
            added: function(document) {
                $('#soundNot')[0].play();
            }
        });
    }
});

Meteor.startup(function() {
    var origin = Settings.ioPath;
    var connTarget = origin + ':' + Settings.ioPort;
    Meteor.socket = io.connect(connTarget);
    Meteor.subscribe('images');
    Meteor.subscribe('audios');

    // configure emojify
    emojify.setConfig({
        only_crawl_id    : 'smirk', // only for this #element
        img_dir          : 'packages/balkan_emojify/images/emoji' // image dir
    });
    // user autorun
    Tracker.autorun(function() {
        if (Meteor.user()) {
            Meteor.subscribe('users', Session.get('roomId'));
            Meteor.users.find({'_id': {$ne: Meteor.userId()}}).observe({
                added: function (document) {
                    var guy = Meteor.users.find({'_id': {$ne: Meteor.userId()}}).fetch();

                    // XXX may remove this at prod after testing
                    if (guy.length !== 1) {
                        throw new Error('guy length');
                        return;
                    }

                    var guy = guy[0];
                    if (guy.avatarId) {
                        Session.set('avatarId', guy.avatarId);
                    }
                },
                removed: function (oldDocument) {
                    // reset avatar id here
                    Session.set('avatarId', null);
                },
                changed: function(newDocument, oldDocument) {
                    // check if avatar has been updated in meantime
                    if (newDocument.avatarId !== oldDocument.avatarId) {
                        Session.set('avatarId', newDocument.avatarId);
                    }
                }
            });

        Meteor.socket.emit('loggedIn', Meteor.user()._id);
            Meteor.subscribe('sessions', Meteor.user()._id);
            Sessions.find({'userId': Meteor.user()._id}).observe({
                added: function (document) {
                    Session.set('talking', document.talking);
                    Session.set('searching', document.searching);
                    Session.set('typing', document.typing);
                    Session.set('sound', document.sound);
                },
                changed: function (newDocument, oldDocument) {
                    // set basic states
                    Session.set('talking', newDocument.talking);
                    Session.set('searching', newDocument.searching);
                    Session.set('typing', newDocument.typing);
                    Session.set('sound', newDocument.sound);

                    // if session has room then subscribe to id
                    if (newDocument.room) {
                        Session.set('roomId', newDocument.room);
                        $('body').removeClass('login');
                    } else {
                        Session.set('roomId', null);
                        $('body').addClass('login');
                    }

                    Meteor.call('getOtherUserAvatar', Meteor.userId(), function(err, imageId){
                        if(imageId) {
                            Session.set('avatarId', imageId);
                        }
                    });
                }
            });
        } else {
            // reset all Session data
            Session.set('talking', false);
            Session.set('searching', false);
            Session.set('typing', false);
            Session.set('sound', false);
            Session.set('roomId', null);
            Session.set('expirationDate', null);
            Session.set('avatarId', null);
        }
    });
});