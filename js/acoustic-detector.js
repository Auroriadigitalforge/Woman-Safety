/**
 * Acoustic threat detector.
 *
 * Runs Google's YAMNet audio-event classifier fully client-side via
 * TensorFlow.js. Microphone audio is captured, resampled to 16kHz mono,
 * and classified in ~1s windows entirely in-browser — no audio is ever
 * uploaded anywhere for this part of the pipeline.
 *
 * YAMNet TFJS graph model: https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1
 * Class map (521 AudioSet classes): tensorflow/models yamnet_class_map.csv
 */

const YAMNET_MODEL_URL = "https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1";
const YAMNET_CLASS_MAP_URL =
    "https://raw.githubusercontent.com/tensorflow/models/master/research/audioset/yamnet/yamnet_class_map.csv";
const YAMNET_SAMPLE_RATE = 16000;
const YAMNET_WINDOW_SECONDS = 1.0; // one inference pass per ~1s of audio

// Display names (as they appear in AudioSet) that indicate a possible
// distress / emergency event. Tune per false-positive tolerance.
const DEFAULT_DANGER_CLASSES = {
    "Screaming": 0.5,
    "Shout": 0.55,
    "Yell": 0.55,
    "Children shouting": 0.6,
    "Siren": 0.6,
    "Civil defense siren": 0.6,
    "Police car (siren)": 0.6,
    "Ambulance (siren)": 0.6,
    "Fire engine, fire truck (siren)": 0.6,
    "Gunshot, gunfire": 0.55,
    "Machine gun": 0.55,
    "Explosion": 0.55,
    "Glass": 0.65,
    "Smash, crash": 0.6
};

class AcousticDetector {
    /**
     * @param {Object} options
     * @param {(evt: {label: string, score: number, allScores: Array}) => void} options.onThreat
     * @param {(status: string, detail?: any) => void} [options.onStatus]
     * @param {number} [options.consecutiveWindowsRequired] number of consecutive
     *   positive windows before a threat event fires (reduces false positives)
     */
    constructor(options = {}) {
        this.onThreat = options.onThreat || (() => {});
        this.onStatus = options.onStatus || (() => {});
        this.consecutiveWindowsRequired = options.consecutiveWindowsRequired ?? 2;
        this.dangerClasses = options.dangerClasses || DEFAULT_DANGER_CLASSES;

        this.model = null;
        this.classNames = null;
        this.audioContext = null;
        this.mediaStream = null;
        this.sourceNode = null;
        this.processorNode = null;
        this.isRunning = false;
        this._consecutiveHits = 0;
        this._lastHitLabel = null;
        this._resampleBuffer = [];
        this._resampleBufferSamples = 0;
        this._processing = false;
        this._cooldownUntil = 0;
    }

    async _ensureModelLoaded() {
        if (this.model && this.classNames) {
            return;
        }

        this.onStatus("loading-model");

        if (typeof tf === "undefined") {
            throw new Error("TensorFlow.js was not found on the page. Include the tfjs <script> tag before this module.");
        }

        const [model, classNames] = await Promise.all([
            tf.loadGraphModel(YAMNET_MODEL_URL, { fromTFHub: true }),
            AcousticDetector._loadClassMap()
        ]);

        this.model = model;
        this.classNames = classNames;
        this.onStatus("model-ready");
    }

    static async _loadClassMap() {
        const response = await fetch(YAMNET_CLASS_MAP_URL);
        if (!response.ok) {
            throw new Error(`Failed to load YAMNet class map (${response.status})`);
        }

        const csvText = await response.text();
        // Format: index,mid,display_name  (first line is a header)
        return csvText
            .trim()
            .split("\n")
            .slice(1)
            .map((line) => {
                // display_name may itself contain commas; only split on the first two.
                const firstComma = line.indexOf(",");
                const secondComma = line.indexOf(",", firstComma + 1);
                return line.slice(secondComma + 1).trim().replace(/^"|"$/g, "");
            });
    }

