/*
 TODO: Odanin dusmesi icin iki kisinin de next butonuna basmasi lazim yada
 sure bitmesi lazim. 1 adam odadan cikarsa (disconnect/logout) cikan adamin yerine next butonuna
 basilmis sayilicak.

 TODO: Kimler konusmus kimler konusmamis olayi icin Redis de
 'sortedset' kullanilicak. ???

 TODO: Firefox, Safari, Chrome ve Opera da test edilicek (Firefox da en son
 sikinti vardi.)
*/

var app = Npm.require('http').createServer();
var io = Npm.require('socket.io').listen(app);
var Fiber = Npm.require('fibers');

app.listen(4000);               // socketio listens on 4000
var shuffleName = 'x00x';       // our one and only  shuffle object name
var pile = [];                  // our pile of sockets {'socketid': socket.id, 'socket': socket}
var roomWatch = [];             // currently in use rooms designed as
                                // {'roomid': room.id, 'roomHandle': roomHandle}

Meteor.startup(function() {
    Sessions.remove({});
    Messages.remove({});
    Meteor.users.remove({});
    Shuffle.remove({});
    Rooms.remove({});
    pile.length = 0;

    // setup socket io settings
    io.sockets.on('connection', function(socket) {
        console.log('connection socket with id: ' + socket.id);
        pile.push({'socketid': socket.id, 'socket': socket});

        socket.on('disconnect', function() {
            // remove socket from pile
            var retract = _.find(pile, function(item) {
                return item.socketid == socket.id;
            });

            if (!retract) console.error('no socket to retract from pile!');
            var index = pile.indexOf(retract);
            pile.splice(index, 1);

            Fiber(function() {
                console.warn('disconnected: ' + socket.id);

                var session = Sessions.findOne({'sessions': {$in: [socket.id]}});
                if (!session) {
                    console.error('no session!');
                    return;
                }
                // reflect socket disconnection to its session
                Sessions.update(
                    {'_id': session._id},
                    {$pull: {'sessions': socket.id}, $inc: {'sessionCount': -1}});
                // if this session is exhausted of sockets
                // and was in use (i.e. talking) then
                // reflect that event to room as well.
                session = Sessions.findOne({'_id': session._id});
                if (session.talking && session.room && session.sessions.length == 0) {
                    console.log('this socket was in use in a session and room, cleanup');
                    Rooms.update({'_id': session.room}, {$addToSet: {'stopWatch': session._id}});
                }
            }).run();
        });

        socket.on('loggedIn', function(userId) {
            console.warn('loggedin, setting session: ' + socket.id);
            Fiber(function() {
                var user = Meteor.users.findOne({'_id': userId});
                if (!user) return;

                var session = Sessions.findOne({'userId': user._id});
                if (!session) {
                    // create session from scratch
                    Sessions.insert({
                        'userId': user._id,
                        'sessions': [socket.id],
                        'room': null,
                        'talking': false,
                        'sessionCount': 1
                    });
                } else {
                    Sessions.update({'_id': session._id},{
                        $addToSet: {'sessions': socket.id},
                    });
                    var one = Sessions.findOne({'_id': session._id});
                    Sessions.update(
                        {'_id': session._id},
                        {$set: {'sessionCount': one.sessions.length}});
                }
            }).run();
        });

        socket.on('loggedOut', function() {
            // TODO: loggedOut and disconnect needs to be merged/refactored
            Fiber(function() {
                var session = Sessions.findOne({'sessions': {$in: [socket.id]}});
                if (!session) {
                    console.warn('no session on logout!');
                    return;
                }

                Sessions.update(
                    {'_id': session._id},
                    {$pull: {'sessions': socket.id}, $inc: {'sessionCount': -1}});

                session = Sessions.findOne({'_id': session._id});
                if (session.talking && session.room && session.sessions.length == 0) {
                    console.log('this socket was in use in a session and room, cleanup');
                    Rooms.update({'_id': session.room}, {$addToSet: {'stopWatch': session._id}});
                }
            }).run();
        });

        socket.on('leave', function() {
            Fiber(function() {
                var session = Sessions.findOne({'sessions': {$in: [socket.id]}});
                if (!session) {
                    throw Meteor.Meteor.Error(500,
                        'Error 404: Not found',
                        'session not found when leaving');
                }

                console.log('session: ' + session._id);

                var room = Rooms.findOne({'sessions': {$in: [session._id]}});
                console.log('room: ' + room);
                Rooms.update(
                    {'_id': room._id},
                    {$addToSet: {'stopWatch': session._id}});
            }).run();
        });
    });

    // TODO: for debugging only, must be removed at production
    return Meteor.methods({
        removeAllMessages: function() {
            return Messages.remove({});
        },
        ru: function() {
            return Meteor.users.remove({});
        },
        lr: function() {
            var aa = Rooms.find().fetch();
            _.each(aa, function(a) {
                console.log(a);
            });
        },
        lm: function() {
            var aa = Messages.find().fetch();
            _.each(aa, function(a) {
                console.log(a);
            });
        },
        ls: function() {
            var ss = Sessions.find().fetch();
            _.each(ss, function(a) {
                console.log(a);
            });
        },
        ss: function() {
            var shuffle = Shuffle.find({}).fetch();
            _.each(shuffle, function(a) {
                console.log(a);
            });
        },
        v: function(userId) {
            if (!userId) return;

            Shuffle.upsert({'name': shuffleName}, {$addToSet: {'shuffle': userId}});
        },
        is: function() {
            console.log(Shuffle.find({}).count());
        },
        p: function() {
            console.log(pile.length);
            _.each(pile, function(a) {
                console.log(a.socketid);
            });
        }
    });
});

