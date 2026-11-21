import { Chats } from "@phosphor-icons/react";
import SidebarItem from "../../components/AppShell/SidebarItem";
import { useUnreadState } from "./UnreadStateBridge";
import { UnreadBadge } from "./UnreadBadge";
import { useIntl } from "react-intl";

/** Navigation to every unread thread, including workspaces outside the Recent list. */
export const UnreadSummary = ({ collapsed }: { collapsed: boolean }) => {
  const { formatMessage } = useIntl();
  const unread = useUnreadState();
  return (
    <SidebarItem
      to="/unread"
      label={formatMessage({ id: "unreadSummary.unreadThreads", defaultMessage: "Unread threads" })}
      icon={<Chats size={14} weight="regular" />}
      trailing={<UnreadBadge count={unread?.state?.unreadMessageCount ?? 0} />}
      collapsed={collapsed}
    />
  );
};
