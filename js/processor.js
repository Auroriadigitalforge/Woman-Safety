class MyProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
  }

  process(inputs, _outputs, _parameters) {
    try {
      const input = inputs[0];
      
      if (input.length === 0 || input[0].length === 0) {
        return true;
      }

      const channelData = input[0];
      const dataLength = channelData.length;

      // Copy new audio data to buffer
      for (let i = 0; i < dataLength; i++) {
        this.buffer[this.writeIndex] = channelData[i];
        this.writeIndex++;

        // Send full chunks to avoid excessive messaging
        if (this.writeIndex >= this.bufferSize) {
          this.port.postMessage({
            type: 'audio-chunk',
            data: new Float32Array(this.buffer)
          });
          this.writeIndex = 0;
        }
      }
    } catch (error) {
      console.error('AudioWorklet processing error:', error);
    }

    return true; // Keep the processor alive
  }
}

registerProcessor('my-processor', MyProcessor);

