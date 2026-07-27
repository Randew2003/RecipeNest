const DEFAULT_TIMEOUT = 30000;

export async function requestJson(url, requestOptions = {}) {
  const {
    timeout = DEFAULT_TIMEOUT,
    headers: customHeaders,
    ...fetchOptions
  } = requestOptions;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...customHeaders,
      },
    });

    const rawBody = await response.text();
    let data = null;

    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        data = { error: rawBody };
      }
    }

    if (!response.ok) {
      throw new Error(data?.error || `Request failed with status ${response.status}.`);
    }

    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("The request took too long. Check the API URL and your connection.");
    }

    if (error instanceof TypeError && /network request failed|failed to fetch/i.test(error.message || "")) {
      throw new Error("The app cannot reach the API server. Check that the backend is running and the API URL is correct for this device.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
