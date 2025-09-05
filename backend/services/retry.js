export async function callWithRetry(apiCallFn, args = [], maxRetries = 3) {
  let retryCount = 0;
  let waitTime = 1000; // Start with 1 second

  while (retryCount < maxRetries) {
    try {
      return await apiCallFn(...args);
    } catch (error) {
      const status = error?.response?.status;

      if (status === 429) {
        console.warn(`⚠️ Rate limited (429). Retry attempt ${retryCount + 1} after ${waitTime} ms`);
        await new Promise(res => setTimeout(res, waitTime));

        retryCount++;
        waitTime *= 2; // Exponential backoff
      } else {
        // Not a rate‑limit error → throw immediately
        throw error;
      }
    }
  }

  throw new Error(`Max retries (${maxRetries}) reached without success`);
}