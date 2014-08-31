
/*
 TODO: Odanin dusmesi icin iki kisinin de next butonuna basmasi lazim yada
 sure bitmesi lazim. 1 adam odadan cikarsa cikan adamin yerine next butonuna
 basilmis sayilicak.

 TODO: Kimler konusmus kimler konusmamis olayi icin Redis de
 'sortedset' kullanilicak.

 TODO: Firefox, Safari, Chrome ve Opera da test edilicek (Firefox da en son
 sikinti vardi.)
*/

var app = Npm.require('http').createServer();
var io = Npm.require('socket.io').listen(app);
var Fiber = Npm.require('fibers');

app.listen(4000);
var shuffleName = 'x00x';
var pile = [];

Meteor.startup(function() {
    Sessions.remove({});
    Meteor.users.remove({});
    Shuffle.remove({});
    Rooms.remove({});
    pile.length = 0;

    // setup socket io settings
    io.sockets.on('connection', function(socket) {
        console.log('connection socket with id: ' + socket.id);
        pile.push({socket.id: socket});

        socket.on('disconnect', function() {
            // TODO: toolking == true Room icine stopWatch a user id sini koy
            Fiber(function() {
                console.warn('disconnected: ' + socket.id);

                var session = Sessions.findOne({'sessions': {$in: [socket.id]}});
                if (!session) {
                    console.error('no session!');
                    return;
                }

                Sessions.update(
                    {'_id': session._id},
                    {$pull: {'sessions': socket.id}, $inc: {'sessionCount': -1}});
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
            Fiber(function() {
                var session = Sessions.findOne({'sessions': {$in: [socket.id]}});
                if (!session) {
                    console.warn('no session on logout!');
                    return;
                }

                Sessions.update(
                    {'_id': session._id},
                    {$pull: {'sessions': socket.id}, $inc: {'sessionCount': -1}},
                    function(e){console.error(e)});
            }).run();
        });

        socket.on('trigger', function() {
            io.to('aaa').emit('pulse');
        });

        socket.on('disable', function() {
            socket.leave('aaa');
        });

        socket.on('enable', function() {
            socket.join('aaa');
        })
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
                console.log(a);
            });
        }
    });
});

Meteor.publish('messages', function(session_key) {
    // by default open all messages
    return Messages.find({});
});

Meteor.publish('users', function(){
    return Meteor.users.find({});
});

Meteor.publish('sessions', function(){
    return Sessions.find({});
});


Shuffle.find().observe({
    added: function (document) {
        console.log('shuffle enabled!');
    },
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

            // TODO: create room and enable socketio hooks here
            var roomId = Rooms.insert({
                'sessions': [bobSession._id, judySession._id],
                'stopWatch': [],
                'roomId': null
                // TODO: create a room and add roomId here
            });

            console.log('roomId: ' + roomId);
            // set all sessions as 'talking'
            _.each(ss, function(s) {
                Sessions.update({'_id': s._id},
                    {$set: {'talking': true, 'room': roomId}});
                _.each()

            });

            // after all ops
            Shuffle.update({'name': shuffleName}, {
                $pullAll: {'shuffle': [bob._id, judy._id]}
            });
        } else {
            console.log('no action');
        }
    }
});