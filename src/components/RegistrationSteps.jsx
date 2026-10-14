import React from 'react';

const STEPS = ['Details', 'Pay', 'Ticket'];

export const RegistrationSteps = ({ currentStep }) => {
  const activeIndex = STEPS.findIndex((step) => step.toLowerCase() === String(currentStep).toLowerCase());

  return (
    <nav aria-label="Registration progress" className="mb-6">
      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map((step, index) => {
          const isComplete = index < activeIndex;
          const isCurrent = index === activeIndex;

          return (
            <li
              key={step}
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-xs font-bold font-mono ${
                isCurrent
                  ? 'border-cyan-300 bg-cyan-400/15 text-cyan-200'
                  : isComplete
                    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                    : 'border-white/10 bg-black/20 text-slate-500'
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">
                {isComplete ? '✓' : index + 1}
              </span>
              {step}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
