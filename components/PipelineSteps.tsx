'use client';

const STEPS = [
  { id: 1, label: 'Select Language' },
  { id: 2, label: 'Record & Live Text' },
  { id: 3, label: 'Neural Transcription' },
  { id: 4, label: 'Translate' },
] as const;

interface PipelineStepsProps {
  currentStep: number;
}

export default function PipelineSteps({ currentStep }: PipelineStepsProps) {
  return (
    <div className="pipeline-steps">
      {STEPS.map((step, index) => {
        const done = currentStep > step.id;
        const active = currentStep === step.id;
        return (
          <div key={step.id} className="pipeline-step-wrap">
            <div
              className={`pipeline-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}
            >
              <span className="pipeline-num">{done ? '✓' : step.id}</span>
              <span className="pipeline-label">{step.label}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`pipeline-line ${done ? 'done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
