Overview
Helping Code is an intelligent, privacy-focused safety application designed to provide proactive emergency assistance. By leveraging on-device AI (TensorFlow.js), the app monitors ambient audio for high-stress signatures—such as screams or gunshots—and initiates a secure, automated emergency protocol without ever sending your sensitive audio data to a cloud server.

Features
Edge AI Detection: Real-time audio classification running entirely in your browser using TensorFlow.js.

Privacy-by-Design: Sensitive user data is decoupled from identity using a unique 14-digit identifier system.

Smart Fail-Safe: Includes a 30-second verification countdown to prevent false alarms before triggering emergency services.

Custom Voice Triggers: Allows users to set personalized trigger words for rapid activation in high-stress situations.

Lightweight Architecture: Built with a clean HTML/CSS/JS/PHP stack, optimized for fast performance on shared hosting environments.

System Architecture
Frontend: Responsive interface for rapid emergency access.

AI Engine: Local browser-based audio classification.

Backend: Secure PHP authentication with JSON-based data management.

Security & Privacy
This project prioritizes user anonymity. By utilizing a keyed-anonymization system, even the system administrators cannot associate sensitive personal contact details with a specific user identity. All processing happens on the "Edge" (the user's device), ensuring that your private conversations remain private.

Documentation
For a detailed breakdown of the system design and requirements, please refer to the SRS_DOCUMENT.md.
