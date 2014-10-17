Template.home.helpers({
    getUserAvatar: function(){
        var user = Meteor.users.findOne({'_id': Meteor.userId()});
        return Images.findOne({'_id': user.avatarId});
    }
});