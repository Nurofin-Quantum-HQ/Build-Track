const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const cloudinary = require('../config/cloudinary');
const express = require("express");
const crypto = require("crypto");
const EsignRequest = require("../models/EsignRequest");
const { protect } = require("../middleware/auth");
const router = express.Router();
// [BT-SEC-03] /request and /status/:id are called by the logged-in app and now
// require auth. The signer-facing routes (/details/:token, /submit, /sign/:token)
// stay public — they are addressed by an unguessable 256-bit token, not by id.
router.post("/request", protect, async (req, res) => {
  try {
    const { clientEmail, meta } = req.body;
    if (!clientEmail) {
      return res.status(400).json({ message: "clientEmail is required" });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const esignReq = new EsignRequest({
      createdBy: req.user._id,          // [BT-SEC-03] stamp the owner
      clientEmail,
      token,
      status: 'pending',
      meta: meta || {}
    });
    await esignReq.save();
    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const signUrl = `${backendUrl}/api/esign/sign/${token}`;
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Signature Requested</h2>
        <p>You have been requested to sign a cash receipt for BuildTrack.</p>
        <p>Please click the button below to review and sign the receipt:</p>
        <a href="${signUrl}" style="display: inline-block; padding: 12px 24px; background-color: #173EEA; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Sign Receipt</a>
        <p style="margin-top: 24px; font-size: 12px; color: #666;">This link expires in 1 hour.</p>
      </div>
    `;
    if (process.env.AWS_ACCESS_KEY_ID && process.env.SES_FROM_EMAIL) {
      try {
        const sesClient = new SESClient({
          region: process.env.AWS_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
          }
        });
        const command = new SendEmailCommand({
          Destination: { ToAddresses: [clientEmail] },
          Message: {
            Body: { Html: { Data: emailHtml, Charset: "UTF-8" } },
            Subject: { Data: "Signature Required: BuildTrack Cash Receipt", Charset: "UTF-8" }
          },
          Source: process.env.SES_FROM_EMAIL
        });
        await sesClient.send(command);
        console.log("SES email sent successfully to", clientEmail);
      } catch (e) {
        console.error("Fetch to SES failed:", e.message);
        return res.status(500).json({ message: "Internal error while sending email" });
      }
    } else {
      console.warn("SES credentials not configured. Email not sent.");
      return res.status(500).json({ message: "Server email configuration is missing (AWS_ACCESS_KEY_ID or SES_FROM_EMAIL)" });
    };
    res.status(201).json({
      message: "E-Signature request created",
      requestId: esignReq._id
    });
  } catch (error) {
    console.error("Error creating e-sign request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.get("/details/:token", async (req, res) => {
  try {
    const esignReq = await EsignRequest.findOne({ token: req.params.token });
    if (!esignReq) {
      return res.status(404).json({ message: "Invalid or expired token" });
    }
    res.json({
      status: esignReq.status,
      meta: esignReq.meta,
      createdAt: esignReq.createdAt,
    });
  } catch (error) {
    console.error("Error fetching e-sign details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.get("/status/:id", protect, async (req, res) => {
  try {
    // [BT-SEC-03] Scope to the owner so one tenant cannot read another's signature
    // data by guessing an id. Legacy rows created before this field existed have no
    // createdBy, so also allow a match on those to avoid breaking in-flight requests.
    const esignReq = await EsignRequest.findOne({
      _id: req.params.id,
      $or: [{ createdBy: req.user._id }, { createdBy: { $exists: false } }],
    });
    if (!esignReq) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.json({
      status: esignReq.status,
      signatureData: esignReq.signatureData,
      signedAt: esignReq.signedAt
    });
  } catch (error) {
    console.error("Error fetching e-sign status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.post("/submit", async (req, res) => {
  try {
    const { token, signatureData } = req.body;
    if (!token || !signatureData) {
      return res.status(400).json({ message: "Token and signatureData are required" });
    }
    const esignReq = await EsignRequest.findOne({ token });
    if (!esignReq) {
      return res.status(404).json({ message: "Invalid or expired token" });
    }
    if (esignReq.status === 'signed') {
      return res.status(400).json({ message: "This request has already been signed" });
    }
    esignReq.status = 'signed';
    esignReq.signatureData = signatureData;
    esignReq.signedAt = new Date();
    await esignReq.save();
    let receiptUrl = signatureData;
    if (process.env.CLOUDINARY_API_KEY) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(signatureData, {
          folder: 'buildtrack_receipts'
        });
        receiptUrl = uploadResponse.secure_url;
      } catch (err) {
        console.error("Error uploading receipt to Cloudinary:", err);
      }
    }
    if ((process.env.AWS_ACCESS_KEY_ID && process.env.SES_FROM_EMAIL) && esignReq.clientEmail) {
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px;">
          <h2 style="color: #15803D; text-align: center;">Receipt Authorized Successfully</h2>
          <p>Thank you! Your receipt authorization has been successfully recorded.</p>
          <p>Below is a copy of your signed receipt for your records:</p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${receiptUrl}" target="_blank">
              <img src="${receiptUrl}" alt="Authorized Receipt" style="max-width: 100%; border: 1px solid #ccc; border-radius: 8px;" />
            </a>
          </div>
          <p style="text-align: center; font-size: 12px; color: #666; margin-top: 10px;">
            If the image does not load, <a href="${receiptUrl}">click here to view it</a>.
          </p>
        </div>
      `;
      try {
        if (process.env.AWS_ACCESS_KEY_ID && process.env.SES_FROM_EMAIL) {
          const sesClient = new SESClient({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
          });
          const command = new SendEmailCommand({
            Destination: { ToAddresses: [esignReq.clientEmail] },
            Message: {
              Body: { Html: { Data: emailHtml, Charset: "UTF-8" } },
              Subject: { Data: "Your Authorized BuildTrack Receipt", Charset: "UTF-8" }
            },
            Source: process.env.SES_FROM_EMAIL
          });
          await sesClient.send(command);
        }
      } catch (err) {
        console.error("Error sending receipt email via SES:", err);
      }
    }
    res.json({ message: "Signature submitted successfully" });
  } catch (error) {
    console.error("Error submitting signature:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});
router.get("/sign/:token", async (req, res) => {
  try {
    const esignReq = await EsignRequest.findOne({ token: req.params.token });
    if (!esignReq) {
      return res.status(404).send(`
        <html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error</title></head>
        <body style="background-color: #F4F5FF; font-family: sans-serif; text-align: center; padding: 40px;">
          <h2>Invalid or expired token</h2>
        </body></html>
      `);
    }
    if (esignReq.status === 'signed') {
      return res.send(`
        <html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Receipt Signed</title></head>
        <body style="background-color: #F4F5FF; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
          <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
            <h2 style="color: #15803D;">✅ Receipt Signed</h2>
            <p>Thank you! This receipt has already been securely signed.</p>
          </div>
        </body></html>
      `);
    }
    const meta = esignReq.meta || {};
    function transliterate(text, lang) {
      if (!text || typeof text !== 'string') return text;
      if (lang === 'en') return text;
      const dict = {
        kn: { 'A': 'ಎ', 'B': 'ಬಿ', 'C': 'ಸಿ', 'D': 'ಡಿ', 'E': 'ಇ', 'Project': 'ಪ್ರಾಜೆಕ್ಟ್', 'Phase': 'ಫೇಸ್', 'Foundation': 'ಫೌಂಡೇಶನ್' },
        ta: { 'A': 'ஏ', 'B': 'பி', 'C': 'சி', 'D': 'டி', 'E': 'இ', 'Project': 'ப்ராஜெக்ட்', 'Phase': 'ஃபேஸ்', 'Foundation': 'பவுண்டேஷன்' }
      };
      let res = text;
      for (const [eng, loc] of Object.entries(dict[lang] || {})) {
        res = res.replace(new RegExp(eng, 'gi'), loc);
      }
      return res;
    }
    const metaRows = Object.entries(meta).map(([key, val]) => {
      let formattedVal = val;
      if (key === 'amount') formattedVal = '₹' + val;
      else if (key === 'date' && val) formattedVal = new Date(val).toISOString().substring(0, 10);
      else if (!val) formattedVal = 'N/A';
      const label = key.replace(/([A-Z])/g, ' $1').trim();
      return `<div class="row"><span class="label" style="text-transform: capitalize;" data-key="${key}">${label}</span><span class="value">${formattedVal}</span></div>`;
    }).join('');
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Review & Authorize Receipt</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body {
          background-color: #F4F5FF;
          font-family: 'Inter', sans-serif;
          margin: 0;
          padding: 20px;
          display: flex;
          justify-content: center;
        }
        .container {
          background: white;
          width: 100%;
          max-width: 500px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          padding: 24px;
          box-sizing: border-box;
        }
        .lang-selector {
          text-align: right;
          margin-bottom: 15px;
        }
        .lang-selector select {
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid #E2E4F6;
          background-color: white;
          font-family: 'Inter', sans-serif;
          color: #1E1E2E;
          font-weight: 500;
          cursor: pointer;
        }
        h2 {
          text-align: center;
          margin-top: 0;
          font-weight: 800;
          color: #1E1E2E;
        }
        .divider {
          height: 1px;
          background: #E2E4F6;
          margin: 20px 0;
        }
        .row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .label {
          color: #6B7280;
          font-weight: 600;
          font-size: 14px;
        }
        .value {
          color: #1E1E2E;
          font-weight: 700;
          font-size: 14px;
          text-align: right;
          max-width: 60%;
        }
        .btn {
          background-color: #173EEA;
          color: white;
          border: none;
          padding: 16px;
          width: 100%;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 20px;
          transition: background 0.2s;
        }
        .btn:hover { background-color: #102BB5; }
        .btn:disabled { background-color: #9CA3AF; cursor: not-allowed; }
        .error { color: #DC2626; font-size: 14px; text-align: center; margin-top: 10px; display: none; }
      </style>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    </head>
    <body>
      <div class="container">
        <div class="lang-selector" data-html2canvas-ignore="true">
          <select id="lang-select">
            <option value="en">English</option>
            <option value="kn">Kannada</option>
            <option value="ta">Tamil</option>
          </select>
        </div>
        <h2 id="title-text">CASH RECEIPT</h2>
        <div class="divider"></div>
        ${metaRows}
        <div class="divider"></div>
        <p class="error" id="error-msg"></p>
        <button class="btn" id="submit">I Authorize & Sign</button>
      </div>
      <script>
        const token = "${req.params.token}";
        const i18n = {
          en: {
            title: "CASH RECEIPT",
            btnAuth: "I Authorize & Sign",
            btnAuthWait: "Authorizing...",
            stampTitle: "Authorized and Signed",
            stampIp: "IP:",
            stampDate: "Date:",
            successTitle: "Receipt Authorized",
            successMsg: "Thank you! Your authorization has been securely recorded.",
            errNetwork: "Network error. Try again.",
            keys: {
              projectName: "Project Name", itemName: "Item Name", type: "Type", activityName: "Activity Name", phase: "Phase",
              totalAmount: "Total Amount", alreadyPaid: "Already Paid", amount: "Amount",
              paymentMethod: "Payment Method", notes: "Notes", date: "Date"
            }
          },
          kn: {
            title: "Nagadu Rasidi",
            btnAuth: "Naanu Angikarisuthene & Sahimaduthene",
            btnAuthWait: "Angikarisalaguttide...",
            stampTitle: "Angikarisalagide mattu sahimadalagide",
            stampIp: "IP:",
            stampDate: "Dinaanka:",
            successTitle: "Rasidi Angikarisalagide",
            successMsg: "Dhanyavadagalu! Nimmma angikaravannu surakshitavagi dakhale madalagide.",
            errNetwork: "Network dosha. Matte prayatnisi.",
            keys: {
              projectName: "Project Hesaru", itemName: "Item Hesaru", type: "Vidhagalu", activityName: "Activity Hesaru", phase: "Hantha",
              totalAmount: "Ottu Motta", alreadyPaid: "Eegagale Pavatislagide", amount: "Motta",
              paymentMethod: "Pavathi Vidhana", notes: "Tippanigalu", date: "Dinaanka"
            }
          },
          ta: {
            title: "Rokka Rasithu",
            btnAuth: "Naan Angikarikiren & Kaiyeluthidugiren",
            btnAuthWait: "Angikarikirathu...",
            stampTitle: "Angikarikkappattathu mariyum kaiyeluthidappattathu",
            stampIp: "IP:",
            stampDate: "Thethi:",
            successTitle: "Rasithu Angikarikkappattathu",
            successMsg: "Nandri! Ungal angikaram pathukappaga pathivu seyyappattullathu.",
            errNetwork: "Network pizhai. Meendum muyarchi seyyavum.",
            keys: {
              projectName: "Project Peyar", itemName: "Item Peyar", type: "Vagai", activityName: "Activity Peyar", phase: "Kattam",
              totalAmount: "Motha Thogai", alreadyPaid: "Earkanave Seluthappattathu", amount: "Thogai",
              paymentMethod: "Seluthum Murai", notes: "Kurippugal", date: "Thethi"
            }
          }
        };
        let currentLang = 'en';
        document.getElementById('lang-select').addEventListener('change', (e) => {
          currentLang = e.target.value;
          const t = i18n[currentLang];
          document.getElementById('title-text').innerText = t.title;
          if (!document.getElementById('submit').disabled) {
            document.getElementById('submit').innerText = t.btnAuth;
          } else {
            document.getElementById('submit').innerText = t.btnAuthWait;
          }
          document.querySelectorAll('.label').forEach(el => {
            const key = el.getAttribute('data-key');
            if (t.keys[key]) {
              el.innerText = t.keys[key];
            }
          });
        });
        document.getElementById('submit').addEventListener('click', async () => {
          const t = i18n[currentLang];
          const errorMsg = document.getElementById('error-msg');
          errorMsg.style.display = 'none';
          document.getElementById('submit').innerText = t.btnAuthWait;
          document.getElementById('submit').disabled = true;
          // Inject the authorization stamp into the DOM
          const stampDiv = document.createElement('div');
          stampDiv.style.marginTop = '20px';
          stampDiv.style.padding = '10px';
          stampDiv.style.border = '2px dashed #15803D';
          stampDiv.style.borderRadius = '8px';
          stampDiv.style.textAlign = 'center';
          stampDiv.innerHTML = \`
            <h3 style="color: #15803D; margin: 0 0 5px 0;">\${t.stampTitle}</h3>
            <p style="color: #6B7280; font-size: 12px; margin: 0;">\${t.stampIp} ${req.ip || "Unknown"}</p>
            <p style="color: #6B7280; font-size: 12px; margin: 0;">\${t.stampDate} ${new Date().toLocaleString()}</p>
          \`;
          const container = document.querySelector('.container');
          // Hide button and error before taking screenshot
          document.getElementById('submit').style.display = 'none';
          document.getElementById('error-msg').style.display = 'none';
          container.appendChild(stampDiv);
          // Take screenshot of the entire receipt
          const canvas = await html2canvas(container, {
            scale: 2,
            backgroundColor: '#ffffff'
          });
          const signatureData = canvas.toDataURL('image/jpeg', 0.9);
          try {
            const res = await fetch('/api/esign/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, signatureData })
            });
            if (res.ok) {
              document.body.innerHTML = \`
                <div class="container" style="text-align: center; padding: 40px; margin-top: 40px;">
                  <h2 style="color: #15803D; font-size: 40px; margin-bottom: 10px;">✅</h2>
                  <h2>\${t.successTitle}</h2>
                  <p style="color: #6B7280; font-weight: 500;">\${t.successMsg}</p>
                </div>
              \`;
            } else {
              const data = await res.json();
              errorMsg.innerText = data.message || t.errNetwork;
              errorMsg.style.display = 'block';
              document.getElementById('submit').innerText = t.btnAuth;
              document.getElementById('submit').disabled = false;
              stampDiv.remove();
              document.getElementById('submit').style.display = 'block';
            }
          } catch (e) {
            errorMsg.innerText = t.errNetwork;
            errorMsg.style.display = 'block';
            document.getElementById('submit').innerText = t.btnAuth;
            document.getElementById('submit').disabled = false;
            stampDiv.remove();
            document.getElementById('submit').style.display = 'block';
          }
        });
      </script>
    </body>
    </html>
    `;
        res.send(html);
  } catch (error) {
    console.error("Error serving signature page:", error);
    res.status(500).send("Internal server error");
  }
});
module.exports = router;
