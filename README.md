
#  Upwind Email Security Scorer (Gmail Add-on)

A native Gmail Add-on that provides a **security intelligence layer** directly inside your inbox. It allows users to analyze email risks and manage their security posture without leaving Gmail.

---

##  Tech Stack

* **Google Apps Script** – Cloud-based development for Google Workspace
* **CardService API** – Build native, responsive UI within Gmail
* **UrlFetchApp** – Secure communication between Google Cloud and Node.js backend
* **OAuth 2.0 Scopes** – Minimal access to user data using the principle of least privilege

---

##  Engineering Decisions

1. **Contextual Triggering**

   * Triggers only when an email is opened (`contextualTriggers`)
   * Ensures performance and limits unnecessary data access

2. **Secure Token Management**

   * Uses scoped `accessToken` to read only the current message metadata and body
   * Minimizes the security surface and protects user privacy

3. **Dynamic UI Construction**

   * UI built dynamically with CardService API
   * Colors and content adapt based on backend response (Red = Malicious, Green = Safe)

4. **Cloud-to-Local Connectivity (ngrok)**

   * Local development with ngrok while the Add-on runs on Google infrastructure
   * Added custom headers (`ngrok-skip-browser-warning`) for seamless communication

---

##  Project Structure

```
AddOn/
├─ Code.gs           # Core logic: fetching data & building UI Cards
└─ appsscript.json   # Manifest: defining scopes, triggers, and metadata
```

---

##  Permissions (OAuth Scopes)
* `gmail.readonly` – Required to fetch full message body and metadata for analysis.
* `script.external_request` – Allows communication with the external scoring backend.
* `script.locale` – Ensures a localized user experience.

---

##  How to Run

1. **Create Project**
   Open [Google Apps Script](https://script.google.com/) and create a new project.

2. **Setup Manifest**
   Replace the content of `appsscript.json` with the provided JSON configuration.

3. **Add Logic**
   Copy `Code.gs` content and update `API_BASE_URL` with your current ngrok address.

4. **Deploy**

   * Click **Deploy > Test deployments**
   * Install the Add-on to your Gmail account

5. **Analyze Emails**
   Open any email in Gmail and click the **Upwind Security Scorer** icon in the sidebar

