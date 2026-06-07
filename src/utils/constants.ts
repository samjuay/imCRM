export const APP_NAME = "ImCRM";

export const ROUTES = {
  home: "/",
  login: "/login",
  forgotPassword: "/forgot-password",
  unauthorized: "/unauthorized",
  platform: "/platform",
  leads: "/leads",
  projects: "/projects",
  activities: "/activities",
  profile: "/profile",
  masterData: "/master-data",
  permissions: "/permissions",
} as const;

export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
} as const;

export const NAV_ITEMS = [
  { label: "Home", href: ROUTES.home, icon: "home" },
  { label: "Leads", href: ROUTES.leads, icon: "users" },
  { label: "Projects", href: ROUTES.projects, icon: "building" },
  { label: "Activities", href: ROUTES.activities, icon: "activity" },
  { label: "Profile", href: ROUTES.profile, icon: "user" },
] as const;