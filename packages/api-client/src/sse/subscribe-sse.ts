export type SseParsedEvent<TData = unknown> = {
  event: string;
  id?: string;
  retry?: number;
  rawData: string;
  data: TData | null;
};

export class SseConnectionError extends Error {
  public readonly status: number | null;
  public readonly body?: string;

  constructor(
    message: string,
    status: number | null,
    body?: string
  ) {
    super(message);
    this.name = "SseConnectionError";
    this.status = status;
    this.body = body;
  }
}

export type SseReconnectOptions = {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  factor: number;
  jitterRatio: number;
  shouldReconnect: (error: unknown, attempt: number) => boolean;
};

export type SubscribeSseOptions<TData = unknown> = {
  headers?: HeadersInit;
  signal?: AbortSignal;
  onEvent: (event: SseParsedEvent<TData>) => void;
  onError?: (error: unknown) => void;
  onOpen?: (response: Response) => void;
  onClose?: () => void;
  parseData?: (rawData: string, event: string) => TData;
  fetchFn?: typeof fetch;
  reconnect?: Partial<SseReconnectOptions>;
};

const DEFAULT_RECONNECT: SseReconnectOptions = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 8_000,
  factor: 2,
  jitterRatio: 0.2,
  shouldReconnect: () => true,
};

const DEFAULT_EVENT = "message";

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const sleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal.addEventListener("abort", onAbort, { once: true });
  });

const resolveReconnectDelay = (attempt: number, options: SseReconnectOptions): number => {
  const exponential = options.initialDelayMs * options.factor ** Math.max(attempt - 1, 0);
  const jitterBase = clamp(options.jitterRatio, 0, 1);
  const jitter = 1 + (Math.random() * 2 - 1) * jitterBase;
  return Math.min(options.maxDelayMs, Math.max(0, Math.round(exponential * jitter)));
};

const tryParseJson = <TData>(raw: string): TData | null => {
  try {
    return JSON.parse(raw) as TData;
  } catch {
    return null;
  }
};

const parseSseBlock = <TData>(
  block: string,
  parseData?: (rawData: string, event: string) => TData
): SseParsedEvent<TData> | null => {
  const lines = block.split("\n");

  let event = DEFAULT_EVENT;
  let id: string | undefined;
  let retry: number | undefined;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    const rawValue = separatorIndex === -1 ? "" : line.slice(separatorIndex + 1);
    const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;

    switch (field) {
      case "event":
        event = value || DEFAULT_EVENT;
        break;
      case "id":
        id = value;
        break;
      case "retry": {
        const parsedRetry = Number.parseInt(value, 10);
        if (!Number.isNaN(parsedRetry) && parsedRetry >= 0) {
          retry = parsedRetry;
        }
        break;
      }
      case "data":
        dataLines.push(value);
        break;
      default:
        break;
    }
  }

  const rawData = dataLines.join("\n");
  if (!rawData && !id && event === DEFAULT_EVENT) {
    return null;
  }

  let data: TData | null = null;
  if (rawData.length > 0) {
    if (parseData) {
      data = parseData(rawData, event);
    } else {
      const parsed = tryParseJson<TData>(rawData);
      data = parsed === null ? (rawData as unknown as TData) : parsed;
    }
  }

  const parsedEvent: SseParsedEvent<TData> = {
    event,
    rawData,
    data,
  };

  if (id !== undefined) {
    parsedEvent.id = id;
  }

  if (retry !== undefined) {
    parsedEvent.retry = retry;
  }

  return parsedEvent;
};

const consumeSseResponse = async <TData>(
  response: Response,
  options: SubscribeSseOptions<TData>,
  signal: AbortSignal
) => {
  if (!response.body) {
    throw new SseConnectionError("SSE response does not include a body", response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!signal.aborted) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    const chunk = decoder
      .decode(value, { stream: true })
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");
    buffer += chunk;

    let boundaryIndex = buffer.indexOf("\n\n");
    while (boundaryIndex >= 0) {
      const block = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + 2);

      const parsed = parseSseBlock<TData>(block, options.parseData);
      if (parsed) {
        options.onEvent(parsed);
      }

      boundaryIndex = buffer.indexOf("\n\n");
    }
  }
};

export const subscribeSse = <TData = unknown>(
  url: string,
  options: SubscribeSseOptions<TData>
): (() => void) => {
  const reconnectOptions: SseReconnectOptions = {
    ...DEFAULT_RECONNECT,
    ...(options.reconnect ?? {}),
  };
  const fetchFn = options.fetchFn ?? fetch;
  const internalAbort = new AbortController();
  let closed = false;
  let reconnectAttempts = 0;

  const close = () => {
    if (closed) {
      return;
    }
    closed = true;
    internalAbort.abort();
  };

  const handleFailure = async (error: unknown) => {
    options.onError?.(error);
    if (closed || isAbortError(error)) {
      return false;
    }

    reconnectAttempts += 1;
    if (reconnectAttempts > reconnectOptions.maxAttempts) {
      return false;
    }
    if (!reconnectOptions.shouldReconnect(error, reconnectAttempts)) {
      return false;
    }

    const delayMs = resolveReconnectDelay(reconnectAttempts, reconnectOptions);
    await sleep(delayMs, internalAbort.signal);
    return !closed;
  };

  if (options.signal) {
    options.signal.addEventListener("abort", close, { once: true });
  }

  const connect = async () => {
    while (!closed) {
      try {
        const response = await fetchFn(url, {
          method: "GET",
          headers: {
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
            ...(options.headers ?? {}),
          },
          credentials: "include",
          signal: internalAbort.signal,
        });

        if (!response.ok) {
          const responseText = await response.text().catch(() => "");
          throw new SseConnectionError(
            `SSE request failed with status ${response.status}`,
            response.status,
            responseText
          );
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.toLowerCase().includes("text/event-stream")) {
          throw new SseConnectionError(
            "SSE request did not return text/event-stream content type",
            response.status,
            contentType
          );
        }

        reconnectAttempts = 0;
        options.onOpen?.(response);
        await consumeSseResponse(response, options, internalAbort.signal);
        options.onClose?.();
        return;
      } catch (error) {
        const shouldContinue = await handleFailure(error).catch(() => false);
        if (!shouldContinue) {
          return;
        }
      }
    }
  };

  void connect();
  return close;
};
