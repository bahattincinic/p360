var socket;
window.socket = socket;
var rec;

// session defaults
Session.setDefault('talking', false);
Session.setDefault('searching', false);
Session.setDefault('typing', false);
Session.setDefault('sound', false);
Session.setDefault('expirationDate', null);
Session.setDefault('avatarId', null);
Session.setDefault('countdown', Settings.countdown);

if (!navigator.getUserMedia) {
    navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
}


Template.chat.events({
    'click #start': function(e) {
        navigator.getUserMedia({audio: true}, function(mediaStream) {
            var context = new window.AudioContext();
            var mediaStreamSource = context.createMediaStreamSource(mediaStream);
            rec = new Recorder(mediaStreamSource);
            rec.record();
            console.log('started recording ');
        }, function(error) {
            console.log(JSON.stringify(error));
        });


        // webrtc impl
        // navigator.getUserMedia({audio: true}, function(mediaStream) {
        //     window.recordRTC = RecordRTC(mediaStream);
        //     console.log('invoke start recording');
        //     window.recordRTC.startRecording();
        // }, function(error) {
        //     console.log(JSON.stringify(error));
        // });
    },
    'click #stop': function(e) {
        console.log('try to stop');

        rec.stop();
        rec.exportWAV(function(blob) {
            console.log('got wav');
            console.dir(blob);
            socket.emit('transmission', {blob: blob, type: 'audio/wav'});
        });


        // recorder.exportWAV(function(blob) {
        //     var url = URL.createObjectURL(blob);
        //     var au = document.createElement('audio');
        //     au.controls = true;
        //     au.src = url;
        // }

        // webrtc impl
        // window.recordRTC.stopRecording(function(audioURL) {
        //     console.log('stopped');
        //     console.log(audioURL);
        //     mediaElement.src = audioURL;
        //     var audio = {
        //         type: 'audio/wav',
        //         dataUrl: audioURL
        //     }

        //     socket.emit('transmission', audio);
        // });
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
        if(body){
            socket.emit('message', body);
            $('input[id=input360]').val('');
        }
    },
    'submit #changeForm': function(e, form){
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
        if(event.target.files.length == 0){
            // empty data
            return false;
        }
        var fsFile = new FS.File(event.target.files[0]);
        fsFile.owner = Meteor.userId();
        var image = Images.insert(fsFile, function (err) {
              if (err){
                alertify.error("Avatar could not be updated");
                throw err;
              }else{
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

Template.chat.rendered = function() {
    $.backstretch("destroy");
};

Template.chat.messages = function() {
    return Messages.find({"roomId": Session.get('roomId')},
        { sort: {createdAt: -1}});
};

Template.message.hasOwner = function(from){
    return Meteor.user().username == from;
};

Template.chat.timeLeft = function() {
    return Session.get('countdown');
};

Template.chat.getOtherUserAvatar = function(){
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
    Meteor.subscribe('images');
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
