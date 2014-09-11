Template.login.events({
    'submit #login-form': function(e, t) {
        e.preventDefault();
        username = t.find('#account-username').value;
        secret = t.find('#account-secret').value;
        Meteor.loginWithPassword(username, secret, function(error) {
            if (!error){
                // login
                return false;
            }
            // check password
            Meteor.call('checkUsername', username, function(err, result){
                if (result){
                    Session.set('message', 'username is being used / username or passord invalid');
                    t.find('#account-username').value = '';
                    t.find('#account-secret').value = '';
                } else {
                    // register
                    Accounts.createUser({
                        password: secret,
                        username: username,
                        avatar: ''
                    }, function(err) {});
                    // XXX callback really needed here
                    // on createUser??
                }
            });
        });
        return false;
    },
    'click #close-message': function(e, t){
        Session.set('message', '');
    }
});

Template.login.message = function(){
    return Session.get('message') || '';
};

Template.login.rendered = function() {
      $.backstretch([
            "http://cdn.omgfacts.com/2014/5/12/14ecf36fda9414b6d1cc67f728dea42c.jpg",
            "http://allaboutlemon.files.wordpress.com/2012/09/earth-photo-from-cosmos-img1261.jpg"
      ], {duration: 3000, fade: 750});
};