    async start() {
        if (this.isRunning) {
            return;
        }

        await this._ensureModelLoaded();

        this.onStatus("requesting-microphone");
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContextClass();
        this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

        // ScriptProcessorNode is deprecated but has the broadest support for
        // this kind of low-effort real-time tap; swap for an AudioWorklet if
        // you need to drop legacy browser support later.
        const bufferSize = 4096;
        this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
        this._resampleBuffer = [];
        this._resampleBufferSamples = 0;
        this._consecutiveHits = 0;

        this.processorNode.onaudioprocess = (event) => {
            const input = event.inputBuffer.getChannelData(0);
            this._pushAudio(input, this.audioContext.sampleRate);
        };

        this.sourceNode.connect(this.processorNode);
        // Necessary in most browsers to keep the processor node alive,
        // routed to a silent gain so nothing is audibly played back.
        const silentGain = this.audioContext.createGain();
        silentGain.gain.value = 0;
        this.processorNode.connect(silentGain);
        silentGain.connect(this.audioContext.destination);

        this.isRunning = true;
        this.onStatus("listening");
    }

    stop() {
        if (!this.isRunning) {
            return;
        }

        if (this.processorNode) {
            this.processorNode.disconnect();
            this.processorNode.onaudioprocess = null;
        }
        if (this.sourceNode) {
            this.sourceNode.disconnect();
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => track.stop());
        }
        if (this.audioContext && this.audioContext.state !== "closed") {
            this.audioContext.close();
        }

        this.isRunning = false;
        this.onStatus("stopped");
    }

    /** Silence the detector for `ms` milliseconds (e.g. after a confirmed/cancelled alert). */
    pauseFor(ms) {
        this._cooldownUntil = Date.now() + ms;
        this._consecutiveHits = 0;
    }

    _pushAudio(inputSamples, nativeSampleRate) {
        // Linear-interpolation downsample to 16kHz mono.
        const ratio = nativeSampleRate / YAMNET_SAMPLE_RATE;
        const outLength = Math.floor(inputSamples.length / ratio);
        for (let i = 0; i < outLength; i++) {
            const srcIndex = i * ratio;
            const srcIndexFloor = Math.floor(srcIndex);
            const srcIndexCeil = Math.min(srcIndexFloor + 1, inputSamples.length - 1);
            const frac = srcIndex - srcIndexFloor;
            const sample = inputSamples[srcIndexFloor] * (1 - frac) + inputSamples[srcIndexCeil] * frac;
            this._resampleBuffer.push(sample);
        }
        this._resampleBufferSamples += outLength;

        const windowSize = Math.floor(YAMNET_SAMPLE_RATE * YAMNET_WINDOW_SECONDS);
        if (this._resampleBufferSamples >= windowSize && !this._processing) {
            const windowSamples = this._resampleBuffer.slice(0, windowSize);
            this._resampleBuffer = this._resampleBuffer.slice(windowSize);
            this._resampleBufferSamples -= windowSize;
            this._classifyWindow(new Float32Array(windowSamples));
        }
    }

    async _classifyWindow(samples) {
        if (Date.now() < this._cooldownUntil) {
            return;
        }

        this._processing = true;
        try {
            const waveformTensor = tf.tensor1d(samples);
            const [scores] = this.model.execute(waveformTensor);
            const meanScores = scores.mean(0); // average over internal frames
            const scoresArray = await meanScores.data();

            waveformTensor.dispose();
            scores.dispose();
            meanScores.dispose();

            this._evaluateScores(scoresArray);
        } catch (error) {
            this.onStatus("error", error);
        } finally {
            this._processing = false;
        }
    }

    _evaluateScores(scoresArray) {
        let bestLabel = null;
        let bestScore = 0;

        for (const [label, threshold] of Object.entries(this.dangerClasses)) {
            const idx = this.classNames.indexOf(label);
            if (idx === -1) {
                continue;
            }
            const score = scoresArray[idx];
            if (score >= threshold && score > bestScore) {
                bestLabel = label;
                bestScore = score;
            }
        }

        if (bestLabel) {
            if (bestLabel === this._lastHitLabel) {
                this._consecutiveHits += 1;
            } else {
                this._consecutiveHits = 1;
                this._lastHitLabel = bestLabel;
            }

            this.onStatus("candidate", { label: bestLabel, score: bestScore, hits: this._consecutiveHits });

            if (this._consecutiveHits >= this.consecutiveWindowsRequired) {
                this._consecutiveHits = 0;
                this.onThreat({ label: bestLabel, score: bestScore, allScores: scoresArray });
            }
        } else {
            this._consecutiveHits = 0;
            this._lastHitLabel = null;
        }
    }
}

window.AcousticDetector = AcousticDetector;
