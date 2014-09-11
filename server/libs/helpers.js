
Meteor.methods({
    checkPassword: function(digest) {
        check(digest, String);

        if (this.userId) {
            var user = Meteor.user();
            var password = {digest: digest, algorithm: 'sha-256'};
            var result = Accounts._checkPassword(user, password);
            return result.error == null;
        } else {
            return false;
        }
    },
    // TODO: move this into Meteor.socket()
    findSocket: function(socketId) {

    },
    // TODO: add this to Meteor.socket() maybe
    removeSocket: function(socketId) {
        var retract = Meteor.call('findSocket', socketId);

    }
});


// XXX move Staple to its own file and rename it
function Staple() {
    // There shall be only one Staple instance exist at all times
    if (arguments.callee._singletonInstance)
        return arguments.callee._singletonInstance;
    arguments.callee._singletonInstance = this;
    var self = this;

    self._pile = [];     // _pile of sockets, for socket bookkeeping
    self.resetPile = function() { // reset all _pile XXX remove at prod
        self._pile.length = 0;
    };
    self.show = function() { // for debugging purposes only XXX to be removed
        console.log('total: ' + self._pile.length);
        _.each(self._pile, function(a) {
            console.log(a._id);
        });
    };
    self.insert = function(socket) { // add a new socket to _pile
        return self._pile.push({'_id': socket.id, 'socket': socket});
    };
    self.findOne = function(socketId) {
        var retract = _.find(self._pile, function(item) {
            return item._id == socketId;
        });

        if (!retract)
            return null;
        return retract;
    };
    self.remove = function(socket) {
        var retract = self.findOne(socket.id);
        if (!retract)
            return false

        var index = self._pile.indexOf(retract);
        self._pile.splice(index, 1);
        return true;
    };
    self.disconnect = function(socket) {
        var session = Sessions.findOne({'sockets': {$in: [socket.id]}});
        if (!session) {
            console.error('no session!');
            return;
        }

        // reflect socket disconnection to its session
        Sessions.update(
            {'_id': session._id},
            {$pull: {'sockets': socket.id}, $inc: {'socketCount': -1}});
        session = Sessions.findOne({'_id': session._id});
        if (session.room) {
            var room = Rooms.findOne({'_id': session.room});
            if (room.isActive) {
                socket.leave(room._id);
            }
        }

        // any other sockets left for this disconnecting session?
        if (session.sockets.length > 0) {
            // sockets left in session, do nothing more
            return;
        }

        // if no than set this session as non-talking, non-searching session
        Sessions.update({'_id': session._id},
            {$set: {'talking': false, 'searching': false}});

        // check if this session was in use in a room
        if (!session.room) {
            // nothing more to do
            return;
        }

        var room = Rooms.findOne({'_id': session.room});
        // and room is active..
        if (room && room.sessions.length == 2 && room.isActive) {
            // get other guy
            var remaining = _.without(room.sessions, session._id);
            if (remaining.length != 1) {
                throw new Meteor.Error(500, 'remaining length');
                return;
            }
            Sessions.update(
                {'_id': remaining[0]},
                {$set: {
                    'talking': false,
                    'searching': true,
                    'room': null
                }}
            );
            var otherSession = Sessions.findOne({'_id': remaining[0]});
            _.each(otherSession.sockets, function(_socket) {
                var retract = Meteor.call('findSocket', _socket);
                retract.socket.leave(room._id);
            });

            // add other party to shuffle list
            Shuffle.update({'name': shuffleName},
                {$addToSet: {'shuffle': otherSession.userId}});
        }
    };
};

Meteor.sockets = new Staple();
