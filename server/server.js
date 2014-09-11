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
shuffleName = 'x00x';           // our one and only  shuffle object name

Meteor.startup(function() {
    Sessions.remove({});
    Messages.remove({});
    Meteor.users.remove({});
    Shuffle.remove({});
    Rooms.remove({});

    // setup socket io settings
    io.sockets.on('connection', function(socket) {
        console.log('connection socket with id: ' + socket.id);
        Meteor.sockets.insert(socket);

        socket.on('disconnect', function() {
            Fiber(function() {
                console.warn('disconnected: ' + socket.id);
                Meteor.sockets.remove(socket);
                Meteor.sockets.disconnect(socket);
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
            Fiber(function() {
                console.log('calling for logout');
                Meteor.sockets.disconnect(socket);
            }).run();
        });

        // when clients presses 'next'
        socket.on('leave', function() {
            Fiber(function() {
                var session = Sessions.findOne({'sockets': {$in: [socket.id]}});
                if (!session) {
                    throw new Meteor.Error(500, 'session not found when leaving..');
                    return;
                }

                var room = Rooms.findOne({'sessions': {$in: [session._id]}, 'isActive': true});
                if (!room) {
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
                        var needle = Meteor.sockets.findOne(sId);
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
                }

                var room = Rooms.findOne({'_id': session.room});
                if (!room || !room.isActive || room.sessions.length != 2) {
                    throw Meteor.Error(500, 'unable to find a legit room');
                }

                var remaining = _.without(room.sessions, session._id);
                if (remaining.length != 1) {
                    throw Meteor.Error(500, 'remaining');
                }

                var toSession = Sessions.findOne({'_id': remaining[0]});

                var from = Meteor.users.findOne({'_id': session.userId}).username;
                var to = Meteor.users.findOne({'_id': toSession.userId}).username;

                Messages.insert({
                    'body': body,
                    'createdAt': Date.now(),
                    'from': from,
                    'to': to,
                    'roomId': room._id
                });
            }).run();
        });

        socket.on('typing', function(value) {
            Fiber(function() {
                var session = Sessions.findOne({'sockets': {$in: [socket.id]}});

                if (!session || !session.talking || !session.room) {
                    throw Meteor.Error(500, 'unable to find session');
                }

                var room = Rooms.findOne({'_id': session.room});
                if (!room || !room.isActive || room.sessions.length != 2) {
                    throw Meteor.Error(500, 'unable to find a legit room');
                }

                var remaining = _.without(room.sessions, session._id);
                if (remaining.length != 1) {
                    throw Meteor.Error(500, 'remaining');
                }

                var toSession = Sessions.findOne({'_id': remaining[0]});
                _.each(toSession.sockets, function(otherSocket) {
                    Meteor.sockets.findOne(otherSocket).socket.emit('typing', value);
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
            console.log('Rooms: ');
            var aa = Rooms.find().fetch();
            _.each(aa, function(a) {
                console.log(a);
            });
            console.log('-------------------------------');
        },
        lm: function() {
            console.log('Messages: ');
            var aa = Messages.find().fetch();
            _.each(aa, function(a) {
                console.log(a);
            });
            console.log('-------------------------------');
        },
        ls: function() {
            console.log('Sessions: ');
            var ss = Sessions.find().fetch();
            _.each(ss, function(a) {
                console.log(a);
            });
            console.log('-------------------------------');
        },
        s: function() {
            console.log('Shuffle: ');
            var shuffle = Shuffle.find({}).fetch();
            _.each(shuffle, function(a) {
                console.log(a);
            });
            console.log('-------------------------------');
        },
        p: function() {
            console.log('Sockets: ');
            Meteor.sockets.show();
            console.log('-------------------------------');
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

Meteor.publish('rooms', function(roomId){
    return Rooms.find({'_id': roomId});
});

Shuffle.find({'name': shuffleName}).observe({
    changed: function (newDocument, oldDocument) {
        console.log('shuffle changed!');
        var shuffle = Shuffle.findOne({'name': shuffleName});
        if (shuffle && shuffle.shuffle.length > 1) {
            // match make here
            console.log('match needed!')
            // TODO: change algo here
            var list = shuffle.shuffle;
            var bob = Meteor.users.findOne({'_id': list[0]});
            var judy = Meteor.users.findOne({'_id': list[1]});
            var bobSession = Sessions.findOne({'userId': bob._id});
            var judySession = Sessions.findOne({'userId': judy._id});
            var ss = [Sessions.findOne({'userId': bob._id}),
                      Sessions.findOne({'userId': judy._id})];

            var roomId = Rooms.insert({
                'sessions': [bobSession._id, judySession._id],
                'isActive': true,
                'avatars': [
                    {
                        'username': bob.username,
                        'avatar': bob.avatar || ''
                    },
                    {
                        'username': judy.username,
                        'avatar': judy.avatar || ''
                    }
                ]
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
                    var needle = Meteor.sockets.findOne(socketId);
                    if (!needle)
                        throw new Meteor.Error(500, 'no needle here');

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
