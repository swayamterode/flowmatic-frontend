"use client";

import { LogoIcon } from "@/components/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavGroup } from "@/components/nav-group";
import { footerNavLinks, navGroups } from "@/components/app-shared";
import { LatestChange } from "@/components/latest-change";
import { useActiveNavPath } from "@/hooks/use-active-nav";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export function AppSidebar() {
  const activePath = useActiveNavPath();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="h-14 justify-center">
        <SidebarMenuButton render={<a href="#link" />}>
          <Link className="rounded-md p-2 hover:bg-muted dark:hover:bg-muted/50" href="/">
            <Image
              src={"/logo.png"}
              alt="flowmatic"
              width={24}
              height={24}
              className="rounded-full invert dark:invert-0"
            />
          </Link>
          <span className="font-medium">Flowmatic</span>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
              tooltip="Create new Workflow"
              render={<Link href="/create-workflow" />}
            >
              <PlusIcon />
              <span>Create Workflow</span>
            </SidebarMenuButton>
            {/* <Button
              aria-label="Search workflows"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              size="icon"
              variant="outline"
            >
              <SearchIcon />
              <span className="sr-only">Search workflows</span>
            </Button> */}
          </SidebarMenuItem>
        </SidebarGroup>
        {navGroups.map((group, index) => (
          <NavGroup key={`sidebar-group-${index}`} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <LatestChange />
        <SidebarMenu className="mt-2">
          {footerNavLinks.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                className="text-muted-foreground"
                isActive={item.path === activePath}
                size="sm"
                render={<a href={item.path} />}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
