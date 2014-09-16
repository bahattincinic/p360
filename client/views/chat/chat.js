var socket;
var messageSubs;
var sessionHandle;
var observeHandle;
var roomSub;
var messageObserveHandle;

Session.setDefault('talking', false);
Session.setDefault('searching', false);
Session.setDefault('updateMessage', '');
Session.setDefault('typing', false);
Session.setDefault('sound', false);

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
        var body = form.find('input[id=input360]').value;
        socket.emit('message', body);
        $('input[id=input360]').val('');
    },
    'submit #changeForm': function(e, form){
        e.preventDefault();
        var username =  form.find('#update-username').value;
        var new_password = form.find('#new-password').value;
        Meteor.call('checkUsername', username, function(err, result){
            if(result && Meteor.user().username != username){
                Session.set('updateMessage', 'username already in exists');
            }else{
                Meteor.users.update(
                    { '_id': Meteor.userId() },
                    { $set: { 'username': username} }
                );
                // change new_passwordd
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
        console.log('clicked next');
        // can leave only when talking
        if (Session.get('talking')) {
            socket.emit('leave');
            $('#next').toggleClass("yanyan");
        } else {
            console.warn('leave has no effect');
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
    }
});

Template.chat.rendered = function(){
    $.backstretch("destroy");
};

Template.chat.messages = function() {
    return Messages.find({"roomId": Session.get('roomId')},
        { sort: {createdAt: -1}});
};

Template.chat.isTalking = function() {
    return Session.get('talking');
};

Template.chat.isSearching = function(){
    return Session.get('searching');
};

Template.chat.infoMessage = function(){
    return Session.get('updateMessage');
};

Template.chat.isTyping = function() {
    return Session.get('typing');
}

Template.chat.getAvatar = function(){
    var room = Rooms.find().fetch();
    if(room.length > 0){
        var username = Meteor.user().username
        // active room
        room = room[0];
        // get other avatar
        var other = _.find(room.avatars, function(item) {
            return item.username != username;
        });

        return other.avatar || '';
    }
    return '';
};

Meteor.startup(function() {
    socket = io.connect('http://l:4000');
    Meteor.subscribe('users');

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
                        messageSubs = Meteor.subscribe('messages', newDocument.room);
                        roomSub = Meteor.subscribe('rooms', newDocument.room);
                        Session.set('roomId', newDocument.room);
                    } else {
                        // no room, stop all subscriptions
                        if (messageObserveHandle) messageObserveHandle.stop();
                        if (messageSubs) messageSubs.stop();
                        if (roomSub) roomSub.stop();
                        Session.set('roomId', null);
                    }
                }
            });

            if (Session.get('roomId') && Session.get('sound')) {
                messageObserveHandle = Messages.find({'roomId': Session.get('roomId'), 'to': Meteor.user().username}).observe({
                    added: function(document) {
                        console.log('new message added');
                    }
                });
            }
        } else {
            if (sessionHandle) {
                console.log('stop subscriptions....');
                if (sessionHandle) sessionHandle.stop();
                if (observeHandle) observeHandle.stop();
            }
        }
    });
});
