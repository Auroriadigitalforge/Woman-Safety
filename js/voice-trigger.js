/**
 * Voice code-word trigger.
 *
 * IMPORTANT PRIVACY NOTE:
 * This uses the browser's built-in SpeechRecognition API. In Chrome/Edge,
 * that API sends microphone audio to the vendor's cloud speech-to-text
 * service to produce a transcript — it is NOT on-device, unlike the
 * acoustic scream detector in acoustic-detector.js. Firefox/Safari support
 * is inconsistent or absent. If strict zero-cloud processing is a hard
 * requirement, replace this module with a small fixed-vocabulary model
 * (e.g. @tensorflow-models/speech-commands) and restrict users to choosing
 * a code word from a supported preset list instead of free text.
 *
 * Trigger condition: the user's configured phrase must be heard 3 times
 * in a row, each repetition within `repeatWindowMs` of the previous one.
 */

class VoiceTrigger {
    /**
     * @param {Object} options
     * @param {() => string} options.getCodeWord returns the current normalized code phrase
     * @param {() => void} options.onTrigger called once the phrase is confirmed 3x
     * @param {(status: string, detail?: any) => void} [options.onStatus]
     * @param {number} [options.requiredRepeats]
     * @param {number} [options.repeatWindowMs] max gap allowed between repeats
     */
    constructor(options = {}) {
        this.getCodeWord = options.getCodeWord;
        this.onTrigger = options.onTrigger || (() => {});
        this.onStatus = options.onStatus || (() => {});
        this.requiredRepeats = options.requiredRepeats ?? 3;
        this.repeatWindowMs = options.repeatWindowMs ?? 10000;

        this.recognition = null;
        this.isRunning = false;
        this._repeatCount = 0;
        this._lastMatchAt = 0;
        this._restartTimeout = null;
        this._cooldownUntil = 0;
    }

    static isSupported() {
        return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    static normalize(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[.,!?;:'"]/g, "")
            .replace(/\s+/g, " ");
    }

    start() {
        if (this.isRunning) {
            return;
        }

        if (!VoiceTrigger.isSupported()) {
            this.onStatus("unsupported");
            return;
        }

        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (!result.isFinal) {
                    continue;
                }
                const transcript = VoiceTrigger.normalize(result[0].transcript);
                this._handleTranscript(transcript);
            }
        };

        recognition.onerror = (event) => {
            this.onStatus("error", event.error);
        };

        recognition.onend = () => {
            // Browsers auto-stop recognition periodically; restart while active.
            if (this.isRunning) {
                this._restartTimeout = window.setTimeout(() => {
                    try {
                        recognition.start();
                    } catch (error) {
                        // Ignore "already started" races.
                    }
                }, 300);
            }
        };

        this.recognition = recognition;
        this.isRunning = true;
        this._repeatCount = 0;

        try {
            recognition.start();
            this.onStatus("listening");
        } catch (error) {
            this.onStatus("error", error);
        }
    }

    stop() {
        this.isRunning = false;
        if (this._restartTimeout) {
            window.clearTimeout(this._restartTimeout);
            this._restartTimeout = null;
        }
        if (this.recognition) {
            this.recognition.onend = null;
            this.recognition.stop();
            this.recognition = null;
        }
        this.onStatus("stopped");
    }

    /** Silence the trigger for `ms` milliseconds (e.g. after firing). */
    pauseFor(ms) {
        this._cooldownUntil = Date.now() + ms;
        this._repeatCount = 0;
    }

    _handleTranscript(transcript) {
        if (Date.now() < this._cooldownUntil) {
            return;
        }

        const codeWord = VoiceTrigger.normalize(this.getCodeWord ? this.getCodeWord() : "");
        if (!codeWord) {
            return;
        }

        const containsPhrase = transcript.includes(codeWord);
        const now = Date.now();

        if (containsPhrase) {
            if (this._repeatCount > 0 && now - this._lastMatchAt > this.repeatWindowMs) {
                // Too much time since last repeat — restart the count.
                this._repeatCount = 0;
            }

            this._repeatCount += 1;
            this._lastMatchAt = now;
            this.onStatus("phrase-heard", { count: this._repeatCount, required: this.requiredRepeats });

            if (this._repeatCount >= this.requiredRepeats) {
                this._repeatCount = 0;
                this.onTrigger();
            }
        }
    }
}

window.VoiceTrigger = VoiceTrigger;
