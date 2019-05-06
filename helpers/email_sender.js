const nodemailer = require('nodemailer');
const config = require('../config/config');

const transporter = nodemailer.createTransport({
    service: config.service,
    auth   : {
        user: config.user,
        pass: config.pass,
    },
});

const sendEmail = (to, subject, text) => {
    var mailOptions = {
        to,
        text,
        subject,
        from: config.user,
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
};

module.exports.sendEmail = sendEmail;