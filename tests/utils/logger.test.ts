import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "../../src/utils/logger.js";

describe("logger utility", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Reset logger config
    logger.configure({ enabled: true, minLevel: "debug" });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("log levels", () => {
    it("should log debug messages when minLevel is debug", () => {
      logger.configure({ minLevel: "debug" });
      logger.debug("Debug message");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe("debug");
      expect(logOutput.message).toBe("Debug message");
    });

    it("should not log debug messages when minLevel is info", () => {
      logger.configure({ minLevel: "info" });
      logger.debug("Debug message");

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should log info messages", () => {
      logger.info("Info message");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe("info");
      expect(logOutput.message).toBe("Info message");
    });

    it("should log warn messages", () => {
      logger.warn("Warning message");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe("warn");
      expect(logOutput.message).toBe("Warning message");
    });

    it("should log error messages", () => {
      logger.error("Error message");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe("error");
      expect(logOutput.message).toBe("Error message");
    });
  });

  describe("context", () => {
    it("should include context in log output", () => {
      logger.info("Message with context", { key: "value", count: 42 });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(logOutput.context).toEqual({ key: "value", count: 42 });
    });

    it("should not include context key if context is empty", () => {
      logger.info("Message without context", {});

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(logOutput.context).toBeUndefined();
    });
  });

  describe("configuration", () => {
    it("should disable logging when enabled is false", () => {
      logger.configure({ enabled: false });
      logger.error("This should not be logged");

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should return current config", () => {
      logger.configure({ minLevel: "warn", enabled: true });
      const config = logger.getConfig();

      expect(config.minLevel).toBe("warn");
      expect(config.enabled).toBe(true);
    });
  });

  describe("timestamp", () => {
    it("should include ISO timestamp in log output", () => {
      logger.info("Timestamped message");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(logOutput.timestamp).toBeDefined();
      expect(() => new Date(logOutput.timestamp)).not.toThrow();
    });
  });
});
