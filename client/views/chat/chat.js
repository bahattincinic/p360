var socket;
var messageSubs;
var sessionHandle;
var observeHandle;
var roomSub;
var messageObserveHandle;
var roomObserveHandle;
var interval;
// session defaults
Session.setDefault('talking', false);
Session.setDefault('searching', false);
Session.setDefault('updateMessage', '');
Session.setDefault('typing', false);
Session.setDefault('sound', false);
Session.setDefault('expirationDate', null);


Template.chat.events({
    'click #show_hide': function(e, t){
        $(".settings").stop().slideToggle();
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
                if (sessionHandle) {
                    sessionHandle.stop();
                }
            }
        })
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
                Session.set('updateMessage', 'username already exists');
            }else{
                Meteor.users.update(
                    { '_id': Meteor.userId() },
                    { $set: { 'username': username} }
                );
                // change new_password
                if(new_password !== ''){
                     Accounts.setPassword(Meteor.userId(), new_password);
                }

                Session.set('updateMessage', 'Profile has been updated');
            }
        });
    },
    'click #close-message': function(e, t){
        Session.set('updateMessage', '');
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
        var fsFile = new FS.File(event.target.files[0]);
        fsFile.owner = Meteor.userId();
        var image = Images.insert(fsFile, function (err) {
          if (err) throw err;
        });

        var imageId = image._id;

        Meteor.users.update({'_id': Meteor.userId()},
            {$set : {'avatarId': imageId}},
            function(err) {
                console.log('user update ');
                if (err) throw err;}
        );

    }
});

Template.chat.rendered = function(){
    $.backstretch("destroy");
};

Template.chat.messages = function() {
    return Messages.find({"roomId": Session.get('roomId')},
        { sort: {createdAt: -1}});
};

Template.chat.getAvatar = function() {
    // var room = Rooms.findOne();

    // if(room) {

    //     var session = Sessions.findOne();
    //     var other = _.find(room.sessions, function(sessionId) {
    //         return sessionId != session._id;
    //     });

    //     var otherSession

    //     var otherAvatar = Images.findOne({'_id': other.avatar});
    //     return otherAvatar;
    // }

    return null;
};

Template.message.hasOwner = function(from){
    return Meteor.user().username == from;
};

Template.chat.timeLeft = function() {
    return Session.get('expirationDate') - Session.get('now');
};

Handlebars.registerHelper('session',function(input){
    return Session.get(input);
});

Meteor.autorun(function() {
    if (Session.get('expirationDate')) {
        interval = Meteor.setInterval(function() {
            Session.set('now', Math.floor(new Date().getTime() / 1000));
        }, 1000);
    } else {
        Meteor.clearInterval(interval);
    }
});

// room autorun
Meteor.autorun(function() {
    if (Session.get('roomId')) {
        // sub to this room messages
        messageSubs = Meteor.subscribe('messages', Session.get('roomId'));
        // sub to this room
        roomSub = Meteor.subscribe('rooms', Session.get('roomId'));

        roomObserveHandle = Rooms.find({'_id': Session.get('roomId')}).observe({
            added: function(newDocument) {
                var seconds = Math.floor(new Date().getTime() / 1000) + Settings.xx;
                Session.set('expirationDate', seconds);
            }
        });
    } else {
        // no room, stop all subscriptions
        if (roomObserveHandle) roomObserveHandle.stop();
        if (messageSubs) messageSubs.stop();
        if (roomSub) roomSub.stop();
        Session.set('expirationDate', null);
    }
});

// sound autorun
Meteor.autorun(function() {
    if (Meteor.user() && Session.get('sound') && Session.get('roomId')) {
        messageObserveHandle = Messages.find(
            {'roomId': Session.get('roomId'), 'to': Meteor.user().username}).observe({
            added: function(document) {
                $('#soundNot')[0].play();
            }
        });
    } else {
        // no longer in need of this observe
        if (messageObserveHandle) messageObserveHandle.stop();
    }
});

Meteor.startup(function() {
    socket = io.connect('http://l:4000');
    Meteor.subscribe('users');
    Meteor.subscribe('images');
    // user autorun
    Meteor.autorun(function() {
        if (Meteor.user()) {
            socket.emit('loggedIn', Meteor.user()._id);
            sessionHandle = Meteor.subscribe('sessions', Meteor.user()._id);
            observeHandle = Sessions.find({'userId': Meteor.user()._id}).observe({
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
                }
            });
        } else {
            // since user logged out, we no longer need any of these subs
            if (sessionHandle) sessionHandle.stop();
            if (observeHandle) observeHandle.stop();
            if (roomObserveHandle) roomObserveHandle.stop();
            if (messageObserveHandle) messageObserveHandle.stop();
            if (messageSubs) messageSubs.stop();
            if (roomSub) roomSub.stop();
            // reset all Session data
            Session.set('talking', false);
            Session.set('searching', false);
            Session.set('typing', false);
            Session.set('sound', false);
            Session.set('roomId', null);
            Session.set('updateMessage', '');
            Session.set('expirationDate', null);
        }
    });
});
