import { createFileRoute } from "@tanstack/react-router";
import { UnreadThreads } from "../features/notifications/UnreadThreads";
import { useDocumentTitle } from "../useDocumentTitle";
import { useIntl } from "react-intl";

const UnreadThreadsPage = () => {
  const { formatMessage } = useIntl();
  useDocumentTitle(formatMessage({ id: "routesUnread.unreadThreads", defaultMessage: "Unread threads" }));
  return <UnreadThreads />;
};

export const Route = createFileRoute("/unread")({ component: UnreadThreadsPage });
