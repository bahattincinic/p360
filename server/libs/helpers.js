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
    findSocket: function(socketId) {
        var retract = _.find(pile, function(item) {
            return item.socketid == socketId;
        });

        if (!retract) {
            throw new Meteor.Error(500, 'cannot find socket');
            return;
        }
        return retract;
    }
});