import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { UserProfileMenu } from "./auth/user-profile-menu";
import { UserRole } from "@shared/auth";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare, BarChart2, Home, Users, Settings, FileDigit, Activity, ClipboardCheck } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  // Define navigation links with role-based access
  const navigation = [
    {
      name: 'Home',
      href: '/',
      icon: Home,
      current: location === '/',
      roles: [UserRole.ADMIN, UserRole.ANALYST, UserRole.TECHNICIAN, UserRole.VIEWER],
    },
    {
      name: 'Reliability',
      href: '/reliability',
      icon: BarChart2,
      current: location === '/reliability',
      roles: [UserRole.ADMIN, UserRole.ANALYST, UserRole.TECHNICIAN, UserRole.VIEWER],
    },
    {
      name: 'FMECA',
      href: '/fmeca',
      icon: FileDigit,
      current: location === '/fmeca',
      roles: [UserRole.ADMIN, UserRole.ANALYST, UserRole.TECHNICIAN],
    },

    {
      name: 'RCM',
      href: '/rcm',
      icon: Settings,
      current: location === '/rcm',
      roles: [UserRole.ADMIN, UserRole.ANALYST, UserRole.TECHNICIAN],
    },
    {
      name: 'User Management',
      href: '/users',
      icon: Users,
      current: location === '/users',
      roles: [UserRole.ADMIN], // Only admin can access this
    },
  ];

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => {
    // If no user, show nothing (handled by auth redirect)
    if (!user) return false;
    
    // Show navigation items that match the user's role
    return item.roles.includes(user.role as UserRole);
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top navigation */}
      <header className="bg-background border-b border-border">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and main navigation */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link href="/" className="flex items-center">
                  <div className="p-1.5 rounded-md bg-primary">
                    <BarChart2 className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="ml-3 text-xl font-semibold">Reliability Pro</span>
                </Link>
              </div>
              <nav className="hidden md:ml-8 md:flex md:space-x-4">
                {filteredNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      item.current
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      'rounded-md px-3 py-2 flex items-center text-sm font-medium'
                    )}
                  >
                    <item.icon className="mr-2 h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right side with profile menu */}
            <div className="flex items-center">
              <UserProfileMenu />
            </div>
          </div>
        </div>

        {/* Mobile menu - shown below the header on small screens */}
        <div className="md:hidden border-t border-border">
          <div className="space-y-1 px-2 py-3 sm:px-3 flex">
            {filteredNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  item.current
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  'flex-1 rounded-md px-3 py-2 flex items-center justify-center text-sm font-medium'
                )}
              >
                <item.icon className="mr-2 h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-4">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Reliability Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}