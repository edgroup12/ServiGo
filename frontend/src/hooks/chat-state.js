/**
 * Pure chat state transitions shared by the realtime hook and tests.
 *
 * HTTP history and realtime events are both authoritative persisted records;
 * optimistic records are retained only until their persisted ID is observed.
 */

export const sortMessages = (messages) => [...messages].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
);

export const mergeChatMessages = (current, incoming) => {
    const byId = new Map(current.map((message) => [message._id, message]));

    incoming.forEach((message) => {
        if (!message?._id) return;
        for (const [id, existing] of byId) {
            if (existing._clientId && id === message._id) byId.delete(id);
        }
        byId.set(message._id, message);
    });

    return sortMessages([...byId.values()]);
};

export const markChatMessageDelivered = (messages, messageId) => messages.map(
    (message) => message._id === messageId
        ? { ...message, status: 'delivered' }
        : message
);
