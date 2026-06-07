let activeConversationId: string | null = null;

export function setActiveChatConversationId(id: string | null) {
  activeConversationId = id;
}

export function getActiveChatConversationId() {
  return activeConversationId;
}

export const CHAT_INCOMING_MESSAGE_EVENT = "pic:chat-incoming-message";

export function dispatchChatIncomingMessage(conversacionId: string) {
  window.dispatchEvent(
    new CustomEvent(CHAT_INCOMING_MESSAGE_EVENT, {
      detail: { conversacionId },
    }),
  );
}
