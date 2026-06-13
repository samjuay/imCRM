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
import { loadMasterDataForUser } from "@/lib/master-data/loader";
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
  console.log('[AUTH] PROFILE_START - about to call getUser()');
  console.log('[AUTH] BEFORE getUser()');
  const authUser = await authService.getUser();
  console.log('[AUTH] AFTER getUser()');
  console.log('[AUTH] getUser() returned:', authUser ? 'user' : 'null');
  if (!authUser) {
    console.log('[AUTH] loadProfileForCurrentUser - getUser returned null, checking session');
    const { data: { session } } = await authService.getSession();
    console.log('[AUTH] loadProfileForCurrentUser - session check:', session ? 'exists' : 'null');
  }

  if (!authUser) {
    console.log('[AUTH] PROFILE_COMPLETE - no auth user');
    return { profile: null, shouldSignOut: false };
  }

  console.log('[AUTH] BEFORE fetchProfileByAuthUserId()');
  const { profile, error } = await userService.fetchProfileByAuthUserId(
    authUser.id,
  );
  console.log('[AUTH] AFTER fetchProfileByAuthUserId()');
  console.log('[AUTH] fetchProfileByAuthUserId returned:', { profile: !!profile, error: !!error });

  if (error) {
    if (isNetworkError(error)) {
      throw error;
    }
    console.log('[AUTH] PROFILE_COMPLETE - error (non-network)');
    return { profile: null, shouldSignOut: false };
  }

  if (!profile) {
    console.log('[AUTH] PROFILE_COMPLETE - no profile');
    return { profile: null, shouldSignOut: false };
  }

  if (isUserDisabled(profile)) {
    console.log('[AUTH] PROFILE_COMPLETE - user disabled');
    return {
      profile: null,
      shouldSignOut: true,
      signOutReason: AUTH_ERROR_MESSAGES.disabled,
    };
  }

  console.log('[AUTH] PROFILE_COMPLETE - success');
  return { profile, shouldSignOut: false };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...initialState,

  reset: () => {
    set({ ...initialState, isLoading: false });
  },

  initialize: async () => {
    console.log('[AUTH] AUTH_START initialize()');
    set({ isLoading: true });

    try {
      console.log('[AUTH] initialize() - checking session with getSession()');
      const { data: { session }, error: sessionError } = await authService.getSession();

      if (sessionError || !session) {
        console.log('[AUTH] initialize() - no session, marking unauthenticated');
        set({
          isLoading: false,
          isAuthenticated: false,
          profile: null,
        });
        return;
      }

      console.log('[AUTH] initialize() - session found, loading profile');
      const { profile, shouldSignOut } = await loadProfileForCurrentUser();

      if (shouldSignOut) {
        await authService.signOut();
        set({
          isLoading: false,
          isAuthenticated: false,
          profile: null,
        });
        console.log('[AUTH] AUTH_COMPLETE - signout');
        return;
      }

      set({
        isLoading: false,
        isAuthenticated: true,
        profile,
      });
      console.log('[AUTH] AUTH_COMPLETE - success, isAuthenticated: true');
      if (profile) await loadMasterDataForUser(profile);
    } catch (e) {
      console.log('[AUTH] initialize() - error:', e);
      set({
        isLoading: false,
        isAuthenticated: false,
        profile: null,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshProfile: async () => {
    console.log('[AUTH] refreshProfile START');
    try {
      const { profile, shouldSignOut } = await loadProfileForCurrentUser();

      if (shouldSignOut) {
        console.log('[AUTH] refreshProfile shouldSignOut');
        await get().signOut();
        console.log('[AUTH] refreshProfile COMPLETE (signout)');
        return;
      }

      set({
        isAuthenticated: true,
        profile,
      });
      console.log('[AUTH] refreshProfile COMPLETE - profile loaded');
      if (profile) await loadMasterDataForUser(profile);
    } catch (e) {
      console.log('[AUTH] refreshProfile ERROR:', e);
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

    if (profile) await loadMasterDataForUser(profile);

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