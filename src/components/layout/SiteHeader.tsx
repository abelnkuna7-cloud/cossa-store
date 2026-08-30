import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  Link,
  useNavigate,
} from "@tanstack/react-router";

import {
  ChevronDown,
  ChevronRight,
  FileText,
  Grid2X2,
  Heart,
  Menu,
  MessageCircle,
  Phone,
  Search,
  ShoppingCart,
  User,
  X,
} from "lucide-react";

import { StaffCatalogueLink } from "@/components/admin/StaffCatalogueLink";
import { GroupBadge } from "@/components/company/GroupBadge";
import { useSupport } from "@/components/support/support-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { companyConfig } from "@/config/company";
import { STORE_SLOGAN } from "@/config/store-brand";
import {
  SITE,
  whatsappLink,
} from "@/config/site";

import {
  CATEGORIES,
  CATEGORY_MENU_GROUPS,
  getPrimaryNavCategories,
} from "@/data/categories";

import { supabase } from "@/integrations/supabase/client";

import { trackEvent } from "@/lib/analytics";
import { useSession } from "@/lib/auth";
import { useCommerce } from "@/lib/commerce-store";

import type {
  Category,
  CategorySlug,
} from "@/types/catalog";

/* -------------------------------------------------------------------------- */
/* NAVIGATION                                                                 */
/* -------------------------------------------------------------------------- */

const PRIMARY_NAV = [
  {
    label: "Home",
    to: "/" as const,
  },
  {
    label: "Shop",
    to: "/shop" as const,
  },
];

const BUSINESS_NAV = [
  {
    label: "Shop by Project",
    to: "/shop-by-project" as const,
  },
  {
    label: "Business Buying",
    to: "/business-account" as const,
  },
];

const MOBILE_UTILITY_NAV = [
  {
    label: "Shop by Project",
    to: "/shop-by-project" as const,
  },
  {
    label: "Business Buying",
    to: "/business-account" as const,
  },
  {
    label: "Request a Quote",
    to: "/request-a-quote" as const,
  },
  {
    label: "Support",
    to: "/contact" as const,
  },
];

/**
 * Major departments shown directly in the desktop navigation.
 *
 * All remaining departments stay accessible through "All Departments".
 *
 * This is intentionally limited so the header remains usable on
 * common laptop widths.
 */
const DESKTOP_PRIMARY_DEPARTMENT_LIMIT = 6;

