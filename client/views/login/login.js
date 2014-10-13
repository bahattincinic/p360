Session.setDefault('ready', false);

Template.login.events({
    'submit #login-form': function(e, t) {
        e.preventDefault();
        username = t.find('#account-username').value;
        secret = t.find('#account-secret').value;

        Meteor.loginWithPassword(username, secret, function(error) {
            Meteor.call('checkUsername', username, function(err, result){
                if (result){
                    alertify.error("Error username is being used / username or passord invalid");
                    t.find('#account-username').value = '';
                    t.find('#account-secret').value = '';
                } else {
                    // register
                    Accounts.createUser({
                        password: secret,
                        username: username
                    }, function(err, res) {
                        if (err) throw err;
                    });
                }
            });
        });
        return false;
    }
});

Template.index.rendered = function () {
    Session.set('ready', true);
};