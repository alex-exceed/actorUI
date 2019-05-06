const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'aiongame85@gmail.com',
        pass: 'Bsx466kd'
    }
});

const sendEmail = (to, subject, text, ecb, cb) => {
    var mailOptions = {
        to,
        text,
        subject,
        from: 'aiongame85@gmail.com'
    };
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

module.exports.sendEmail = sendEmail;