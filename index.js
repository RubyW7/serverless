// Import AWS SDK v3 modules
const { DynamoDBClient, GetItemCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// Initialize AWS SDK v3 clients
const dynamoDbClient = new DynamoDBClient({ region: process.env.EmailTrackingDynamoDBRegion || "us-east-1" });
const sesClient = new SESClient({ region: process.env.EmailTrackingDynamoDBRegion || "us-east-1" });

// Function to check if an email has already been sent
const checkIfEmailSentAlready = async (emailTrackingDynamoDBTable, userEmail) => {
  const params = {
    TableName: emailTrackingDynamoDBTable,
    Key: { email: { S: userEmail } },
  };
  try {
    const { Item } = await dynamoDbClient.send(new GetItemCommand(params));
    console.log("Check email sent status - Data:", Item);
    return !!Item;
  } catch (err) {
    console.error("Error querying DynamoDB:", err);
    throw err;
  }
};

// Function to log the email sent to DynamoDB
const logEmailSentToDynamoDB = async (emailTrackingDynamoDBTable, userEmail) => {
  const params = {
    TableName: emailTrackingDynamoDBTable,
    Item: { email: { S: userEmail } },
  };
  try {
    const data = await dynamoDbClient.send(new PutItemCommand(params));
    console.log("Email logged to DynamoDB - Data:", data);
  } catch (err) {
    console.error("Error logging email to DynamoDB:", err);
    throw err;
  }
};

// Function to send an email via SES
const sendEmail = async (userEmail, first_name, last_name, domainEnvironment, userToken) => {
  const params = {
    Destination: { ToAddresses: [userEmail] },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `<p>Hello ${first_name} ${last_name},</p>
                 <p>To verify your email address with ${domainEnvironment}.rubyw.xyz, please click the following link:
                 <a href="https://${domainEnvironment}.rubyw.xyz/v1/verifyUserEmail?email=${userEmail}&token=${userToken}">Verify Email</a>
                 or paste the following link in your browser: https://${domainEnvironment}.rubyw.xyz/v1/verifyUserEmail?email=${userEmail}&token=${userToken}</p>`
        }
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Verify your user account for ${domainEnvironment}.rubyw.xyz`
      }
    },
    Source: `userverification@${domainEnvironment}.rubyw.xyz`,
  };
  try {
    const data = await sesClient.send(new SendEmailCommand(params));
    console.log("Email sent successfully - Response:", data);
  } catch (err) {
    console.error("Failed to send email:", err);
    throw err;
  }
};

// Lambda handler function
exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 4));
  const emailTrackingDynamoDBTable = process.env.EmailTrackingDynamoDBTable;
  const domainEnvironment = process.env.DomainEnvironment || "demo";

  const message = JSON.parse(event.Records[0].Sns.Message);
  const { username: userEmail, first_name, last_name, userToken } = message;

  try {
    const emailAlreadySent = await checkIfEmailSentAlready(emailTrackingDynamoDBTable, userEmail);
    if (!emailAlreadySent) {
      await sendEmail(userEmail, first_name, last_name, domainEnvironment, userToken);
      await logEmailSentToDynamoDB(emailTrackingDynamoDBTable, userEmail);
    } else {
      console.log("Email already sent to user: " + userEmail + ". No need to send again.");
    }
  } catch (err) {
    console.error("Error processing the Lambda function:", err);
    return err; // Returning the error for debugging purposes
  }
  return "Success";
};