Meteor.publish('messages', function(roomId) {
    // by default open all messages
    return Messages.find({'roomId': roomId});
});

Meteor.publish('users', function(){
    return Meteor.users.find({});
});

Meteor.publish('sessions', function(){
    return Sessions.find({});
});


Shuffle.find({'name': shuffleName}).observe({
    changed: function (newDocument, oldDocument) {
        console.log('shuffle changed!');
        var shuffle = Shuffle.findOne({'name': shuffleName});
        if (shuffle && shuffle.shuffle.length > 1) {
            // match make here
            console.log('match needed!')
            var list = shuffle.shuffle;
            var bob = Meteor.users.findOne({'_id': list[0]});
            var judy = Meteor.users.findOne({'_id': list[1]});
            var bobSession = Sessions.findOne({'userId': bob._id});
            var judySession = Sessions.findOne({'userId': judy._id});
            var ss = [Sessions.findOne({'userId': bob._id}),
                      Sessions.findOne({'userId': judy._id})];

            var roomId = Rooms.insert({
                'sessions': [bobSession._id, judySession._id],
                'stopWatch': [],
                'isActive': true
            });

            // TODO: get a handle from  observe
            // and stop it once room is not active anymore
            var roomHandle = Rooms.find({'_id': roomId}).observe({
                changed: function (newDocument, oldDocument) {
                    var room = Rooms.findOne({'_id': roomId});

                    if (room.stopWatch.length == 2) {
                        // both of the clients wants to leave the room
                        io.to(room._id).emit('talking', false, null);
                        Rooms.update({'_id': room._id}, {$set: {'isActive': false}});
                        // drop handle, we no more require observe to run
                        var watchHandle = _.find(roomWatch, function(item) {
                            return item.roomid == room._id;
                        });

                        if (!watchHandle) {
                            console.error('cannot find room handle');
                            throw new Meteor.Meteor.Error(500, 'cannot find room hande');
                        }
                        // stop observing for this room
                        watchHandle.roomHandle.stop();
                        // remote this room from the watch
                    } else if (room.stopWatch.length == 1) {
                        // TODO: create a time here
                        // so that when timer expires
                        // it destroys the room
                        console.log('will create timer here');
                    }
                }
            });

            // watch this room for changes
            roomWatch.push({
                'roomid': roomId,
                'roomHandle': roomHandle
            });

            console.log('roomId: ' + roomId);
            // set all sessions as 'talking'
            _.each(ss, function(s) {
                Sessions.update({'_id': s._id},
                    {$set: {'talking': true, 'room': roomId}});

                _.each(s.sessions, function(socketId) {
                    var needle  = _.find(pile, function(item) {
                        return item.socketid == socketId;
                    });

                    if (!needle) {
                        console.error('needle not found!');
                        throw Meteor.Error(404, 'Error 404: Not found', details);
                    }

                    needle.socket.join(roomId);
                });
            });

            // send notification to all of room
            io.to(roomId).emit('talking', true, roomId);

            // after all ops
            Shuffle.update({'name': shuffleName}, {
                $pullAll: {'shuffle': [bob._id, judy._id]}
            });
        } // shuffle.length > 1
    }
});
