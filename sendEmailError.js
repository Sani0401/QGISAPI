// emailSender.js
const nodemailer = require('nodemailer');

// Function to send an email
async function sendEmail(saltKey, district,lgd_code, khasra_no ) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'testqgis99@gmail.com', // Your Gmail email address
      pass: 'kmxc ewjy bjrn gfrx' // Your app-specific password
    }
  });


  const subject = `API: Error Code - Salt Key: ${saltKey}`;


  const mailOptions = {
    from: 'testqgis99@gmail.com',
    to: 'jalindarjk12@gmail.com, info@jntpune.com, jaspune@gmail.com',
    subject: subject,
    text: `
      Hello,
      This email includes the following variables:
      Salt Key:        ${saltKey}
      District:        ${district}     
      LGD Code:        ${lgd_code}
      Khasra Number:   ${khasra_no}
    `
  };


  

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

module.exports = { sendEmail };
