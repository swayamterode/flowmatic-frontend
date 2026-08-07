import type { ReactNode } from "react";
import { LayoutGridIcon, WorkflowIcon, BookOpenIcon, PlusIcon, CreditCardIcon } from "lucide-react";

export type SidebarNavItem = {
  title: string;
  path?: string;
  icon?: ReactNode;
  subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
  label?: string;
  items: SidebarNavItem[];
};

export const navGroups: SidebarNavGroup[] = [
  {
    items: [
      {
        title: "Overview",
        path: "/dashboard",
        icon: <LayoutGridIcon />,
      },
    ],
  },
  {
    label: "Build",
    items: [
      {
        title: "Workflows",
        path: "/workflows",
        icon: <WorkflowIcon />,
      },
    ],
  },
];

export const footerNavLinks: SidebarNavItem[] = [
  {
    title: "Docs",
    path: "/documentation",
    icon: <BookOpenIcon />,
  },
  {
    title: "Pricing",
    path: "/pricing",
    icon: <CreditCardIcon />,
  },
];

/** Reachable routes that aren't rendered in the nav tree (CTAs, detail pages). */
export const extraNavLinks: SidebarNavItem[] = [
  {
    title: "Create workflow",
    path: "/create-workflow",
    icon: <PlusIcon />,
  },
  {
    title: "Payment confirmed",
    path: "/billing/success",
    icon: <CreditCardIcon />,
  },
  {
    title: "Checkout canceled",
    path: "/billing/cancel",
    icon: <CreditCardIcon />,
  },
];

export const navLinks: SidebarNavItem[] = [
  ...navGroups.flatMap((group) =>
    group.items.flatMap((item) => (item.subItems?.length ? [item, ...item.subItems] : [item])),
  ),
  ...footerNavLinks,
  ...extraNavLinks,
];
