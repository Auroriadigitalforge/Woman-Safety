/**
 * Emergency Handler Module
 * Manages automated emergency alerts, calling, and messaging
 */

class EmergencyHandler {
    constructor() {
        this.isEmergencyActive = false;
        this.emergencyStartTime = null;
        this.contacts = this.loadContacts();
    }

    loadContacts() {
        try {
            const contacts = JSON.parse(localStorage.getItem("contacts") || "[]");
            if (!Array.isArray(contacts)) {
                return [];
            }

            return contacts
                .map((contact) => {
                    if (typeof contact === "string") {
                        return { name: "Saved Contact", number: contact };
                    }
                    if (!contact || typeof contact !== "object") {
                        return null;
                    }
                    return {
                        name: String(contact.name || "Saved Contact").trim(),
                        number: String(contact.number || "").trim()
                    };
                })
                .filter((contact) => contact && contact.number);
        } catch (error) {
            console.error("Failed to load contacts:", error);
            return [];
        }
    }

    /**
     * Trigger full emergency protocol
     * - Send WhatsApp to all contacts
     * - Attempt calls to all contacts
     * - Log emergency event
     */
    async triggerEmergency(reason = "manual", options = {}) {
        if (this.isEmergencyActive) {
            console.warn("Emergency already active");
            return;
        }

        this.isEmergencyActive = true;
        this.emergencyStartTime = Date.now();
        this.contacts = this.loadContacts();
        const whatsappWindow = options.whatsappWindow || null;

        console.log(`Emergency triggered: ${reason}`);

        try {
            // Get current location
            const location = await this.getCurrentLocation();
            
            // Send WhatsApp alerts to all contacts
            this.sendWhatsAppToAllContacts(location, reason, whatsappWindow);
            
            // Attempt to call all contacts
            this.callAllContacts(location, reason);
            
            // Log emergency event
            this.logEmergencyEvent(reason, location);
            
            // Show visual feedback
            this.showEmergencyFeedback(reason);
        } catch (error) {
            console.error("Error during emergency protocol:", error);
        }

        // Auto-reset after 5 minutes
        setTimeout(() => {
            this.isEmergencyActive = false;
        }, 300000);
    }

