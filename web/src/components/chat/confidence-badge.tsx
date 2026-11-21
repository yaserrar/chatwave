import * as React from 'react';
import { Chart, ShieldSearch, ShieldTick } from 'iconsax-react';
import { badgeVariants } from '~/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';
import type { Confidence } from '~/types/chat';

const LEVELS = {
  high: {
    label: 'High confidence',
    icon: ShieldTick,
    variant: 'success',
    explanation:
      'Strong evidence: a passage closely matches the question, by meaning and by its words. Still worth a look at the sources.',
  },
  medium: {
    label: 'Medium confidence',
    icon: Chart,
    variant: 'info',
    explanation: 'Some evidence: related passages were found, but not an exact match. Check the sources before relying on it.',
  },
  low: {
    label: 'Low confidence',
    icon: ShieldSearch,
    variant: 'warning',
    explanation: 'Weak evidence: the passages are only loosely related to the question. Treat the answer with care.',
  },
} as const;

/**
 * How strong the evidence behind an answer was, measured by the API from the search results before Claude
 * wrote anything. The explanation is a tooltip: on hover, on keyboard focus, and on tap. Touch screens have no
 * hover, so a tap toggles it; Radix would otherwise close it on the tap itself and when the finger lifts.
 */
export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const [open, setOpen] = React.useState(false);
  const openOnPress = React.useRef(false);
  const level = LEVELS[confidence];
  const Icon = level.icon;
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-confidence={confidence}
          // preventDefault() skips the matching Radix handler (which closes the tooltip)
          onPointerDown={(event) => {
            openOnPress.current = open; // Radix closes it on any press outside the tooltip, this one included
            if (event.pointerType === 'touch') event.preventDefault();
          }}
          onPointerLeave={(event) => event.pointerType === 'touch' && event.preventDefault()}
          onClick={(event) => {
            event.preventDefault();
            // A press toggles from the state before it; Enter or Space (detail 0) from the current one
            setOpen(!(event.detail === 0 ? open : openOnPress.current));
          }}
          className={cn(badgeVariants({ variant: level.variant }), 'cursor-help outline-none focus-visible:ring-2 focus-visible:ring-ring')}
        >
          <Icon aria-hidden />
          {level.label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64 text-pretty">
        {level.explanation}
      </TooltipContent>
    </Tooltip>
  );
}
