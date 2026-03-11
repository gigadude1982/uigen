// @vitest-environment node
import { webcrypto } from "node:crypto";
// jose's webapi build requires `crypto` as a bare global
Object.defineProperty(globalThis, "crypto", { value: webcrypto, writable: false });

import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  test("sets the auth-token cookie", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "user@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe("auth-token");
  });

  test("cookie value is a signed JWT string", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "user@example.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    expect(typeof token).toBe("string");
    // JWTs have three base64url segments separated by dots
    expect(token.split(".")).toHaveLength(3);
  });

  test("JWT payload contains userId and email", async () => {
    const { jwtVerify } = await import("jose");
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "user@example.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    const secret = new TextEncoder().encode("development-secret-key");
    const { payload } = await jwtVerify(token, secret);
    expect(payload.userId).toBe("user-1");
    expect(payload.email).toBe("user@example.com");
  });

  test("cookie is httpOnly with lax sameSite at root path", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "user@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("cookie expiry is ~7 days in the future", async () => {
    const { createSession } = await import("@/lib/auth");
    const before = Date.now();
    await createSession("user-1", "user@example.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(options.expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });
});

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const { getSession } = await import("@/lib/auth");
    const result = await getSession();
    expect(result).toBeNull();
  });

  test("returns the session payload for a valid JWT", async () => {
    const { SignJWT } = await import("jose");
    const { getSession } = await import("@/lib/auth");
    const secret = new TextEncoder().encode("development-secret-key");
    const token = await new SignJWT({ userId: "user-1", email: "user@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(secret);
    mockCookieStore.get.mockReturnValue({ value: token });
    const result = await getSession();
    expect(result?.userId).toBe("user-1");
    expect(result?.email).toBe("user@example.com");
  });

  test("returns null for a tampered JWT", async () => {
    mockCookieStore.get.mockReturnValue({ value: "invalid.token.value" });
    const { getSession } = await import("@/lib/auth");
    const result = await getSession();
    expect(result).toBeNull();
  });

  test("returns null for an expired JWT", async () => {
    const { SignJWT } = await import("jose");
    const { getSession } = await import("@/lib/auth");
    const secret = new TextEncoder().encode("development-secret-key");
    const token = await new SignJWT({ userId: "user-1", email: "user@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("-1s")
      .sign(secret);
    mockCookieStore.get.mockReturnValue({ value: token });
    const result = await getSession();
    expect(result).toBeNull();
  });
});
