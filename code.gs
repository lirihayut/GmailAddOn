const API_BASE_URL = "https://interterritorial-nonpreventable-carmelia.ngrok-free.dev";

function buildSecurityCard(e) {
  try {
    GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);

    var message = GmailApp.getMessageById(e.gmail.messageId);
    var body = message.getPlainBody();
    var sender = message.getFrom();

    var payload = {
      sender: sender,
      body: body,
      links: extractLinks(body),
      headers: { "x-spf": "fail" }
    };

    var response = UrlFetchApp.fetch(API_BASE_URL + "/api/v1/scan", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    var result = JSON.parse(response.getContentText());

    if (result.status === "success") {
      return createResultCard(result.data, sender);
    }

    return createErrorCard("Server error");

  } catch (e) {
    return createErrorCard("Connection failed");
  }
}

function createResultCard(data, senderEmail) {
  var color =
    data.verdict === "MALICIOUS" ? "#FF0000" :
    data.verdict === "SUSPICIOUS" ? "#FFA500" :
    "#00FF00";

  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText("<b>Verdict:</b> <font color=\"" + color + "\">" + data.verdict + "</font>"))
    .addWidget(CardService.newTextParagraph()
      .setText("<b>Risk Score:</b> " + data.score + "/100"));

  if (data.reasons && data.reasons.length) {
    section.addWidget(CardService.newTextParagraph().setText("<b>Analysis Details:</b>"));
    data.reasons.forEach(function(r) {
      section.addWidget(CardService.newTextParagraph().setText("• " + r));
    });
  }

  section.addWidget(
    CardService.newTextButton()
      .setText("BLOCK SENDER (ADD TO BLACKLIST)")
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName("toggleBlacklist")
          .setParameters({ email: senderEmail })
      )
  );

  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle("Email Security Analysis")
        .setSubtitle("Powered by Upwind Scorer")
    )
    .addSection(section)
    .build();
}

function toggleBlacklist(e) {
  try {
    UrlFetchApp.fetch(API_BASE_URL + "/api/v1/settings/blacklist", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ email: e.parameters.email }),
      muteHttpExceptions: true,
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("Sender added to blacklist"))
      .build();

  } catch (e) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("Blacklist update failed"))
      .build();
  }
}

function extractLinks(text) {
  return text.match(/https?:\/\/[^\s]+/g) || [];
}

function createErrorCard(message) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("System Error"))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(message))
    )
    .build();
}
