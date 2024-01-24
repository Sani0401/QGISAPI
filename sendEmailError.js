// emailSender.js
const nodemailer = require('nodemailer');

// Function to send an email
async function sendEmail(saltKey, state, district, tehsil, village, lgd_code, khasra_no) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'testqgis99@gmail.com', // Your Gmail email address
      pass: 'kmxc ewjy bjrn gfrx' // Your app-specific password
    }
  });





  const mailOptions = {
    from: 'testqgis99@gmail.com',
    to: 'jalindarjk12@gmail.com, info@jntpune.com, jaspune@gmail.com',
    subject: 'API: Error Code from Database',
    text: `
      Hello,

      This email includes the following variables:

      Salt Key: ${saltKey}
      State: ${state}
      District: ${district}
      Tehsil: ${tehsil}
      Village: ${village}
      LGD Code: ${lgd_code}
      Khasra Number: ${khasra_no}
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
