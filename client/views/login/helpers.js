Handlebars.registerHelper('isCordova', function(equal){
    if(equal == 'not'){
        return !Meteor.isCordova;
    }
    return Meteor.isCordova;
});
