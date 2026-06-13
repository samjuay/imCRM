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
  users: "/users",
  usersNew: "/users/new",
  settings: "/settings",
} as const;

export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
} as const;

export const NAV_ITEMS = [
  { label: "Home", href: ROUTES.home, icon: "home", permission: undefined },
  { label: "Leads", href: ROUTES.leads, icon: "users", permission: undefined },
  { label: "Projects", href: ROUTES.projects, icon: "building", permission: undefined },
  { label: "Activities", href: ROUTES.activities, icon: "activity", permission: undefined },
  { label: "Settings", href: ROUTES.settings, icon: "settings", permission: "settings" },
  { label: "Users", href: ROUTES.users, icon: "userCog", permission: undefined },
  { label: "Profile", href: ROUTES.profile, icon: "user", permission: undefined },
] as const;