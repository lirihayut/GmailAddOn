// IMPORTANT: Replace this URL with your current ngrok forwarding address
const API_BASE_URL = "https://YOUR-ID-HERE.ngrok-free.app"; 

/**
 * Main Trigger Function.
 * Runs automatically when a user opens an email in Gmail.
 * * @param {Object} e - The event object containing message metadata.
 * @return {CardService.Card} The context card to display.
 */
function buildSecurityCard(e) {
  try {
    // 1. Access the current message using the ID and Access Token provided by the event
    var accessToken = e.messageMetadata.accessToken;
    var messageId = e.messageMetadata.messageId;
    GmailApp.setCurrentMessageAccessToken(accessToken);

    // Fetch the actual email content
    var message = GmailApp.getMessageById(messageId);
    var body = message.getPlainBody();
    
    // 2. Extract and clean the sender's email address (removes name, keeps only email)
    var rawSender = message.getFrom();
    var cleanSender = extractEmailAddress(rawSender);

    // Prepare the payload to send to our Backend Analysis Engine
    var payload = {
      sender: cleanSender, 
      body: body,
      links: extractLinks(body), // Extract all links for VirusTotal scanning
      headers: { "x-spf": "pass" } // Simulation: In a real app, we would parse raw headers
    };

    // 3. Send data to the Node.js Backend via HTTP POST
    var response = UrlFetchApp.fetch(API_BASE_URL + "/api/v1/scan", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true // Prevents script from crashing on 4xx/5xx errors
    });

    // Parse the JSON response from the server
    var result = JSON.parse(response.getContentText());

    // 4. If analysis is successful, build and return the UI card
    if (result.status === "success") {
      return createResultCard(result.data, cleanSender);
    }

    // Handle server-side application errors
    return createErrorCard("Server returned error: " + (result.message || "Unknown"));

  } catch (error) {
    // Handle network or script errors (e.g., Backend is down)
    console.log(error); 
    return createErrorCard("Connection failed. Check Ngrok URL.");
  }
}

/**
 * Builds the UI Card based on the security analysis results.
 * * @param {Object} data - The analysis data (score, verdict, reasons).
 * @param {String} senderEmail - The email address of the sender (for the block action).
 */
function createResultCard(data, senderEmail) {
  // Determine color coding based on verdict
  var color =
    data.verdict === "MALICIOUS" ? "#D32F2F" : // Red
    data.verdict === "SUSPICIOUS" ? "#FFA000" : // Orange
    "#388E3C"; // Green

  // Create the main section with Verdict and Score
  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText("<b>Verdict:</b> <font color=\"" + color + "\">" + data.verdict + "</font>"))
    .addWidget(CardService.newTextParagraph()
      .setText("<b>Risk Score:</b> " + data.score + "/100"));

  // Add analysis details (reasons) if available
  if (data.reasons && data.reasons.length) {
    section.addWidget(CardService.newTextParagraph().setText("<b>Analysis Details:</b>"));
    data.reasons.forEach(function(r) {
      section.addWidget(CardService.newTextParagraph().setText("• " + r));
    });
  }

  // Define the action for the "Block Sender" button
  var action = CardService.newAction()
      .setFunctionName("toggleBlacklist")
      .setParameters({ email: senderEmail });

  // Add the Block button to the UI
  section.addWidget(
    CardService.newTextButton()
      .setText("BLOCK SENDER")
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setBackgroundColor("#D32F2F") // Red button for danger action
      .setOnClickAction(action)
  );

  // Build the final card header
  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle("🛡️ Upwind Security")
        .setSubtitle("Scanner Active")
    )
    .addSection(section)
    .build();
}

/**
 * Handles the "Block Sender" button click.
 * Sends a request to the backend to add the email to the blacklist.
 */
function toggleBlacklist(e) {
  var email = e.parameters.email;
  
  try {
    // Send request to backend to update the blacklist
    UrlFetchApp.fetch(API_BASE_URL + "/api/v1/settings/blacklist", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ email: email }),
      muteHttpExceptions: true,
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    // Return a notification to the user
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("🚫 " + email + " added to blacklist!"))
      .build();

  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("Error updating blacklist"))
      .build();
  }
}

// --- Helper Functions ---

/**
 * Extracts all HTTP/HTTPS links from the email body.
 */
function extractLinks(text) {
  return text.match(/https?:\/\/[^\s>"]+/g) || [];
}

/**
 * Extracts a clean email address from a "Name <email>" format.
 */
function extractEmailAddress(raw) {
  var match = raw.match(/<([^>]+)>/);
  return match ? match[1] : raw;
}

/**
 * Creates a generic error card to display when something goes wrong.
 */
function createErrorCard(message) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("System Error"))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText("⚠️ " + message))
    )
    .build();
}