    /**
     * Get current location with fallback
     */
    getCurrentLocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve(null);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                () => {
                    resolve(null);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        });
    }

    /**
     * Send WhatsApp message to all emergency contacts
     */
    sendWhatsAppToAllContacts(location, reason, whatsappWindow = null) {
        if (!this.contacts || this.contacts.length === 0) {
            console.warn("No emergency contacts saved");
            if (whatsappWindow && typeof whatsappWindow.close === "function") {
                whatsappWindow.close();
            }
            return;
        }

        // Use one primary contact and one WhatsApp tab. Calling remains a
        // separate tel: action and must not open additional WhatsApp tabs.
        try {
            this.sendWhatsAppAlert(this.contacts[0], location, reason, whatsappWindow);
        } catch (error) {
            console.error(`Failed to send WhatsApp to ${this.contacts[0].name}:`, error);
        }
    }

    /**
     * Send WhatsApp alert to a single contact
     */
    sendWhatsAppAlert(contact, location, reason, whatsappWindow = null) {
        const cleanedNumber = this.normalizeWhatsAppNumber(contact.number);
        if (!cleanedNumber) return;

        let message = this.buildEmergencyMessage(location, reason);
        
        const waUrl = `https://wa.me/${cleanedNumber}?text=${encodeURIComponent(message)}`;
        
        // Reuse a window opened during the user's SOS click when available.
        const newWindow = whatsappWindow || window.open(waUrl, "_blank", "noopener,noreferrer");
        if (newWindow) {
            newWindow.location.href = waUrl;
            newWindow.focus();
        } else if (this.contacts[0] === contact) {
            // Automated microphone triggers cannot always open popups; navigate
            // the current tab so the first alert is still delivered.
            window.location.href = waUrl;
        }
    }

    /**
     * Attempt to call all emergency contacts
     */
    callAllContacts(location, reason) {
        if (!this.contacts || this.contacts.length === 0) return;

        // A browser can hand off one automatic call to the device dialer.
        // Opening multiple tel:/WhatsApp tabs is unreliable and unsafe.
        this.initiateCall(this.contacts[0], location, reason);
    }

    /**
     * Initiate emergency call to a contact
     */
    initiateCall(contact, location, reason) {
        const cleanedNumber = String(contact.number || "").replace(/\D/g, "");
        if (!cleanedNumber) return;

        // The operating system or browser handles the tel: protocol. On a
        // desktop without a phone handler this is a no-op, but it never opens
        // a duplicate WhatsApp tab.
        window.location.href = `tel:${cleanedNumber}`;

        console.log(`Calling ${contact.name} at ${cleanedNumber}`);
    }

    normalizeWhatsAppNumber(number) {
        let digits = String(number || "").replace(/\D/g, "");
        if (digits.length === 11 && digits.startsWith("0")) {
            digits = digits.slice(1);
        }
        if (digits.length === 10) {
            digits = `91${digits}`;
        }
        return digits;
    }

    /**
     * Build comprehensive emergency message
     */
    buildEmergencyMessage(location, reason) {
        const reasonMap = {
            "manual": "Manual SOS",
            "acoustic-detection": "AI detected distress sound",
            "voice-trigger": "Code word confirmed"
        };

        const reasonText = reasonMap[reason] || "Emergency Alert";
        let message = `*EMERGENCY SOS ALERT*\n\n`;
        message += `*Reason:* ${reasonText}\n`;
        message += `*Time:* ${new Date().toLocaleTimeString()}\n\n`;
        message += `*I am in IMMEDIATE danger and need urgent help!*\n\n`;

        if (location) {
            const mapsUrl = `https://maps.google.com/?q=${location.lat},${location.lon}`;
            message += `*My Exact Location:*\n${mapsUrl}\n`;
            message += `*(Accuracy: ${Math.round(location.accuracy)}m)*\n\n`;
        } else {
            message += `*Could not access GPS location*\n\n`;
        }

        message += `Please:\n`;
        message += `1. Contact emergency services immediately\n`;
        message += `2. Send help to my location\n`;
        message += `3. Do NOT ignore this message\n\n`;
        message += `Sent via HELPING-CODE Women's Safety App`;

        return message;
    }

    /**
     * Log emergency event for later reference
     */
    logEmergencyEvent(reason, location) {
        const emergencyLog = {
            timestamp: new Date().toISOString(),
            reason: reason,
            location: location,
            contacts: this.contacts.length
        };

        try {
            const parsedLogs = JSON.parse(localStorage.getItem("emergencyLogs") || "[]");
            const logs = Array.isArray(parsedLogs) ? parsedLogs : [];
            logs.push(emergencyLog);
            // Keep only last 50 logs
            if (logs.length > 50) logs.shift();
            localStorage.setItem("emergencyLogs", JSON.stringify(logs));
        } catch (error) {
            console.error("Failed to log emergency event:", error);
        }
    }

    /**
     * Show visual feedback for emergency activation
     */
    showEmergencyFeedback(reason) {
        const reasonLabels = {
            "manual": " SOS Activated Manually",
            "acoustic-detection": " Danger Detected by AI",
            "voice-trigger": " Emergency Word Confirmed"
        };

        const message = reasonLabels[reason] || "Emergency Alert Activated";
        
        // Visual feedback - apply emergency animation
        document.body.classList.add("emergency-active");
        
        // Haptic feedback for mobile devices
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }

        console.log(message);
    }

    /**
     * Cancel active emergency (with confirmation)
     */
    cancelEmergency() {
        if (!this.isEmergencyActive) return;

        const confirmed = confirm("Are you sure you want to cancel the emergency alert?");
        if (confirmed) {
            this.isEmergencyActive = false;
            document.body.classList.remove("emergency-active");
            console.log("Emergency alert cancelled");
        }
    }

    /**
     * Get emergency status
     */
    getStatus() {
        return {
            isActive: this.isEmergencyActive,
            duration: this.isEmergencyActive ? Date.now() - this.emergencyStartTime : null,
            contactsCount: this.contacts.length,
            hasLocationAccess: !!navigator.geolocation
        };
    }
}

// Create global instance
window.emergencyHandler = new EmergencyHandler();
