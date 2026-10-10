const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 4_000;
const MAX_HISTORY_LENGTH = 12_000;

export function buildAiHistory(messages) {
  const bounded = [];
  let remaining = MAX_HISTORY_LENGTH;

  for (let index = messages.length - 1; index >= 0 && bounded.length < MAX_HISTORY_MESSAGES; index -= 1) {
    const message = messages[index];
    const text = typeof message?.text === 'string' ? message.text.trim() : '';
    if (!text || remaining === 0) continue;

    const content = text.slice(0, Math.min(MAX_MESSAGE_LENGTH, remaining));
    bounded.push({
      role: message.role === 'model' ? 'assistant' : 'user',
      content,
    });
    remaining -= content.length;
  }

  return bounded.reverse();
}
