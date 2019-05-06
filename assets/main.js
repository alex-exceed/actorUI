(function($){
    $('#submit').click(function() {
        var email = $('#email').val();
        var key = $('#key').val();
        if (!key) return alert('Key is required')
        if (!email) return alert('Email is required')

        $.ajax({
            url: "/scrape",
            type: "POST",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: JSON.stringify({
                email: email,
                key: key
            }),
            contentType: "application/json",
            cache: false,
            timeout: 5000,
            success: function(data) {
                alert('We started to process your request. Email will be sent when it\'s finished!');
            },
            error: function(error) {
                alert('Something went wrong, please try again!');
            },
        });
    })
})(jQuery)