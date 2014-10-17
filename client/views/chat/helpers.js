Template.chat.helpers({
    canvasDisplay: function(){
        if (Meteor.recStat.getRecording()) {
            return 'inline';
        } else {
            return 'none';
        }
    },
    recording: function(){
        return Meteor.recStat.getRecording();
    },
    messages: function(){
        return Messages.find({"roomId": Session.get('roomId')},
            { sort: {createdAt: -1}});
    }
});

Handlebars.registerHelper('session',function(input){
    return Session.get(input);
});

Handlebars.registerHelper('getOtherUserAvatar', function(){
    var ImageId = Session.get('avatarId');
    return Images.findOne({'_id': ImageId});
});

Handlebars.registerHelper('getOtherUser', function(){
    var guy = Meteor.users.find({'_id': {$ne: Meteor.userId()}}).fetch();
    if(guy.length > 0){
       return guy[0];
    }
    return 'anonim';
});