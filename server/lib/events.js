/*
    Send events throughout server side
*/
var EventEmitter = Npm.require('events').EventEmitter;
// global events
ee = new EventEmitter();
var pile = {};

ee.on('timeout', function(roomId) {
    console.log('timeout run');
    var room = Rooms.findOne({'_id': roomId});

    Meteor.assert(room, 'no such room: ' + roomId);
    if (!room.isActive) {
        return;
    }

    // set timeout for this room
    Meteor.setTimeout(function() {
        ee.emit('leave', room._id);
    }, Settings.roomTimeout);

    var interval = Meteor.setInterval(function() {
        room = Rooms.findOne({'_id': roomId});
        if (room.countdown <= 0 || !room.isActive) {
            console.log('clear interval..  ' + room.countdown + ':' + room._id);
            var interval = pile[room._id];
            Meteor.clearInterval(interval);
            delete pile[room._id];
        } else {
            Rooms.update({'_id': roomId},
                {$inc: {'countdown': -1}});
            var room = Rooms.findOne({'_id': room._id});
            console.log('countdown:room: ' + room.countdown + ":" + room._id);
        }
    }, 1000);

    pile[room._id] = interval;
});

// leave event when disbanding a room
// called from multiple locations
ee.on('leave', function(roomId) {
    var room = Rooms.findOne({'_id': roomId});
    console.log('leave room: ' + roomId + ":" + room.countdown);

    if (!room.isActive) {
        // room already disbanded, nothing more to do
        return;
    }

    Meteor.assert(room, 'no such room: ' + roomId);
    Meteor.assert(room.sessions.length == 2, 'session length does not match!');

    // do actual leave work here
    Rooms.update({'_id': roomId}, {$set: {'isActive': false}});

    // update each session accordingly
    _.each(room.sessions, function(session) {
        // XXX remove prod
        var ss = Sessions.findOne({'_id': session});
        Meteor.assert(ss.room == room._id, 'session must have correct room');

        // set session as none talking, searching
        Sessions.update(
            {'_id': session},
            {$set: {
                'talking': false,
                'room': null,
                'searching': true
            }}
        );

        var inner = Sessions.findOne({'_id': session});
        // set shuffle to fire 2secs later
        Meteor.setTimeout(function() {
            ee.emit('shuffle', inner._id);
        }, 2000);
    });
});

ee.on('shuffle', function(sessionId) {
    // add session to shuffle
    // if still in searching mode
    console.log('add to shuffle: ' + sessionId);
    var session = Sessions.findOne({'_id': sessionId});
    Meteor.assert(session, 'no session!!');
    Meteor.assert(session.userId, 'session must have a userid');

    // XXX remove prod maybe
    var user = Meteor.users.findOne({'_id': session.userId});
    Meteor.assert(user, 'user must be valid');

    if (session && session.searching) {
        Shuffle.update({'name': Settings.shuffleName},
            {$addToSet: {'shuffle': session.userId}});
    }
});

