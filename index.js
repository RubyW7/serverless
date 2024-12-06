import AWS from 'aws-sdk';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import {
 SecretsManagerClient,
 GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";


const secret_name = "email_service_credentials2";


const client = new SecretsManagerClient({
 region: "us-east-1",
});


let response;


try {
 response = await client.send(
   new GetSecretValueCommand({
     SecretId: secret_name,
     VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
   })
 );
} catch (error) {
 // For a list of exceptions thrown, see
 // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
 throw error;
}


const secret = JSON.parse(response.SecretString);
console.log(secret.apikey)


const mailgun = new Mailgun(formData);
const mg = mailgun.client({
username: 'api',
key: secret.apikey
});


export const handler = async (event) => {
const message = JSON.parse(event.Records[0].Sns.Message);
const email = message.email;
const firstName = message.first_name;
const token = message.userToken;  // get token from sns




try {
 // use Mailgun send email
 const emailResponse = await mg.messages.create("demo.rubyw.xyz", {
   from: 'no-reply@demo.rubyw.xyz',
   to: [email],
   subject: "Welcome to our website! Please confirm your email",
   text: `Hello ${firstName},








Welcome to our website! We're excited to have you here.








Please click on the following link to verify your email address: https://demo.rubyw.xyz/v1/user/verifyUserEmail?email=${email}&token=${token}








If you did not request this, please ignore this email.








Best Regards,
Your Company Name`,
   html: `<p>Hello ${firstName},</p>








<p>Welcome to our website! We're excited to have you here.</p>








<p>Please click on the following link to verify your email address: <a href="https://demo.rubyw.xyz/v1/user/verifyUserEmail?email=${email}&token=${token}">Verify Email</a></p>








<p>If you did not request this, please ignore this email.</p>




`
 });
 console.log('Email sent:', emailResponse);
} catch (error) {
 console.error('Error sending email:', error);
}
};
