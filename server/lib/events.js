/*
    Send events throughout server side
*/
var EventEmitter = Npm.require('events').EventEmitter;
// global events
ee = new EventEmitter();

ee.on('timeout', function(roomId) {
    var self = this;
    self.room = Rooms.findOne({'_id': roomId});

    Meteor.assert(self.room, 'no such room: ' + roomId);
    if (!self.room.isActive) {
        return;
    }

    // set timeout for this room
    Meteor.setTimeout(function() {
        ee.emit('leave', self.room._id);
    }, Settings.roomTimeout);
});

// leave event when disbanding a room
ee.on('leave', function(roomId) {
    var room = Rooms.findOne({'_id': roomId});

    if (!room.isActive) {
        // room already disbanded, nothing more to do
        return;
    }

    Meteor.assert(room, 'no such room: ' + roomId);
    Meteor.assert(room.sessions.length == 2, 'session length does not match!');

    // do actual leave work here
    Rooms.update({'_id': roomId}, {'isActive': false});

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

