/*
    Send events throughout server side
*/
var EventEmitter = Npm.require('events').EventEmitter;
// global events
ee = new EventEmitter();
var pile = [];

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
        // set session as not talking
        Sessions.update(
            {'_id': session},
            {$set: {
                'talking': false,
                'room': null,
                'searching': true
            }}
        );

        var inner = Sessions.findOne({'_id': session});
        Meteor.setTimeout(function() {
            ee.emit('shuffle', inner.userId);
        }, 2000);
    });
});


ee.on('shuffle', function(sessionId) {
    // add user to shuffle
    Shuffle.update({'name': Settings.shuffleName},
        {$addToSet: {'shuffle': sessionId}});
});

