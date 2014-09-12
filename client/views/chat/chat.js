var socket;
var messageSubs;
var sessionHandle;
var observeHandle;
var roomSub;

Session.setDefault('talking', false);
Session.setDefault('searching', false);

Template.chat.events({
    'click #show_hide': function(e, t){
        $(".settings").stop().slideToggle();
    },
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
                if(new_password != ''){
                     Accounts.setPassword(Meteor.userId(), new_password);
                }
                Session.set('update_message', 'Profile has been updated');
            }else{
                Session.set('update_message', 'Secket Key Invalid');
                form.find('#current-password').value = '';
            }
        });
    },
    'click #close-message': function(e, t){
        Session.set('update_message', '');
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
    }
});

Template.chat.events({
    'click .ping': function() {
        if (Session.get('talking')) return;
        var response = Meteor.call('v', Meteor.user()._id);
        Session.set('searching', true);
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
    return Session.get('update_message') || '';
}


Meteor.startup(function() {
    socket = io.connect('http://l:4000');

    socket.on('talking', function(value, roomId) {
        console.log('change talking stat to ' + value);
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

    socket.on('searching', function(value) {
        Session.set('searching', value);
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
