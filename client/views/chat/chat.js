var socket;
var messageSubs;
var sessionHandle;
var observeHandle;
var roomSub;

Session.setDefault('talking', false);
Session.setDefault('searching', false);
Session.setDefault('updateMessage', '');
Session.setDefault('typing', false);

Template.chat.events({
    'click #show_hide': function(e, t){
        $(".settings").stop().slideToggle();
    },
    'keydown #input360': _.throttle(function(e, t) {
        console.log('started');
        socket.emit('typing', true);
    }, 750, {trailing: false}),
    'keyup #input360' : _.debounce(function(e, t) {
        console.log('stopped');
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
        var password = Package.sha.SHA256(form.find('#current-password').value);
        var new_password = form.find('#new-password').value;
        Meteor.call('checkPassword', password, function(err, result) {
            // password matched
            if (result) {
                Meteor.users.update(
                    { '_id': Meteor.userId() },
                    { $set: { 'username': username} }
                );
                // change new_passwordd
                if(new_password !== ''){
                     Accounts.setPassword(Meteor.userId(), new_password);
                }
                Session.set('updateMessage', 'Profile has been updated');
            }else{
                Session.set('updateMessage', 'Secket Key Invalid');
                form.find('#current-password').value = '';
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
    // var room = Rooms.find().fetch();
    // if(room.length > 0){
    //     var username = Meteor.user().username
    //     // active room
    //     room = room[0];
    //     // get other avatar
    //     var avatar = _.find(room.avatars, function(item) {
    //         return item.username != username;
    //     });
    //     console.log(avatar);

    //     return avatar[0].avatar || '';
    // }
    return '';
};


Meteor.startup(function() {
    socket = io.connect('http://l:4000');

    socket.on('talking', function(value, roomId) {
        console.log('change talking state to ' + value);
        Session.set('talking', value);
        if (!value && messageSubs) {
            // unsubscribe from messages
            // and clear roomId
            console.warn('unsub');
            messageSubs.stop();
            roomSub.stop();
            Session.set('roomId', null);
        } else if (value && roomId){
            // set roomId and subscrive to room messages
            console.warn('sub to ' + roomId);
            Session.set('roomId', roomId);
            messageSubs = Meteor.subscribe('messages', roomId);
            roomSub = Meteor.subscribe('rooms', roomId);
        }
    });

    socket.on('typing', function(value) {
        Session.set('typing', value);
    });

    Meteor.subscribe('users');

    Meteor.autorun(function() {
        if (Meteor.user()) {
            socket.emit('loggedIn', Meteor.user()._id);
            sessionHandle = Meteor.subscribe('sessions', Meteor.user()._id);
            observeHandle = Sessions.find({'userId': Meteor.user()._id}).observe({
                added: function (document) {
                    console.log('added session');
                    Session.set('talking', document.talking);
                    Session.set('searching', document.searching);
                },
                changed: function (newDocument, oldDocument) {
                    console.log('changed session');
                    Session.set('talking', newDocument.talking);
                    Session.set('searching', newDocument.searching);
                    console.log('n/o: ' + newDocument.talking + '/' + oldDocument.talking);
                }
            });
        } else {
            if (sessionHandle) {
                console.log('stop sessions/....');
                sessionHandle.stop();
                observeHandle.stop();
            }
        }
    });
});