/* -------------------------------------------------------------------------- */
/* HEADER                                                                     */
/* -------------------------------------------------------------------------- */

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [
    departmentsOpen,
    setDepartmentsOpen,
  ] = useState(false);

  const departmentsMenuRef =
    useRef<HTMLDivElement>(null);

  const [
    mobileDepartment,
    setMobileDepartment,
  ] = useState<
    CategorySlug | null
  >(null);

  const [term, setTerm] =
    useState("");

  const navigate =
    useNavigate();

  const {
    cartCount,
    wishlistCount,
    hydrated,
  } = useCommerce();

  const {
    open: openSupport,
  } = useSupport();

  const {
    user,
  } = useSession();

  const primaryDepartments =
    getPrimaryNavCategories().slice(
      0,
      DESKTOP_PRIMARY_DEPARTMENT_LIMIT,
    );

  useEffect(() => {
    if (!departmentsOpen) {
      return;
    }

    function closeOnOutsideClick(
      event: MouseEvent,
    ) {
      if (
        departmentsMenuRef.current &&
        !departmentsMenuRef.current.contains(
          event.target as Node,
        )
      ) {
        setDepartmentsOpen(false);
      }
    }

    function closeOnEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setDepartmentsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      closeOnOutsideClick,
    );
    document.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        closeOnOutsideClick,
      );
      document.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [departmentsOpen]);

  /* ---------------------------------------------------------------------- */
  /* AUTH                                                                   */
  /* ---------------------------------------------------------------------- */

  async function signOut() {
    await supabase.auth.signOut();

    setMobileOpen(false);
    setDepartmentsOpen(false);

    navigate({
      to: "/",
      replace: true,
    });
  }

  /* ---------------------------------------------------------------------- */
  /* SEARCH                                                                 */
  /* ---------------------------------------------------------------------- */

  function runSearch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const q =
      term.trim();

    if (!q) {
      return;
    }

    setMobileOpen(false);
    setDepartmentsOpen(false);

    navigate({
      to: "/search",
      search: {
        q,
      },
    });
  }

  /* ---------------------------------------------------------------------- */
  /* MOBILE DEPARTMENT ACCORDION                                            */
  /* ---------------------------------------------------------------------- */

  function toggleMobileDepartment(
    slug: CategorySlug,
  ) {
    setMobileDepartment(
      (current) =>
        current === slug
          ? null
          : slug,
    );
  }

  /* ---------------------------------------------------------------------- */
  /* RENDER                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      {/* ------------------------------------------------------------------ */}
      {/* TRUST / SUPPORT BAR                                                */}
      {/* ------------------------------------------------------------------ */}

      <div className="border-b border-border bg-secondary">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2 text-xs sm:px-6 lg:px-8">
          <p className="min-w-0 truncate text-muted-foreground">
            South African owned ·
            Speak to a real person
          </p>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <a
              href={
                SITE.phoneHref
              }
              onClick={() =>
                trackEvent(
                  "phone_call_clicked",
                )
              }
              className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
            >
              <Phone
                className="h-3.5 w-3.5"
                aria-hidden
              />

              <span className="hidden sm:inline">
                {
                  SITE.phoneDisplay
                }
              </span>

              <span className="sr-only sm:hidden">
                Call{" "}
                {
                  SITE.phoneDisplay
                }
              </span>
            </a>

            <a
              href={
                whatsappLink()
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackEvent(
                  "whatsapp_opened",
                  {
                    trigger:
                      "header",
                  },
                )
              }
              className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
            >
              <MessageCircle
                className="h-3.5 w-3.5 text-primary"
                aria-hidden
              />

              <span className="hidden sm:inline">
                WhatsApp support
              </span>

              <span className="sr-only sm:hidden">
                WhatsApp support
              </span>
            </a>

            <button
              type="button"
              onClick={() =>
                openSupport(
                  "quote",
                )
              }
              className="hidden items-center gap-1.5 font-medium underline-offset-4 hover:underline md:inline-flex"
            >
              <FileText
                className="h-3.5 w-3.5 text-primary"
                aria-hidden
              />

              Request a quote
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MAIN HEADER                                                        */}
      {/* ------------------------------------------------------------------ */}

      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
        {/* LOGO */}

        <Link
          to="/"
          className="flex min-w-0 shrink-0 items-center"
          aria-label="Cossa Store home"
          onClick={() => {
            setMobileOpen(false);
            setDepartmentsOpen(false);
          }}
        >
          <img
            src={
              companyConfig
                .store.logo
            }
            alt={
              companyConfig
                .store.logoAlt
            }
            width={170}
            height={52}
            fetchPriority="high"
            decoding="async"
            className="h-8 w-auto max-w-[130px] object-contain sm:h-10 sm:max-w-[155px] lg:h-11 lg:max-w-none"
          />
          <span className="store-slogan" aria-label="Shop smarter. Live better. Build more.">
            {STORE_SLOGAN.map((phrase) => (
              <span key={phrase.tone} className={`store-slogan__${phrase.tone}`}>
                {phrase.text}
              </span>
            ))}
          </span>
        </Link>

        {/* PARENT COMPANY BADGE */}

        <GroupBadge className="hidden 2xl:inline-flex" />

        {/* DESKTOP SEARCH */}

        <form
          onSubmit={
            runSearch
          }
          className="ml-auto hidden min-w-0 flex-1 md:flex lg:max-w-xl xl:max-w-2xl"
          role="search"
        >
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />

            <Input
              value={term}
              onChange={(
                event,
              ) =>
                setTerm(
                  event.target
                    .value,
                )
              }
              placeholder="Search products, brands, categories and solutions…"
              aria-label="Search Cossa Store"
              className="w-full pl-9"
            />
          </div>

          <Button
            type="submit"
            className="ml-2 shrink-0"
          >
            Search
          </Button>
        </form>

        {/* ACCOUNT ACTIONS */}

        <div className="ml-auto flex shrink-0 items-center gap-0.5 md:ml-0 sm:gap-1">
          {/* MOBILE SUPPORT */}

          <Button
            variant="ghost"
            size="icon"
            aria-label="Open support"
            className="hidden sm:inline-flex md:hidden"
            onClick={() =>
              openSupport(
                "whatsapp",
              )
            }
          >
            <MessageCircle className="h-5 w-5" />
          </Button>

          {/* ACCOUNT */}

          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="Account"
          >
            <Link to="/account">
              <User className="h-5 w-5" />
            </Link>
          </Button>

          {/* STAFF CATALOGUE */}

          <StaffCatalogueLink className="hidden xl:inline-flex" />

          {/* SIGN IN / OUT */}

          {user ? (
            <Button
              variant="ghost"
              size="sm"
              className="hidden xl:inline-flex"
              onClick={
                signOut
              }
            >
              Sign out
            </Button>
          ) : (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden xl:inline-flex"
            >
              <Link to="/auth">
                Sign in
              </Link>
            </Button>
          )}

          {/* WISHLIST */}

          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="Wishlist"
          >
            <Link
              to="/account/wishlist"
              className="relative"
            >
              <Heart className="h-5 w-5" />

              {hydrated &&
              wishlistCount >
                0 ? (
                <Dot
                  value={
                    wishlistCount
                  }
                />
              ) : null}
            </Link>
          </Button>

          {/* CART */}

          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="Shopping cart"
          >
            <Link
              to="/cart"
              className="relative"
            >
              <ShoppingCart className="h-5 w-5" />

              {hydrated &&
              cartCount >
                0 ? (
                <Dot
                  value={
                    cartCount
                  }
                />
              ) : null}
            </Link>
          </Button>

          {/* MOBILE MENU */}

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={
              mobileOpen
                ? "Close menu"
                : "Open menu"
            }
            aria-expanded={
              mobileOpen
            }
            onClick={() =>
              setMobileOpen(
                (current) =>
                  !current,
              )
            }
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* DESKTOP DEPARTMENT NAVIGATION                                      */}
      {/* ------------------------------------------------------------------ */}

      <nav
        className="hidden border-t border-border lg:block"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          {/* HOME + SHOP */}

          <div className="flex shrink-0 items-center">
            {PRIMARY_NAV.map(
              (item) => (
                <NavLink
                  key={
                    item.to
                  }
                  to={
                    item.to
                  }
                  label={
                    item.label
                  }
                />
              ),
            )}
          </div>

          {/* ALL DEPARTMENTS */}

          <div
            ref={departmentsMenuRef}
            className="relative shrink-0"
            onMouseLeave={() =>
              setDepartmentsOpen(false)
            }
          >
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={
                departmentsOpen
              }
              onClick={() =>
                setDepartmentsOpen(
                  (current) =>
                    !current,
                )
              }
              className="flex items-center gap-1.5 border-b-2 border-transparent px-3 py-3 text-[13px] font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Grid2X2 className="h-4 w-4" />

              Departments

              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  departmentsOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {departmentsOpen ? (
              <DepartmentMegaMenu
                onClose={() =>
                  setDepartmentsOpen(
                    false,
                  )
                }
              />
            ) : null}
          </div>

          {/* PRIMARY STORE DEPARTMENTS */}

          <div className="flex min-w-0 flex-1 items-center overflow-hidden">
            {primaryDepartments.map(
              (category) => (
                <DepartmentNavLink
                  key={
                    category.slug
                  }
                  category={
                    category
                  }
                />
              ),
            )}
          </div>

          {/* BUSINESS / PROJECT ACTIONS */}

          <div className="ml-auto flex shrink-0 items-center border-l border-border pl-1">
            {BUSINESS_NAV.map(
              (item) => (
                <NavLink
                  key={
                    item.to
                  }
                  to={
                    item.to
                  }
                  label={
                    item.label
                  }
                  compact
                />
              ),
            )}
          </div>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* MOBILE MENU                                                        */}
      {/* ------------------------------------------------------------------ */}

      {mobileOpen ? (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="max-h-[calc(100dvh-118px)] overflow-y-auto overscroll-contain">
            <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6">
              {/* MOBILE SEARCH */}

              <form
                onSubmit={
                  runSearch
                }
                className="mb-4 flex gap-2"
                role="search"
              >
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />

                  <Input
                    value={
                      term
                    }
                    onChange={(
                      event,
                    ) =>
                      setTerm(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="Search Cossa Store…"
                    aria-label="Search products"
                    className="pl-9"
                  />
                </div>

                <Button
                  type="submit"
                  className="shrink-0"
                >
                  Search
                </Button>
              </form>

              {/* MOBILE HOME / SHOP */}

              <div className="grid grid-cols-2 gap-2 pb-4">
                <Button
                  asChild
                  variant="outline"
                  className="w-full"
                >
                  <Link
                    to="/"
                    onClick={() =>
                      setMobileOpen(
                        false,
                      )
                    }
                  >
                    Home
                  </Link>
                </Button>

                <Button
                  asChild
                  className="w-full"
                >
                  <Link
                    to="/shop"
                    onClick={() =>
                      setMobileOpen(
                        false,
                      )
                    }
                  >
                    Shop all
                  </Link>
                </Button>
              </div>

              {/* MOBILE DEPARTMENTS */}

              <section
                className="border-t border-border pt-4"
                aria-labelledby="mobile-departments-heading"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h2
                    id="mobile-departments-heading"
                    className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                  >
                    Shop by department
                  </h2>

                  <span className="text-xs text-muted-foreground">
                    {
                      CATEGORIES.length
                    }{" "}
                    departments
                  </span>
                </div>

                <div className="divide-y divide-border border-y border-border">
                  {CATEGORIES.map(
                    (
                      category,
                    ) => {
                      const expanded =
                        mobileDepartment ===
                        category.slug;

                      return (
                        <MobileDepartment
                          key={
                            category.slug
                          }
                          category={
                            category
                          }
                          expanded={
                            expanded
                          }
                          onToggle={() =>
                            toggleMobileDepartment(
                              category.slug,
                            )
                          }
                          onDone={() =>
                            setMobileOpen(
                              false,
                            )
                          }
                        />
                      );
                    },
                  )}
                </div>
              </section>

              {/* MOBILE BUSINESS LINKS */}

              <section className="mt-5">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  More from Cossa Store
                </h2>

                <div className="divide-y divide-border border-y border-border">
                  {MOBILE_UTILITY_NAV.map(
                    (
                      item,
                    ) => (
                      <MobileLink
                        key={
                          item.to
                        }
                        to={
                          item.to
                        }
                        label={
                          item.label
                        }
                        onDone={() =>
                          setMobileOpen(
                            false,
                          )
                        }
                      />
                    ),
                  )}
                </div>
              </section>

              {/* MOBILE SUPPORT */}

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMobileOpen(
                      false,
                    );

                    openSupport(
                      "whatsapp",
                    );
                  }}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />

                  WhatsApp support
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMobileOpen(
                      false,
                    );

                    openSupport(
                      "quote",
                    );
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />

                  Request a quote
                </Button>
              </div>

              {/* MOBILE STAFF / AUTH */}

              <div className="mt-5 border-t border-border pt-4">
                <StaffCatalogueLink className="w-full" />

                {user ? (
                  <Button
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={
                      signOut
                    }
                  >
                    Sign out
                  </Button>
                ) : (
                  <Button
                    asChild
                    variant="outline"
                    className="mt-2 w-full"
                  >
                    <Link
                      to="/auth"
                      onClick={() =>
                        setMobileOpen(
                          false,
                        )
                      }
                    >
                      Sign in /
                      Sign up
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* DESKTOP MEGA MENU                                                          */
/* -------------------------------------------------------------------------- */

function DepartmentMegaMenu({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div className="absolute left-0 top-full z-[70] mt-px w-[min(92vw,1050px)] overflow-hidden rounded-b-xl border border-border bg-background shadow-2xl">
      {/* TOP */}

      <div className="flex items-center justify-between border-b border-border bg-secondary/60 px-5 py-4">
        <div>
          <p className="text-sm font-semibold">
            Shop all departments
          </p>

          <p className="mt-0.5 text-xs text-muted-foreground">
            Browse Cossa Store
            across physical,
            supplier,
            dropshipping,
            affiliate,
            print-on-demand
            and digital products.
          </p>
        </div>

        <Button
          asChild
          size="sm"
          variant="outline"
        >
          <Link
            to="/shop"
            onClick={
              onClose
            }
          >
            Shop all
          </Link>
        </Button>
      </div>

      {/* GROUPED DEPARTMENTS */}

      <div className="grid grid-cols-4 gap-0 divide-x divide-border">
        {CATEGORY_MENU_GROUPS.map(
          (group) => (
            <div
              key={
                group.id
              }
              className="p-5"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.13em] text-primary">
                {
                  group.label
                }
              </p>

              <div className="space-y-1">
                {group.slugs.map(
                  (slug) => {
                    const category =
                      CATEGORIES.find(
                        (
                          candidate,
                        ) =>
                          candidate.slug ===
                          slug,
                      );

                    if (
                      !category
                    ) {
                      return null;
                    }

                    return (
                      <Link
                        key={
                          category.slug
                        }
                        to="/category/$slug"
                        params={{
                          slug:
                            category.slug,
                        }}
                        onClick={
                          onClose
                        }
                        className="group flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <span>
                          {
                            category.name
                          }
                        </span>

                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    );
                  },
                )}
              </div>
            </div>
          ),
        )}
      </div>

      {/* FEATURED QUICK LINKS */}

      <div className="border-t border-border bg-secondary/40 px-5 py-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">
          Quick product
          discovery
        </p>

        <div className="flex flex-wrap gap-2">
          <QuickSearchLink
            label="Laptops"
            query="laptops"
            onDone={
              onClose
            }
          />

          <QuickSearchLink
            label="Phones"
            query="phones"
            onDone={
              onClose
            }
          />

          <QuickSearchLink
            label="Power tools"
            query="power tools"
            onDone={
              onClose
            }
          />

          <QuickSearchLink
            label="Cleaning products"
            query="cleaning"
            onDone={
              onClose
            }
          />

          <QuickSearchLink
            label="Women's fashion"
            query="women"
            onDone={
              onClose
            }
          />

          <QuickSearchLink
            label="Men's fashion"
            query="men"
            onDone={
              onClose
            }
          />

          <QuickSearchLink
            label="Car accessories"
            query="car accessories"
            onDone={
              onClose
            }
          />

          <QuickSearchLink
            label="Digital products"
            query="digital"
            onDone={
              onClose
            }
          />

          <QuickSearchLink
            label="Print on demand"
            query="print on demand"
            onDone={
              onClose
            }
          />

          <QuickSearchLink
            label="Smart home"
            query="smart home"
            onDone={
              onClose
            }
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* DESKTOP DEPARTMENT LINK                                                    */
/* -------------------------------------------------------------------------- */

function DepartmentNavLink({
  category,
}: {
  category: Category;
}) {
  return (
    <Link
      to="/category/$slug"
      params={{
        slug:
          category.slug,
      }}
      className="whitespace-nowrap border-b-2 border-transparent px-2.5 py-3 text-[13px] font-medium text-foreground/80 transition-colors hover:border-primary/50 hover:text-foreground xl:px-3"
      activeProps={{
        className:
          "border-primary text-foreground",
      }}
    >
      {category.name}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* MOBILE DEPARTMENT                                                          */
/* -------------------------------------------------------------------------- */

function MobileDepartment({
  category,
  expanded,
  onToggle,
  onDone,
}: {
  category: Category;
  expanded: boolean;
  onToggle: () => void;
  onDone: () => void;
}) {
  return (
    <div>
      <div className="flex items-stretch">
        <Link
          to="/category/$slug"
          params={{
            slug:
              category.slug,
          }}
          onClick={
            onDone
          }
          className="min-w-0 flex-1 py-3 pr-3"
        >
          <p className="text-sm font-semibold">
            {
              category.name
            }
          </p>

          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {
              category.tagline
            }
          </p>
        </Link>

        <button
          type="button"
          onClick={
            onToggle
          }
          className="flex min-h-12 w-12 shrink-0 items-center justify-center"
          aria-expanded={
            expanded
          }
          aria-label={`${
            expanded
              ? "Collapse"
              : "Expand"
          } ${
            category.name
          } categories`}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              expanded
                ? "rotate-180"
                : ""
            }`}
          />
        </button>
      </div>

      {expanded ? (
        <div className="grid gap-1 pb-3 sm:grid-cols-2">
          <Link
            to="/category/$slug"
            params={{
              slug:
                category.slug,
            }}
            onClick={
              onDone
            }
            className="rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary"
          >
            Shop all{" "}
            {
              category.name
            }
          </Link>

          {category.subcategories.map(
            (
              subcategory,
            ) => (
              <Link
                key={
                  subcategory.slug
                }
                to="/shop"
                search={{
                  category:
                    category.slug,
                  subcategory:
                    subcategory.slug,
                }}
                onClick={
                  onDone
                }
                className="rounded-md px-3 py-2 text-sm text-foreground/80 hover:bg-secondary hover:text-foreground"
              >
                {
                  subcategory.name
                }
              </Link>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* QUICK SEARCH LINK                                                          */
/* -------------------------------------------------------------------------- */

function QuickSearchLink({
  label,
  query,
  onDone,
}: {
  label: string;
  query: string;
  onDone: () => void;
}) {
  return (
    <Link
      to="/search"
      search={{
        q: query,
      }}
      onClick={
        onDone
      }
      className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-primary hover:text-primary"
    >
      {label}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* CART / WISHLIST COUNTER                                                    */
/* -------------------------------------------------------------------------- */

function Dot({
  value,
}: {
  value: number;
}) {
  const displayValue =
    value > 99
      ? "99+"
      : value;

  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold leading-none text-accent-foreground">
      {
        displayValue
      }
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* STANDARD NAV LINK                                                          */
/* -------------------------------------------------------------------------- */

function NavLink({
  to,
  label,
  compact = false,
}: {
  to: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`whitespace-nowrap border-b-2 border-transparent py-3 font-medium text-foreground/80 transition-colors hover:border-primary/50 hover:text-foreground ${
        compact
          ? "px-2 text-xs xl:px-2.5 xl:text-[13px]"
          : "px-2.5 text-[13px] xl:px-3"
      }`}
      activeOptions={{
        exact:
          to === "/",
      }}
      activeProps={{
        className:
          "border-primary text-foreground",
      }}
    >
      {label}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* MOBILE STANDARD LINK                                                       */
/* -------------------------------------------------------------------------- */

function MobileLink({
  to,
  label,
  onDone,
}: {
  to: string;
  label: string;
  onDone: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={
        onDone
      }
      className="flex min-h-12 items-center justify-between py-3 text-sm font-medium"
    >
      <span>
        {label}
      </span>

      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
