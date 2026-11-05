import { Add, ArrowDown2, MessageText } from 'iconsax-react';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { conversationLabel } from '~/lib/chat';
import { formatRelative } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { ConversationDto } from '~/types/chat';

/**
 * Header control: the current conversation's title, a menu of the project's conversations and
 * "New conversation". A new conversation is only a draft until its first question is sent.
 */
export function ConversationSwitcher({
  conversations,
  activeId,
  onSelect,
  onNew,
}: {
  conversations: ConversationDto[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const active = conversations.find((c) => c.id === activeId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="-ml-2 min-w-0 gap-1.5 px-2 text-foreground">
          <span className="truncate font-medium">{active ? conversationLabel(active.title) : 'New conversation'}</span>
          <ArrowDown2 aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuItem onSelect={onNew}>
          <Add aria-hidden />
          New conversation
        </DropdownMenuItem>
        {conversations.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-eyebrow">Recent</DropdownMenuLabel>
            <div className="max-h-72 overflow-y-auto">
              {conversations.map((conversation) => (
                <DropdownMenuItem
                  key={conversation.id}
                  onSelect={() => onSelect(conversation.id)}
                  className={cn('flex-col items-start gap-0.5', conversation.id === activeId && 'bg-accent')}
                >
                  <span className="flex w-full items-center gap-2">
                    <MessageText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{conversationLabel(conversation.title)}</span>
                  </span>
                  <span className="pl-6 font-mono text-[11px] text-muted-foreground">{formatRelative(conversation.updated_at)}</span>
                </DropdownMenuItem>
              ))}
            </div>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
