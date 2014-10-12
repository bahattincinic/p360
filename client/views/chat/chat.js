var socket;                     // clients socket.io end
var rec = null;                 // main recording device
var recStat = new Recording;
//
// session defaults
Session.setDefault('talking', false);
Session.setDefault('searching', false);
Session.setDefault('typing', false);
Session.setDefault('sound', false);
Session.setDefault('expirationDate', null);
Session.setDefault('avatarId', null);
Session.setDefault('countdown', Settings.countdown);

// for recording
var audioContext = new window.AudioContext();   // get audioContext
var inputPoint = null;                          // for recording
var mediaStreamSource = null;                   // for recording

Template.chat.events({
    'click #start': function(e) {
        /**
            Set for audio recording
            requesting permission from the user
        **/
        navigator.getUserMedia({audio: true},
            function(mediaStream) {
                inputPoint = audioContext.createGain();
                mediaStreamSource = audioContext.createMediaStreamSource(mediaStream);
                mediaStreamSource.connect(inputPoint);
                // analyser
                analyserNode = audioContext.createAnalyser();
                analyserNode.fftsize = 2048;
                inputPoint.connect(analyserNode);
                // create recorder
                rec = new Recorder(mediaStreamSource, {}, recStat);
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

                    socket.emit('message', {
                        body: null,
                        type: 'audio',
                        payloadId: audio._id
                    });
                }
            });
        });
    },
    'click .show_hide': function(e, t){
        $(".settings").stop().slideToggle();
        return false;
    },
    'keydown #input360': _.throttle(function(e, t) {
        socket.emit('typing', true);
    }, 750, {trailing: false}),
    'keyup #input360' : _.debounce(function(e, t) {
        socket.emit('typing', false);
    }, 1500, false),
    'click #logoutAction': function(e, t){
        Meteor.logout(function(err){
            if(!err && socket) {
                socket.emit('loggedOut');
            }
        })
        return false;
    },
    'submit #form360': function(e, form) {
        e.preventDefault();
        var body = $.trim(form.find('input[id=input360]').value);
        if (body) {
            socket.emit('message', {
                body: body,
                type: 'text'
            });
            $('input[id=input360]').val('');
        }
    },
    'submit #changeForm': function(e, form) {
        e.preventDefault();
        var username =  form.find('#update-username').value;
        var new_password = form.find('#new-password').value;
        Meteor.call('checkUsername', username, function(err, result){
            if(result && Meteor.user().username != username){
                alertify.error("username already exists");
            }else{
                Meteor.users.update(
                    { '_id': Meteor.userId() },
                    { $set: { 'username': username} }
                );

                // change new_password
                if(new_password !== ''){
                     Accounts.setPassword(Meteor.userId(), new_password);
                }

                alertify.success("Profile has been updated");
            }
        });
    },
    'click #next': function(e, t) {

        // can leave only when talking
        if (Session.get('talking')) {
            socket.emit('leave');
            $('#next').toggleClass("yanyan");
        }
    },
    // starts searching for a room
    'click .ping': function() {
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
        socket.emit('sound', newSound);
    },
    'change .avatarInput': function(event, template) {
        if (event.target.files.length == 0) {
            // empty data
            return false;
        }

        var fileBuffer = event.target.files[0];
        var fsFile = new FS.File(fileBuffer);
        fsFile.owner = Meteor.userId();
        var image = Images.insert(fsFile, function (err) {
            if (err) {
              alertify.error("Avatar could not be updated");
              throw err;
            } else {
              alertify.success("Avatar has been updated");
            }
        });

        var imageId = image._id;

        Meteor.users.update({'_id': Meteor.userId()},
            {$set : {'avatarId': imageId}},
            function(err) {
                if (err) throw err;}
        );

    }
});

Template.chat.canvasDisplay = function() {
    if (recStat.getRecording()) {
        return 'inline';
    } else {
        return 'none';
    }
};

Template.chat.recording = function() {
    // return Session.get('recording');
    return recStat.getRecording();
};

Template.chat.rendered = function() {
    $.backstretch("destroy");
};

Template.chat.messages = function() {
    return Messages.find({"roomId": Session.get('roomId')},
        { sort: {createdAt: -1}});
};

Template.chat.timeLeft = function() {
    return Session.get('countdown');
};

Template.chat.getOtherUserAvatar = function() {
    var ImageId = Session.get('avatarId');
    return Images.findOne({'_id': ImageId});
}

Template.chat.getOtherUser = function(){
    var guy = Meteor.users.find({'_id': {$ne: Meteor.userId()}}).fetch();
    if(guy.length > 0){
        return guy[0];
    }
    return 'anonim';
}

Template.chat.getUserAvatar = function(){
    var user = Meteor.users.findOne({'_id': Meteor.userId()});
    return Images.findOne({'_id': user.avatarId});
}

Handlebars.registerHelper('session',function(input){
    return Session.get(input);
});

// room autorun
Tracker.autorun(function() {
    if (Session.get('roomId')) {
        // sub to this room messages
        Meteor.subscribe('messages', Session.get('roomId'));
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
    if (recStat.getRecording()) {
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
    var origin = window.location.host.split(":")[0];
    var connTarget = origin + ':' + Settings.ioPort;
    socket = io.connect(connTarget);
    // XXX: to be changed
    Meteor.subscribe('images');
    Meteor.subscribe('audios');
    // user autorun
    Tracker.autorun(function() {
        /**
            This autorun reruns everytime
            any of the subscription is updated
            i.e. started talking with another person,
            other person disconnects, etc..
        */
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

            socket.emit('loggedIn', Meteor.user()._id);
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
                    } else {
                        Session.set('roomId', null);
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
