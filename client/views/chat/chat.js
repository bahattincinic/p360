var socket;
var messageSubs;
var sessionHandle;

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
                    Session.set('session', false);
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
        var email =  form.find('#update-email').value;
        var password = Package.sha.SHA256(form.find('#current-password').value);
        var new_password = form.find('#new-password').value;
        Meteor.call('checkPassword', password, function(err, result) {
            // password matched
            if (result) {
                Meteor.users.update(
                    { '_id': Meteor.userId() },
                    { $set: { 'username': username,
                               'emails': [{ "address": email, "verified": true}]
                            }
                    }
                );
                // change new_passwordd
                if(new_password != ''){
                     Accounts.setPassword(Meteor.userId(), new_password);
                }
            }
        });
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
    if (Session.get('session')) {
        var ss = Sessions.findOne({'userId': Meteor.user()._id});
        if (!ss) {
            console.error('no session');
            return;
        }
        return ss.talking;
    } else {
        return false;
    }
    // return Session.get('talking');
};

Template.chat.isSearching = function(){
    return Session.get('searching');
}


Meteor.startup(function() {
    Session.set('talking', false);
    Session.set('searching', false);
    Session.set('session', false);
    socket = io.connect('http://l:4000');
    window.socket = socket;

    // TODO: replace this code here with ddp sessions
    socket.on('talking', function(value, roomId) {
        console.log('change talking stat to ' + value);
        Session.set('talking', value);
        if (!value && messageSubs) {
            // unsubscribe from messages
            // and clear roomId
            console.warn('unsub');
            messageSubs.stop();
            Session.set('roomId', null);
            Session.set('searching', false); // TODO: was true
        } else if (value && roomId){
            // set roomId and subscrive to room messages
            console.warn('sub to ' + roomId);
            Session.set('roomId', roomId);
            messageSubs = Meteor.subscribe('messages', roomId);
            Session.set('searching', false);
        }
    });

    Meteor.subscribe('users');

    Meteor.autorun(function() {
        if (Meteor.user()) {
            socket.emit('loggedIn', Meteor.user()._id);
            sessionHandle = Meteor.subscribe('sessions', Meteor.user()._id);
        } else {
            if (sessionHandle) {
                sessionHandle.stop();
            }
        }
    });
});

