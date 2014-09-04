var socket;
var messageSubs;

Template.chat.events({
    'click #show_hide': function(e, t){
        $(".settings").stop().slideToggle();
    },
    'click #logoutAction': function(e, t){
        Meteor.logout(function(err){
            if(!err && socket) {
                socket.emit('loggedOut');
            }
        })
    },
    'submit #form360': function(e, form) {
        e.preventDefault();
        var body = form.find('input[id=input360]').value;
        // TODO: maybe move message insert to socketio
        return Messages.insert({
                body: body,
                createdAt: Date.now(),
                roomId: Session.get('roomId'),
                username: Meteor.user().username
        });
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
        } else {
            console.warn('leave has no effect');
        }
    }
});

Template.shuffle.events({
    'click #ping': function() {
        if (Session.get('talking')) return;

        var response = Meteor.call('v', Meteor.user()._id);
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


Meteor.startup(function() {
    Session.set('talking', false);
    socket = io.connect('http://l:4000');
    window.socket = socket;

    socket.on('talking', function(value, roomId) {
        console.log('change talking stat to ' + value);
        Session.set('talking', value);
        if (!value && messageSubs) {
            // unsubscribe from messages
            // and clear roomId
            console.warn('unsub');
            messageSubs.stop();
            Session.set('roomId', null);
        } else if (value && roomId){
            // set roomId and subscrive to room messages
            console.warn('sub to ' + roomId);
            Session.set('roomId', roomId);
            messageSubs = Meteor.subscribe('messages', roomId);
        }
    });

    Meteor.subscribe('users');

    Meteor.autorun(function() {
        if (Meteor.user()) {
            socket.emit('loggedIn', Meteor.user()._id);
        }
    });
});

