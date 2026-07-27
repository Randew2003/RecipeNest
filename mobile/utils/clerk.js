export function getClerkErrorMessage(error, fallbackMessage) {
  return error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || fallbackMessage;
}
