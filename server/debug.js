Meteor.startup(function() {
    Sessions.remove({});
    Messages.remove({});
    Meteor.users.remove({});
    Shuffle.remove({});
    Images.remove({});
    Rooms.remove({});

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