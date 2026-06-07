import { create } from "zustand";
import { getPostLoginRedirect } from "@/lib/auth/redirects";
import {
  getAuthErrorMessage,
  isNetworkError,
  mapSupabaseAuthError,
} from "@/lib/auth/errors";
import { isUserDisabled } from "@/lib/auth/profile";
import { AUTH_ERROR_MESSAGES } from "@/lib/auth/constants";
import { ROUTES } from "@/utils/constants";
import { authService } from "@/services/auth.service";
import { sessionService } from "@/services/session.service";
import { userService } from "@/services/user.service";
import type { SignInResult, UserProfile } from "@/types/auth";

type AuthState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  profile: UserProfile | null;
  initialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  reset: () => void;
};

const initialState = {
  isLoading: true,
  isAuthenticated: false,
  profile: null,
};

async function loadProfileForCurrentUser(): Promise<{
  profile: UserProfile | null;
  shouldSignOut: boolean;
  signOutReason?: string;
}> {
  const authUser = await authService.getUser();

  if (!authUser) {
    return { profile: null, shouldSignOut: false };
  }

  const { profile, error } = await userService.fetchProfileByAuthUserId(
    authUser.id,
  );

  if (error) {
    if (isNetworkError(error)) {
      throw error;
    }
    return { profile: null, shouldSignOut: false };
  }

  if (!profile) {
    return { profile: null, shouldSignOut: false };
  }

  if (isUserDisabled(profile)) {
    return {
      profile: null,
      shouldSignOut: true,
      signOutReason: AUTH_ERROR_MESSAGES.disabled,
    };
  }

  return { profile, shouldSignOut: false };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...initialState,

  reset: () => {
    set({ ...initialState, isLoading: false });
  },

  initialize: async () => {
    set({ isLoading: true });

    try {
      const { profile, shouldSignOut } = await loadProfileForCurrentUser();

      if (shouldSignOut) {
        await authService.signOut();
        set({
          isLoading: false,
          isAuthenticated: false,
          profile: null,
        });
        return;
      }

      const authUser = await authService.getUser();

      set({
        isLoading: false,
        isAuthenticated: authUser !== null,
        profile,
      });
    } catch {
      set({
        isLoading: false,
        isAuthenticated: false,
        profile: null,
      });
    }
  },

  refreshProfile: async () => {
    try {
      const { profile, shouldSignOut } = await loadProfileForCurrentUser();

      if (shouldSignOut) {
        await get().signOut();
        return;
      }

      const authUser = await authService.getUser();

      set({
        isAuthenticated: authUser !== null,
        profile,
      });
    } catch {
      set({
        isAuthenticated: false,
        profile: null,
      });
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await authService.signInWithEmail(email, password);

    if (error) {
      const code = mapSupabaseAuthError(error.message);
      return {
        success: false,
        code,
        message: getAuthErrorMessage(code),
      };
    }

    if (!data.user) {
      return {
        success: false,
        code: "unknown",
        message: getAuthErrorMessage("unknown"),
      };
    }

    const { profile, error: profileError } =
      await userService.fetchProfileByAuthUserId(data.user.id);

    if (profileError) {
      const code = isNetworkError(profileError) ? "network" : "unknown";
      await authService.signOut();
      return {
        success: false,
        code,
        message: getAuthErrorMessage(code),
      };
    }

    if (!profile) {
      set({
        isAuthenticated: true,
        profile: null,
        isLoading: false,
      });
      return {
        success: true,
        redirectTo: ROUTES.unauthorized,
      };
    }

    if (isUserDisabled(profile)) {
      await authService.signOut();
      return {
        success: false,
        code: "disabled",
        message: AUTH_ERROR_MESSAGES.disabled,
      };
    }

    const { error: sessionError } = await sessionService.createLoginSession(
      profile.user_id,
    );

    if (sessionError) {
      if (isNetworkError(sessionError)) {
        await authService.signOut();
        return {
          success: false,
          code: "network",
          message: getAuthErrorMessage("network"),
        };
      }
    }

    set({
      isAuthenticated: true,
      profile,
      isLoading: false,
    });

    return {
      success: true,
      redirectTo: getPostLoginRedirect(profile.role),
    };
  },

  signOut: async () => {
    const { profile } = get();

    if (profile) {
      await sessionService.closeLatestSession(profile.user_id);
    }

    await authService.signOut();
    get().reset();
  },
}));