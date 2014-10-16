Session.setDefault('ready', false);

Template.login.events({
    'submit #login-form': function(e, t) {
        e.preventDefault();
        username = t.find('#account-username').value;
        password = t.find('#account-secret').value;
        Meteor.loginWithPassword(username, password, function(error) {
            if(error){
                alertify.error("Username or password invalid");
                t.find('#account-username').value = '';
                t.find('#account-secret').value = '';
            }
        });
        return false;
    },
    'submit #register-form': function(e, t){
        e.preventDefault();
        username = t.find('#register-username').value;
        password = t.find('#register-secret').value;
        Meteor.call('checkUsername', username, function(err, result){
            if (result){
                alertify.error("Username already in use");
                t.find('#register-username').value = '';
                t.find('#register-secret').value = '';
            } else {
                Accounts.createUser({
                    password: password,
                    username: username
                });
            }
        });
    }
});

Template.index.rendered = function () {
    Session.set('ready', true);
};