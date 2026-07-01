/**
 * AI Guardian orchestrator.
 *
 * - Owns the enable/disable + code-word settings (persisted in localStorage).
 * - Wires AcousticDetector (scream/siren/gunshot detection) and VoiceTrigger
 *   (repeated code-word detection) to the app's shared emergency pathway
 *   (window.activateEmergencyProtocol, defined in script.js).
 * - Runs the 30-second fail-safe verification countdown: an acoustic threat
 *   pauses for user confirmation before firing; a confirmed voice code-word
 *   bypasses the countdown and fires immediately (REQ-style: 3x repeat = deliberate).
 */

const GUARDIAN_SETTINGS_KEY = "aiGuardianSettings";
const FAILSAFE_COUNTDOWN_SECONDS = 30;
const POST_TRIGGER_COOLDOWN_MS = 60000;

function loadGuardianSettings() {
    try {
        const parsed = JSON.parse(localStorage.getItem(GUARDIAN_SETTINGS_KEY) || "null");
        return {
            enabled: Boolean(parsed?.enabled),
            codeWord: typeof parsed?.codeWord === "string" ? parsed.codeWord : ""
        };
    } catch (error) {
        return { enabled: false, codeWord: "" };
    }
}

function saveGuardianSettings(settings) {
    localStorage.setItem(GUARDIAN_SETTINGS_KEY, JSON.stringify(settings));
}

document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("guardianToggle");
    const statusPill = document.getElementById("guardianStatus");
    const codeWordInput = document.getElementById("guardianCodeWord");
    const saveCodeWordBtn = document.getElementById("guardianSaveCodeWord");
    const codeWordFeedback = document.getElementById("guardianCodeWordFeedback");

    const countdownModal = document.getElementById("failsafeModal");
    const countdownValue = document.getElementById("failsafeCountdownValue");
    const countdownReasonText = document.getElementById("failsafeReasonText");
    const cancelAlertBtn = document.getElementById("failsafeCancelBtn");

    // Guardian UI only exists on pages that include it (index.html).
    if (!toggle) {
        return;
    }

    let settings = loadGuardianSettings();
    codeWordInput.value = settings.codeWord;
    toggle.checked = settings.enabled;

    let countdownInterval = null;
    let countdownRemaining = FAILSAFE_COUNTDOWN_SECONDS;

    function setStatus(text, tone = "neutral") {
        if (!statusPill) return;
        statusPill.textContent = text;
        statusPill.className = `guardian-status guardian-status--${tone}`;
    }

    const acousticDetector = new AcousticDetector({
        consecutiveWindowsRequired: 2,
        onStatus: (status, detail) => {
            if (status === "loading-model") setStatus("Loading AI model…", "loading");
            else if (status === "requesting-microphone") setStatus("Requesting microphone…", "loading");
            else if (status === "listening") setStatus("Listening", "active");
            else if (status === "stopped") setStatus("Off", "neutral");
            else if (status === "error") {
                console.error("AcousticDetector error:", detail);
                setStatus("Error — see console", "error");
            }
        },
        onThreat: ({ label, score }) => {
            openFailsafeCountdown(`Detected: ${label} (${Math.round(score * 100)}% confidence)`, "acoustic-detection");
        }
    });

    const voiceTrigger = new VoiceTrigger({
        getCodeWord: () => settings.codeWord,
        onStatus: (status, detail) => {
            if (status === "unsupported") {
                if (codeWordFeedback) {
                    codeWordFeedback.textContent =
                        "Voice code-word trigger isn't supported in this browser. Scream/sound detection will still work.";
                }
            } else if (status === "phrase-heard") {
                setStatus(`Code word heard (${detail.count}/${detail.required})`, "active");
            } else if (status === "error") {
                console.warn("VoiceTrigger error:", detail);
            }
        },
        onTrigger: () => {
            // Deliberate 3x repeat is treated as explicit confirmation —
            // bypass the fail-safe countdown and fire immediately.
            closeFailsafeCountdown();
            window.activateEmergencyProtocol?.("voice-trigger");
            acousticDetector.pauseFor(POST_TRIGGER_COOLDOWN_MS);
            voiceTrigger.pauseFor(POST_TRIGGER_COOLDOWN_MS);
        }
    });

    function openFailsafeCountdown(reasonText, reason) {
        if (!countdownModal) {
            // No countdown UI available — fail safe by firing immediately.
            window.activateEmergencyProtocol?.(reason);
            return;
        }

        countdownRemaining = FAILSAFE_COUNTDOWN_SECONDS;
        countdownReasonText.textContent = reasonText;
        countdownValue.textContent = String(countdownRemaining);
        countdownModal.hidden = false;
        countdownModal.setAttribute("aria-hidden", "false");

        countdownInterval = window.setInterval(() => {
            countdownRemaining -= 1;
            countdownValue.textContent = String(Math.max(countdownRemaining, 0));

            if (countdownRemaining <= 0) {
                window.clearInterval(countdownInterval);
                countdownInterval = null;
                countdownModal.hidden = true;
                countdownModal.setAttribute("aria-hidden", "true");
                window.activateEmergencyProtocol?.(reason);
                acousticDetector.pauseFor(POST_TRIGGER_COOLDOWN_MS);
            }
        }, 1000);
    }

    function closeFailsafeCountdown() {
        if (countdownInterval) {
            window.clearInterval(countdownInterval);
            countdownInterval = null;
        }
        if (countdownModal) {
            countdownModal.hidden = true;
            countdownModal.setAttribute("aria-hidden", "true");
        }
    }

    if (cancelAlertBtn) {
        cancelAlertBtn.addEventListener("click", () => {
            closeFailsafeCountdown();
            setStatus("Listening", "active");
            // Brief cooldown so the same sound event doesn't immediately re-trigger.
            acousticDetector.pauseFor(5000);
        });
    }

    async function startGuardian() {
        try {
            await acousticDetector.start();
        } catch (error) {
            console.error("Failed to start acoustic detector:", error);
            setStatus("Microphone/model error", "error");
            toggle.checked = false;
            settings.enabled = false;
            saveGuardianSettings(settings);
            return;
        }

        if (settings.codeWord) {
            voiceTrigger.start();
        }
    }

    function stopGuardian() {
        acousticDetector.stop();
        voiceTrigger.stop();
        setStatus("Off", "neutral");
    }

    toggle.addEventListener("change", () => {
        settings.enabled = toggle.checked;
        saveGuardianSettings(settings);

        if (settings.enabled) {
            startGuardian();
        } else {
            stopGuardian();
        }
    });

    if (saveCodeWordBtn) {
        saveCodeWordBtn.addEventListener("click", () => {
            const normalized = VoiceTrigger.normalize(codeWordInput.value || "");
            settings.codeWord = normalized;
            saveGuardianSettings(settings);

            if (codeWordFeedback) {
                codeWordFeedback.textContent = normalized
                    ? `Code word saved. Repeat "${normalized}" three times in a row to trigger an instant alert.`
                    : "Code word cleared.";
            }

            if (settings.enabled && normalized && VoiceTrigger.isSupported()) {
                voiceTrigger.stop();
                voiceTrigger.start();
            }
        });
    }

    if (settings.enabled) {
        startGuardian();
    }
});
