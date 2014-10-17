Meteor.publish('messages', function(roomId) {
    // by default open all messages
    return Messages.find({'roomId': roomId});
});


Meteor.publish('audios', function() {
    return Audios.find({});
});


Meteor.publish('users', function(roomId) {
    if (!this.userId) return [];

    var self = this;
    var users = [self.userId];

    if (roomId) {
        var room = Rooms.findOne({'_id': roomId});
        if (room && room.isActive) {
            var session = Sessions.findOne({'userId': self.userId});
            var remaining = _.without(room.sessions, session._id);
            if (remaining.length != 1) {
                throw Meteor.Error(500, 'remaining');
            }

            var participant = Sessions.findOne({'_id': remaining[0]});
            users.push(participant.userId);
        }
    }

    return Meteor.users.find({'_id': {$in: users}});
});


Meteor.publish('sessions', function(userId) {
    return Sessions.find({'userId': userId});
});


Meteor.publish('rooms', function(roomId) {
    return Rooms.find({'_id': roomId});
});


Meteor.publish("images", function() {
    return Images.find({});
});