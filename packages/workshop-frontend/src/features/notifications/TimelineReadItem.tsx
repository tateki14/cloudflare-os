import { useContext, type ReactNode } from "react";
import { Button, DropdownMenu } from "@cloudflare/kumo";
import { DotsThree } from "@phosphor-icons/react";
import { TimelineContext } from "./readTimelineContext";
import { FormattedMessage, useIntl } from "react-intl";

/** One rendered work item, which may group several persisted timeline records. */
export const TimelineReadItem = ({
  start,
  end,
  unreadEnd = end,
  previousUnreadEnd = start - 1,
  children,
}: {
  start: number;
  end: number;
  unreadEnd?: number | null;
  previousUnreadEnd?: number;
  children: ReactNode;
}) => {
  const { formatMessage } = useIntl();
  const timeline = useContext(TimelineContext);
  return (
    <div
      className="group/read relative flow-root min-w-0"
      data-read-start={start}
      data-read-end={end}
      data-unread-through={unreadEnd ?? undefined}
    >
      {timeline?.divider !== undefined &&
        unreadEnd !== null &&
        previousUnreadEnd < timeline.divider &&
        unreadEnd >= timeline.divider && (
          <div
            role="separator"
            aria-label={formatMessage({ id: "timelineReadItem.newSinceYourLastVisit", defaultMessage: "New since your last visit" })}
            data-unread-divider
            className="my-4 flex items-center gap-3 text-xs font-medium text-kumo-brand"
          >
            <FormattedMessage id="timelineReadItem.new" defaultMessage="{element}New{element2}" values={{ element: <span className="h-px flex-1 bg-kumo-brand" />, element2: <span className="h-px flex-1 bg-kumo-brand" /> }} />
          </div>
        )}
      {children}
      {timeline && (
        <div className="absolute right-0 top-0 opacity-100 focus-within:opacity-100 sm:opacity-0 sm:group-hover/read:opacity-100">
          <DropdownMenu>
            <DropdownMenu.Trigger
              render={
                <Button
                  variant="ghost"
                  size="xs"
                  shape="square"
                  aria-label={formatMessage({ id: "timelineReadItem.readActionsForThisItem", defaultMessage: "Read actions for this item" })}
                >
                  <DotsThree size={16} />
                </Button>
              }
            />
            <DropdownMenu.Content>
              <DropdownMenu.Item
                disabled={start > timeline.latestSequence}
                onClick={() => timeline.markUnread(start)}
              >
                <FormattedMessage id="timelineReadItem.markUnreadFromHere" defaultMessage="Mark unread from here" />
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>
      )}
      <div data-read-through={end} className="h-px w-full" aria-hidden="true" />
    </div>
  );
};
