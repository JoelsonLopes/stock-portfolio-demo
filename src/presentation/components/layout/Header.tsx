"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/modules/auth/presentation/providers/auth.provider";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  LogOut,
  Menu,
  Package,
  Search,
  ShoppingCart,
  Upload,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const menuItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: Package,
    adminOnly: false,
  },
  {
    title: "Produtos",
    href: "/products",
    icon: Search,
    adminOnly: false,
    subItems: [
      {
        title: "Buscar Produtos",
        href: "/products",
        icon: Search,
      },
      {
        title: "Lista de Preços",
        href: "/products/price-list",
        icon: FileText,
      },
    ],
  },
  {
    title: "Clientes",
    href: "/clients",
    icon: Users,
    adminOnly: false,
  },
  {
    title: "Pedidos",
    href: "/orders",
    icon: ShoppingCart,
    adminOnly: false,
  },
  {
    title: "Importar Dados",
    href: "/import",
    icon: Upload,
    adminOnly: true,
  },
];

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      if (headerRef.current) {
        headerRef.current.style.paddingRight = `${scrollbarWidth}px`;
      }
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      if (headerRef.current) {
        headerRef.current.style.paddingRight = "";
      }
    }

    return () => {
      // Cleanup: sempre restaurar o scroll quando o componente desmontar
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      if (headerRef.current) {
        headerRef.current.style.paddingRight = "";
      }
    };
  }, [isOpen]);

  // Garantir que o scroll seja restaurado ao mudar de página
  useEffect(() => {
    setIsOpen(false);
    // Garantir que o scroll seja restaurado
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  }, [pathname]);

  const handleSignOut = async () => {
    await logout();
    router.push("/login");
  };

  const filteredMenuItems = menuItems.filter(
    (item) => !item.adminOnly || user?.is_admin
  );

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  return (
    <header
      ref={headerRef}
      className="fixed top-0 z-50 w-full border-b bg-background"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Menu Navigation - Visível em todos os tamanhos */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col gap-4 py-4">
                <div className="flex items-center gap-2 px-4">
                  <Package className="h-8 w-8 text-primary" />
                  <div>
                    <h2 className="text-lg font-bold text-primary">
                      Demo Parts Co.
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Automotive Parts & Supplies
                    </p>
                  </div>
                </div>
                <nav className="flex flex-col gap-2 px-2">
                  {filteredMenuItems.map((item) => {
                    const isActive = pathname === item.href;
                    const isExpanded = expandedItems.includes(item.title);
                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const Icon = item.icon;

                    return (
                      <div key={item.href}>
                        {hasSubItems ? (
                          <>
                            <button
                              onClick={() => toggleExpanded(item.title)}
                              className={`
                                w-full flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium transition-colors
                                ${
                                  pathname.startsWith(item.href)
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }
                              `}
                            >
                              <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5" />
                                <span>{item.title}</span>
                              </div>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            {isExpanded && (
                              <div className="ml-4 mt-1 flex flex-col gap-1">
                                {item.subItems.map((subItem) => {
                                  const SubIcon = subItem.icon;
                                  const isSubActive = pathname === subItem.href;
                                  return (
                                    <Link
                                      key={subItem.href}
                                      href={subItem.href}
                                      onClick={() => setIsOpen(false)}
                                      className={`
                                        flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors
                                        ${
                                          isSubActive
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }
                                      `}
                                    >
                                      <SubIcon className="h-4 w-4" />
                                      <span>{subItem.title}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        ) : (
                          <Link
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={`
                              flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors
                              ${
                                isActive
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }
                            `}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{item.title}</span>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap min-w-0"
          >
            <Package className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary flex-shrink-0" />
            <h1 className="text-sm sm:text-lg md:text-xl lg:text-2xl font-bold text-primary truncate">
              Demo Parts Co.
            </h1>
          </Link>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 h-8 px-3 flex-shrink-0"
              >
                <span className="text-sm md:text-base hidden sm:inline">
                  Olá, {user?.name}
                </span>
                <span className="text-sm sm:hidden">Menu</span>
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
