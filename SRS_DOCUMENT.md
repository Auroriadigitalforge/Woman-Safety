# Software Requirements Specification (SRS)
## Helping-Code AI | Privacy-First Safety Application

**Document Version:** 2.0  
**Date:** July 1, 2026  
**Project Name:** Helping-Code AI  
**Author:** Development Team  

***

### 1. INTRODUCTION

#### 1.1 Purpose
This document defines the requirements for the upgraded "Helping-Code" platform, which integrates on-device Artificial Intelligence for proactive distress detection while maintaining secure, privacy-first authentication and data management.

#### 1.2 Scope
* **On-Device AI:** Browser-based acoustic threat detection (TensorFlow.js).
* **Voice Activation:** Custom code-word trigger system.
* **Fail-Safe Logic:** 30-second emergency verification countdown.
* **Legacy Features:** Secure authentication, contact management, and review modules.

***

### 2. SYSTEM OVERVIEW
Helping-Code AI acts as a "Digital Guardian". It monitors ambient audio locally, ensuring that no sensitive sound data is ever uploaded to a server. The system only interacts with external services (WhatsApp/SMS) when a verified emergency is detected.

***

### 3. FUNCTIONAL REQUIREMENTS

#### 3.1 AI Guardian Module (REQ-008)
* **REQ-008.1:** System shall use TensorFlow.js and YAMNet to classify audio signatures (e.g., screams, gunshots).
* **REQ-008.2:** System shall implement a 30-second "Fail-Safe" timer upon detection.
* **REQ-008.3:** If the user does not cancel the alert within 30 seconds, the system proceeds to the WhatsApp SOS flow.
* **REQ-008.4:** System shall support a secondary "Voice Trigger" (custom word repeated 3 times) for instant SOS.

#### 3.2 Secure Data Management (REQ-009)
* **REQ-009.1:** All sensitive emergency contacts are stored in `localStorage` and mapped via a 14-digit unique identifier.
* **REQ-009.2:** No clear-text identifiers shall be linked to emergency data in server-side logs.

***

### 4. NON-FUNCTIONAL REQUIREMENTS

#### 4.1 Privacy & Ethics
* **On-Device Processing:** All audio classification must occur in the client’s browser; no raw audio data is transmitted to the server.
* **Minimalism:** The app must remain a lightweight stack (HTML/JS/PHP/JSON) to ensure fast deployment on shared hosting environments.

#### 4.2 Performance
* AI classification latency shall not exceed 500ms to ensure real-time responsiveness.

***

### 5. SYSTEM ARCHITECTURE

#### 5.1 Tech Stack
| Layer | Technology |
|---|---|
| AI Engine | TensorFlow.js (YAMNet model) |
| Frontend | HTML5, CSS3, Vanilla JS |
| Backend | PHP 8+ |
| Data | JSON (Server-side) + LocalStorage (Client) |

***

### 6. USE CASES

#### Use Case: AI Emergency Detection
1.  **Detection:** Browser detects a high-stress audio signature.
2.  **Alert:** UI displays a "Distress Detected - 30s Countdown" screen.
3.  **Verification:** User can press "Cancel" to stop the alert.
4.  **Action:** If countdown hits 0, the system automatically dispatches an emergency message.

***

### 7. TESTING REQUIREMENTS
* **AI Accuracy:** Test detection rates for pre-recorded "scream" or "siren" samples.
* **Fail-Safe Logic:** Verify that the 30-second timer cannot be bypassed by UI elements.
* **Privacy Compliance:** Confirm that network logs show zero outgoing audio traffic.

***

### 8. DOCUMENT CONTROL
* **Version 2.0:** Baseline for AI-integrated Helping-Code.
* **Next Review:** Post-integration of `js/ai-guardian.js` and `js/acoustic-detector.js`.
