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

Meteor.startup(function() {
    Sessions.remove({});
    Messages.remove({});
    Meteor.users.remove({});
    Shuffle.remove({});
    Images.remove({});
    Rooms.remove({});

    // setup socket io settings
    io.sockets.on('connection', function(socket) {
        socket.on('disconnect', function() {
            console.log('disconnect reve');
            Fiber(function() {
                Meteor.sockets.disconnect(socket);
            }).run();
        });

        socket.on('loggedIn', function(userId) {
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
                        'typing': false,
                        'sound': true,
                        'socketCount': 1
                    });
                } else {
                    // do not reset talking or searching state here
                    // since user might have other devices at this point
                    Sessions.update({'_id': session._id},
                        {$addToSet: {'sockets': socket.id}});

                    var one = Sessions.findOne({'_id': session._id});
                    Sessions.update(
                        {'_id': session._id},
                        {$set: {'socketCount': one.sockets.length}});
                }
            }).run();
        });

        socket.on('loggedOut', function() {
            Fiber(function() {
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

                // XXX remove before prod
				var __rooms = Rooms.find(
                    {'sessions': {$in: [session._id]}, 'isActive': true}).fetch();
				Meteor.assert(__rooms.length == 1,
				    'there should only one active room for this session');
				var __recorded_room = Rooms.find({'_id': session.room, 'isActive': true}).fetch();
				Meteor.assert(__recorded_room.length == 1,
				    'there should only one active room for this session');
				Meteor.assert(__recorded_room[0]._id == __rooms[0]._id,
				    'room ids do not match for this session');

                var room = Rooms.findOne(
                    {'sessions': {$in: [session._id]}, 'isActive': true});

                // XXX remove before prod
                Meteor.assert(room._id == __recorded_room[0]._id, 'room ids do not match');

                if (!room) throw new Meteor.Error(500, 'room already inactive');

                ee.emit('leave', room._id);
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

                var toSessionId = remaining[0];
                var toSession = Sessions.findOne({'_id': toSessionId});
                // mark as not typing
                Sessions.update({'_id': toSessionId}, {$set: {'typing': false}});

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
                var toSessionId = remaining[0];
                Sessions.update({'_id': toSessionId}, {$set: {'typing': value}});
            }).run();
        });

        socket.on('sound', function(newSound){
            Fiber(function() {
                var session = Sessions.findOne({'sockets': {$in: [socket.id]}});
                if(!session) throw Meteor.Error(500, 'unable to find session');

                Sessions.update(
                    {'_id': session._id},
                    {$set: {sound: newSound}}
                );
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
        lu: function() {
            console.log('Users: ');
            var users = Meteor.users.find({}).fetch();
            _.each(users, function(a) {
                console.log(a);
            });
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

Meteor.publish('rooms', function(roomId) {
    return Rooms.find({'_id': roomId});
});

Meteor.publish("images", function() {
    return Images.find({});
});


Shuffle.find({'name': Settings.shuffleName}).observe({
    changed: function (newDocument, oldDocument) {
        var shuffle = Shuffle.findOne({'name': Settings.shuffleName});
        if (!shuffle) throw new Meteor.Error(500, 'Shuffle not found!');

        if (shuffle && shuffle.shuffle.length > 1) {
            // match make here
            // XXX change algo here
            var list = shuffle.shuffle;
            var bob = Meteor.users.findOne({'_id': list[0]});
            var judy = Meteor.users.findOne({'_id': list[1]});
            var bobSession = Sessions.findOne({'userId': bob._id});
            var judySession = Sessions.findOne({'userId': judy._id});
            var ss = [Sessions.findOne({'userId': bob._id}),
                      Sessions.findOne({'userId': judy._id})];

            // XXX remove at prod
            _.each(ss, function(_session) {
                Meteor.assert(_session, 'user session does ' +
                    'not exists while matching');
                Meteor.assert(!_session.talking, 'session should not be in talking mode');
                Meteor.assert(!_session.room, 'session should not have a room');
                Meteor.assert(_session.searching, 'should be in searching mode');
                Meteor.assert(_session.sockets.length == _session.socketCount,
                    'socket count non matching');
            });


            var roomId = Rooms.insert({
                'sessions': [bobSession._id, judySession._id],
                'isActive': true,
            });

            // emit start timeout event
            ee.emit('timeout', roomId);

            // set all sessions as 'talking'
            _.each(ss, function(s) {
                Sessions.update({'_id': s._id},
                    {$set: {
                        'talking': true,
                        'searching': false,
                        'room': roomId}});
            });

            // after all ops remove these guys from shuffle
            Shuffle.update(
                {'name': Settings.shuffleName},
                {$pullAll: {'shuffle': [bob._id, judy._id]}}
            );
        }
    }
});
