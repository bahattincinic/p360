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
    checkUsername: function(username){
        var user = Meteor.users.findOne({username: username});
        // true: exists
        // false: not exists
        return user? true: false;
    },
    // called when user clicked on 'ping' button
    // adds user to shuffle list, marks user Session as 'searching'
    startSearching: function(userId) {
        if (!userId) return;
        Shuffle.upsert({'name': shuffleName},
            {$addToSet: {'shuffle': userId}});

        // get session for this user
        var userSession = Sessions.findOne({'userId': userId});
        if (!userSession) {
            // user must have a session at this point
            throw new Meteor.Error(500, 'user must have session');
            return;
        }

        // mark this sessions as searching
        Sessions.update({'_id': userSession._id},
            {$set: {'searching': true}});
    },
    // reverts 'startSearching' effects
    // removes user from Shuffle list and fixes user Session
    stopSearching: function(userId) {
        if (!userId) return;

        var shuffle = Shuffle.findOne({'name': shuffleName});
        if (!shuffle) throw new Meteor.Error(500, 'no shuffle record');

        var userSession = Sessions.findOne({'userId': userId});
        if (!userSession || userSession.talking || !userSession.searching)
            throw new Meteor.Error(500, 'session problem while stopSearching, ' +
                'check session');

        // remove user from Shuffle
        Shuffle.update({'name': shuffleName}, {$pull: {'shuffle': userId}});
        // set user session as non-searching
        Sessions.update({'_id': userSession._id}, {$set: {'searching': false}});
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
        // refresh session
        session = Sessions.findOne({'_id': session._id});

        // any other sockets left for this disconnecting session?
        if (session.sockets.length > 0) {
            // sockets left in session, do nothing more
            return;
        }

        Sessions.update({'_id': session._id},
            {$set: {'talking': false, 'searching': false}})

        if (!session.room) {
            // nothing more to do here
            return;
        }

        var room = Rooms.findOne({'_id': session.room});
        if (!room) throw new Meteor.Error(500, 'unable to find room');

        // check if room was active
        if (room.sessions.length == 2 && room.isActive) {
            // mark room as inactive
            Rooms.update({'_id': room._id}, {$set: {'isActive': false}});

            // take care of first guy
            socket.leave(room._id);
            Sessions.update({'_id': session._id}, {$set: {'room': null}});

            // get other guy
            var remaining = _.without(room.sessions, session._id);
            if (remaining.length != 1)
                throw new Meteor.Error(500, 'no other session');

            var otherSessionId = remaining[0];
            Sessions.update(
                {'_id': otherSessionId},
                {$set: {
                    'talking': false,
                    'searching': true,
                    'room': null
                }}
            );

            var otherSession = Sessions.findOne({'_id': otherSessionId});
            // in here var xxx is socket id
            _.each(otherSession.sockets, function(xxx) {
                var retract = self.findOne(xxx);
                retract.socket.leave(room._id);
            });


            // add other party to shuffle list
            Shuffle.update({'name': shuffleName},
                {$addToSet: {'shuffle': otherSession.userId}});
        }
    };
};

Meteor.sockets = new Staple();
