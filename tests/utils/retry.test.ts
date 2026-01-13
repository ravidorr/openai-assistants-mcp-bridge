import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry, HttpError, createRetryable } from "../../src/utils/retry.js";

// Mock the logger to avoid console output during tests
vi.mock("../../src/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("retry utility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("withRetry", () => {
    it("should return result on first successful attempt", async () => {
      const fn = vi.fn().mockResolvedValue("success");

      const resultPromise = withRetry(fn);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry on retryable errors", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new HttpError("Rate limited", 429))
        .mockResolvedValue("success");

      const resultPromise = withRetry(fn, { maxRetries: 3, initialDelayMs: 100 });
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should not retry on non-retryable errors", async () => {
      const fn = vi.fn().mockRejectedValue(new HttpError("Not found", 404));

      await expect(withRetry(fn, { maxRetries: 3, initialDelayMs: 100 })).rejects.toThrow(
        "Not found"
      );
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should throw after max retries exceeded", async () => {
      const fn = vi.fn().mockRejectedValue(new HttpError("Server error", 500));

      // Start the retry operation
      const resultPromise = withRetry(fn, { maxRetries: 2, initialDelayMs: 100 });

      // Run timers and await the rejection together
      const [, error] = await Promise.all([vi.runAllTimersAsync(), resultPromise.catch((e) => e)]);
      expect(error).toBeInstanceOf(HttpError);
      if (error instanceof HttpError) {
        expect(error.message).toBe("Server error");
      }
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should use custom isRetryable function", async () => {
      const customError = new Error("Custom error");
      const fn = vi.fn().mockRejectedValueOnce(customError).mockResolvedValue("success");

      const resultPromise = withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 100,
        isRetryable: (error) => error instanceof Error && error.message === "Custom error",
      });
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("HttpError", () => {
    it("should create an error with status code", () => {
      const error = new HttpError("Not found", 404, "Resource not found");

      expect(error.message).toBe("Not found");
      expect(error.statusCode).toBe(404);
      expect(error.responseBody).toBe("Resource not found");
      expect(error.name).toBe("HttpError");
    });
  });

  describe("createRetryable", () => {
    it("should create a retryable version of a function", async () => {
      const originalFn = vi.fn().mockResolvedValue("result");
      const retryableFn = createRetryable(originalFn, { maxRetries: 3 });

      const result = await retryableFn("arg1", "arg2");

      expect(result).toBe("result");
      expect(originalFn).toHaveBeenCalledWith("arg1", "arg2");
    });
  });
});
