import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    test("isLoading starts as false", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("exposes signIn, signUp, and isLoading", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(typeof result.current.isLoading).toBe("boolean");
    });
  });

  describe("signIn", () => {
    test("sets isLoading to true while signing in, then false after", async () => {
      let resolveSignIn!: (v: any) => void;
      (signInAction as any).mockReturnValue(
        new Promise((res) => { resolveSignIn = res; })
      );
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([]);
      (createProject as any).mockResolvedValue({ id: "proj-1" });

      const { result } = renderHook(() => useAuth());

      let signInPromise: Promise<any>;
      act(() => {
        signInPromise = result.current.signIn("user@example.com", "password");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ success: true });
        await signInPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from signInAction", async () => {
      const authResult = { success: false, error: "Invalid credentials" };
      (signInAction as any).mockResolvedValue(authResult);
      (getAnonWorkData as any).mockReturnValue(null);

      const { result } = renderHook(() => useAuth());

      let returned: any;
      await act(async () => {
        returned = await result.current.signIn("user@example.com", "wrong");
      });

      expect(returned).toEqual(authResult);
    });

    test("calls signInAction with email and password", async () => {
      (signInAction as any).mockResolvedValue({ success: false });
      (getAnonWorkData as any).mockReturnValue(null);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "mypassword");
      });

      expect(signInAction).toHaveBeenCalledWith("test@example.com", "mypassword");
    });

    test("does not call handlePostSignIn when sign in fails", async () => {
      (signInAction as any).mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "wrong");
      });

      expect(getAnonWorkData).not.toHaveBeenCalled();
      expect(getProjects).not.toHaveBeenCalled();
      expect(createProject).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading to false even when signInAction throws", async () => {
      (signInAction as any).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("sets isLoading to true while signing up, then false after", async () => {
      let resolveSignUp!: (v: any) => void;
      (signUpAction as any).mockReturnValue(
        new Promise((res) => { resolveSignUp = res; })
      );
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([]);
      (createProject as any).mockResolvedValue({ id: "proj-1" });

      const { result } = renderHook(() => useAuth());

      let signUpPromise: Promise<any>;
      act(() => {
        signUpPromise = result.current.signUp("user@example.com", "password");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ success: true });
        await signUpPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from signUpAction", async () => {
      const authResult = { success: false, error: "Email already registered" };
      (signUpAction as any).mockResolvedValue(authResult);
      (getAnonWorkData as any).mockReturnValue(null);

      const { result } = renderHook(() => useAuth());

      let returned: any;
      await act(async () => {
        returned = await result.current.signUp("user@example.com", "password");
      });

      expect(returned).toEqual(authResult);
    });

    test("does not call handlePostSignIn when sign up fails", async () => {
      (signUpAction as any).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("user@example.com", "password");
      });

      expect(getAnonWorkData).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading to false even when signUpAction throws", async () => {
      (signUpAction as any).mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("user@example.com", "password").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("post-sign-in routing", () => {
    const successSetup = (action: "signIn" | "signUp") => {
      if (action === "signIn") {
        (signInAction as any).mockResolvedValue({ success: true });
      } else {
        (signUpAction as any).mockResolvedValue({ success: true });
      }
    };

    for (const action of ["signIn", "signUp"] as const) {
      describe(`via ${action}`, () => {
        test("creates a project from anon work and redirects when anon messages exist", async () => {
          successSetup(action);
          const anonWork = {
            messages: [{ role: "user", content: "hello" }],
            fileSystemData: { "/App.jsx": { type: "file", content: "..." } },
          };
          (getAnonWorkData as any).mockReturnValue(anonWork);
          (createProject as any).mockResolvedValue({ id: "anon-proj-1" });

          const { result } = renderHook(() => useAuth());

          await act(async () => {
            await result.current[action]("user@example.com", "password");
          });

          expect(createProject).toHaveBeenCalledWith(
            expect.objectContaining({
              messages: anonWork.messages,
              data: anonWork.fileSystemData,
            })
          );
          expect(clearAnonWork).toHaveBeenCalled();
          expect(mockPush).toHaveBeenCalledWith("/anon-proj-1");
          expect(getProjects).not.toHaveBeenCalled();
        });

        test("does not migrate anon work when messages array is empty", async () => {
          successSetup(action);
          (getAnonWorkData as any).mockReturnValue({ messages: [], fileSystemData: {} });
          (getProjects as any).mockResolvedValue([{ id: "proj-42" }]);

          const { result } = renderHook(() => useAuth());

          await act(async () => {
            await result.current[action]("user@example.com", "password");
          });

          expect(createProject).not.toHaveBeenCalled();
          expect(clearAnonWork).not.toHaveBeenCalled();
          expect(mockPush).toHaveBeenCalledWith("/proj-42");
        });

        test("redirects to most recent project when no anon work", async () => {
          successSetup(action);
          (getAnonWorkData as any).mockReturnValue(null);
          (getProjects as any).mockResolvedValue([
            { id: "recent-proj" },
            { id: "older-proj" },
          ]);

          const { result } = renderHook(() => useAuth());

          await act(async () => {
            await result.current[action]("user@example.com", "password");
          });

          expect(mockPush).toHaveBeenCalledWith("/recent-proj");
          expect(createProject).not.toHaveBeenCalled();
        });

        test("creates a new blank project when no anon work and no existing projects", async () => {
          successSetup(action);
          (getAnonWorkData as any).mockReturnValue(null);
          (getProjects as any).mockResolvedValue([]);
          (createProject as any).mockResolvedValue({ id: "new-proj-99" });

          const { result } = renderHook(() => useAuth());

          await act(async () => {
            await result.current[action]("user@example.com", "password");
          });

          expect(createProject).toHaveBeenCalledWith(
            expect.objectContaining({
              messages: [],
              data: {},
            })
          );
          expect(mockPush).toHaveBeenCalledWith("/new-proj-99");
        });
      });
    }
  });
});
