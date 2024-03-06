// emailSender.js
const nodemailer = require('nodemailer');

// Function to send an email
async function sendEmailLimit(saltKey) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'testqgis99@gmail.com', // Your Gmail email address
      pass: 'kmxc ewjy bjrn gfrx' // Your app-specific password
    }
  });




   
  const mailOptions = {
    from: 'metatestqgis99@gmail.com',
    to: 'kaalindarjk12@gmail.com  ,info@mnspune.com, sassypune@gmail.com',
    subject: 'API Limit Exceeded Notification',
    text: `
      Hello,
       ${saltKey} has exceeded limit.
       Please check.
      
    `
  };


  

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

module.exports = { sendEmailLimit };
