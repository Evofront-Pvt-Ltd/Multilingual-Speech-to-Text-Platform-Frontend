const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

export function getSupportedAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

export function waitForRecordingBlob(
  recorder: MediaRecorder,
  stream: MediaStream,
  chunks: Blob[],
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (recorder.state === 'inactive') {
      reject(new Error('Recorder is not active'));
      return;
    }

    const collected = [...chunks];

    const onData = (event: BlobEvent) => {
      if (event.data.size > 0) collected.push(event.data);
    };

    recorder.addEventListener('dataavailable', onData);

    recorder.addEventListener(
      'stop',
      () => {
        recorder.removeEventListener('dataavailable', onData);
        stream.getTracks().forEach((track) => track.stop());

        // Final chunk may arrive after stop in some browsers.
        setTimeout(() => {
          const mimeType =
            recorder.mimeType || getSupportedAudioMimeType() || 'audio/webm';
          resolve(new Blob(collected, { type: mimeType }));
        }, 250);
      },
      { once: true },
    );

    try {
      if (typeof recorder.requestData === 'function') {
        recorder.requestData();
      }
      recorder.stop();
    } catch (error) {
      recorder.removeEventListener('dataavailable', onData);
      reject(error);
    }
  });
}
