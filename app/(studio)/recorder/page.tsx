'use client';

import VoiceRecorderCore from '@/components/VoiceRecorderCore';

export default function RecorderPage() {
  return (
    <VoiceRecorderCore
      variant="full"
      navigateOnComplete
      navigateToTranslate
      showEngineStatus
      showPipeline
    />
  );
}
