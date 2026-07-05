const { google } = require("googleapis");
const oauth2Client = require("../config/gmail");

const gmail = google.gmail({
  version: "v1",
  auth: oauth2Client,
});

const sendVerificationEmail = async (
  email,
  otp,
  subject = "Verification",
  title = "OTP Verification",
) => {
  console.log("\n====================================");
  console.log("[EMAIL] Gmail REST API");
  console.log("[EMAIL] Recipient :", email);
  console.log("[EMAIL] Subject   :", subject);
  console.log("[EMAIL] Time      :", new Date().toISOString());

  try {
    console.log("[EMAIL] Fetching Access Token...");

    const accessToken = await oauth2Client.getAccessToken();

    if (!accessToken.token) {
      throw new Error("Unable to obtain access token");
    }

    console.log("[EMAIL] Access Token acquired");

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      access_token: accessToken.token,
    });

    const message = [
      `From: CellNext <${process.env.NODEMAILER_EMAIL}>`,
      `To: ${email}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "",
      `
            <h2>${title}</h2>

            <p>Your OTP is</p>

            <h1>${otp}</h1>

            <p>This OTP expires soon.</p>
            `,
    ].join("\n");

    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    console.log("[EMAIL] Sending Gmail API request...");

    const start = Date.now();

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log("[EMAIL] SUCCESS");
    console.log("[EMAIL] Message Id :", response.data.id);
    console.log("[EMAIL] Time Taken :", Date.now() - start, "ms");

    console.log("====================================\n");

    return true;
  } catch (error) {
    console.log("\n=========== EMAIL FAILED ===========");

    console.log("Name:", error.name);

    console.log("Message:", error.message);

    console.log("Code:", error.code);

    console.log("Status:", error.status);

    console.log("Errors:", error.errors);

    console.log(error.stack);

    console.log("====================================\n");

    return false;
  }
};

module.exports = {
  sendVerificationEmail,
};
