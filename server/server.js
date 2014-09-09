/*
 TODO: Odanin dusmesi icin iki kisinin de next butonuna basmasi lazim yada
 sure bitmesi lazim. 1 adam odadan cikarsa (disconnect/logout) cikan adamin yerine next butonuna
 basilmis sayilicak.

 TODO: Kimler konusmus kimler konusmamis olayi icin Redis de
 'sortedset' kullanilicak. ???

 TODO: Firefox, Safari, Chrome ve Opera da test edilicek (Firefox da en son
 sikinti vardi.)

 TODO: karsidaki adam cikinca digeri isTalking=false, isSearching=true olucak
       room kapanacak.
*/

var app = Npm.require('http').createServer();
var io = Npm.require('socket.io').listen(app);
var Fiber = Npm.require('fibers');

app.listen(4000);               // socketio listens on 4000
shuffleName = 'x00x';       // our one and only  shuffle object name
pile = [];                  // our pile of sockets {'socketid': socket.id, 'socket': socket}

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
            Fiber(function() {
                console.warn('disconnected: ' + socket.id);
                var retract = Meteor.call('findSocket', socket.id);
                var index = pile.indexOf(retract);
                pile.splice(index, 1);

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
                if (session.sockets.length == 0) {
                    // if no than set this session as non-talking, non-searching session
                    Sessions.update({'_id': session._id},
                        {$set: {'talking': false, 'searching': false}});
                    // check if this session was in use in a room
                    if (session.room) {
                        var room = Rooms.findOne({'_id': session.room});
                        // and room is active..
                        if (room && room.sessions.length == 2 && room.isActive) {
                            // get other guy
                            var remaining = _.without(room.sessions, session._id);
                            if (remaining.length != 1) {
                                throw new Meteor.Error(500, 'remaining length');
                                return;
                            }
                            Sessions.update({'_id': remaining[0]},
                                {$set: {
                                    'talking': false,
                                    'searching': true,
                                    'room': null
                                }});
                            var otherSession = Sessions.findOne({'_id': remaining[0]});
                            _.each(otherSession.sockets, function(_socket) {
                                var retract = Meteor.call('findSocket', _socket);
                                retract.socket.leave(room._id);
                            });

                            // add other party to shuffle list
                            Shuffle.update({'name': shuffleName},
                                {$addToSet: {'shuffle': otherSession.userId}});
                        }
                    }
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
                        'sockets': [socket.id],
                        'room': null,
                        'talking': false,
                        'searching': false,
                        'socketCount': 1
                    });
                } else {
                    Sessions.update({'_id': session._id},{
                        $addToSet: {'sockets': socket.id},
                    });
                    var one = Sessions.findOne({'_id': session._id});
                    Sessions.update(
                        {'_id': session._id},
                        {$set: {'socketCount': one.sockets.length}});
                }
            }).run();
        });

        socket.on('loggedOut', function() {
            // TODO: loggedOut and disconnect needs to be merged/refactored
            Fiber(function() {
                var session = Sessions.findOne({'sockets': {$in: [socket.id]}});
                if (!session) {
                    console.warn('no session on logout!');
                    return;
                }

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
                if (session.sockets.length == 0) {
                    // if no than set this session as non-talking, non-searching session
                    Sessions.update({'_id': session._id},
                        {$set: {'talking': false, 'searching': false}});
                    // check if this session was in use in a room
                    if (session.room) {
                        var room = Rooms.findOne({'_id': session.room});
                        // and room is active..
                        if (room && room.sessions.length == 2 && room.isActive) {
                            // get other guy
                            var remaining = _.without(room.sessions, session._id);
                            if (remaining.length != 1) {
                                throw new Meteor.Error(500, 'remaining length');
                                return;
                            }

                            Sessions.update({'_id': remaining[0]},
                                {$set: {
                                    'talking': false,
                                    'searching': true,
                                    'room': null
                                }});
                            var otherSession = Sessions.findOne({'_id': remaining[0]});
                            _.each(otherSession.sockets, function(_socket) {
                                var retract = Meteor.call('findSocket', _socket);
                                retract.socket.leave(room._id);
                            });

                            // add other party to shuffle list
                            Shuffle.update({'name': shuffleName},
                                {$addToSet: {'shuffle': otherSession.userId}});
                        }
                    }
                }
            }).run();
        });

        // when clients presses 'next'
        socket.on('leave', function() {
            Fiber(function() {
                var session = Sessions.findOne({'sockets': {$in: [socket.id]}});
                if (!session) {
                    throw Meteor.Meteor.Error(500, 'session not found when leaving..');
                    return;
                }

                var room = Rooms.findOne({'sessions': {$in: [session._id]}, 'isActive': true});
                if (!room) {
                    Meteor.call('lr');
                    throw new Meteor.Error(500, 'room already inactive');
                    return;
                }

                // announce to room that we are no longer talking
                io.to(room._id).emit('talking', false, null);
                Rooms.update({'_id': room._id}, {$set: {'isActive': false}});

                console.log('process room: ' + room._id);
                _.each(room.sessions, function(session) {
                    console.log('process leave for sessions: ' + session);
                    // set session as not talking
                    Sessions.update({'_id': session},
                        {$set: {
                            'talking': false,
                            'room': null,
                            'searching': true
                        }});

                    // make all sockets leave the room
                    var inner = Sessions.findOne({'_id': session});
                    _.each(inner.sockets, function(sId) {
                        var needle = Meteor.call('findSocket', sId);
                        needle.socket.leave(room._id);
                    })

                    // add user to shuffle
                    Shuffle.update({'name': shuffleName},
                        {$addToSet: {'shuffle': inner.userId}});
                });
            }).run();
        });

        socket.on('message', function(body) {
            Fiber(function() {
                var session = Sessions.findOne({'sockets': {$in: [socket.id]}});
                // make sure we have a takling active session
                if (!session || !session.talking || !session.room) {
                    throw Meteor.Error(500, 'unable to find session');
                    return;
                }

                var room = Rooms.findOne({'_id': session.room});
                if (!room || !room.isActive || room.sessions.length != 2) {
                    throw Meteor.Error(500, 'unable to find room');
                    return;
                }

                var remaining = _.without(room.sessions, session._id);
                if (remaining.length != 1) {
                    throw Meteor.Error(500, 'remaining');
                    return;
                }

                var toSession = Sessions.findOne({'_id': remaining[0]});

                var from = Meteor.users.findOne({'_id': session.userId}).username;
                var to = Meteor.users.findOne({'_id': toSession.userId}).username;

                // TODO: maybe do not block here
                Messages.insert({
                    'body': body,
                    'createdAt': Date.now(),
                    'from': from,
                    'to': to,
                    'roomId': room._id
                });
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
        s: function() {
            var shuffle = Shuffle.find({}).fetch();
            _.each(shuffle, function(a) {
                console.log(a);
            });
        },
        v: function(userId) {
            // TODO: rename this func
            if (!userId) return;
            Shuffle.upsert({'name': shuffleName},
                {$addToSet: {'shuffle': userId}});
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

Meteor.publish('users', function() {
    return Meteor.users.find({});
});

Meteor.publish('sessions', function(userId) {
    return Sessions.find({'userId': userId});
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
                'isActive': true
            });

            console.log('roomId: ' + roomId);
            // set all sessions as 'talking'
            _.each(ss, function(s) {
                Sessions.update({'_id': s._id},
                    {$set: {
                        'talking': true,
                        'searching': false,
                        'room': roomId
                    }});

                _.each(s.sockets, function(socketId) {
                    var needle = Meteor.call('findSocket', socketId);
                    needle.socket.join(roomId);
                });
            });

            // send notification to all of room
            io.to(roomId).emit('talking', true, roomId);

            // after all ops remove these guys from shuffle
            Shuffle.update({'name': shuffleName}, {
                $pullAll: {'shuffle': [bob._id, judy._id]}
            });
        }
    }
});
