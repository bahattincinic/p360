Template.message.hasOwner = function (from) {
    return Meteor.user().username == from;
};

Template.messageBody.isAudio = function () {
    return this.type === 'audio';
};

Template.messageBody.audioMessage = function (audioId) {
    return Audios.findOne({'_id': audioId});
};
