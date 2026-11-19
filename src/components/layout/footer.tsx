import { Icon } from "@/components/icons";
import { AppLink } from "@/components/ui/app-link";
import { footerColumns, socialLinks } from "@/content/nav";

export function Footer() {
  return (
    <footer className="mt-16 bg-surface">
      <h2 className="sr-only">Footer</h2>
      <div className="page-x mx-auto grid max-w-page gap-8 py-12 md:grid-cols-2">
        <section className="rounded-lg bg-white p-6 md:p-8">
          <h3 className="text-xl font-bold">IKEA Family</h3>
          <p className="mt-3 max-w-xl text-sm text-ink-soft">
            Some clubs are for the select few, but IKEA Family is for everyone. Become a Family member and enjoy rewards, discounts, inspirations and a few surprises all year round.
          </p>
          <AppLink href="/ikea-family" className="btn btn-dark mt-5">
            Discover IKEA Family
          </AppLink>
        </section>
        <section className="rounded-lg bg-white p-6 md:p-8">
          <h3 className="text-xl font-bold">IKEA for Business</h3>
          <p className="mt-3 max-w-xl text-sm text-ink-soft">
            It’s our business to help take care of yours. IKEA for Business offers personalised services, from interior planning to product installation, to help you create your dream business space.
          </p>
          <AppLink href="/ikea-business/" className="btn btn-dark mt-5">
            Find out more
          </AppLink>
        </section>
      </div>

      <div className="page-x mx-auto max-w-page border-t border-line py-10">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {footerColumns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="mb-4 text-sm font-bold">{column.title}</h3>
              <ul className="space-y-2.5 text-sm text-ink-soft">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <AppLink href={link.href} className="hover:text-ink hover:underline">
                      {link.label}
                    </AppLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="page-x mx-auto flex max-w-page flex-col gap-4 border-t border-line py-6 text-xs text-ink-soft md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="flex items-center gap-1.5 font-bold text-ink">
            <Icon name="globe" className="size-4" />
            Singapore · English
          </span>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {socialLinks.map((link) => (
              <li key={link.label}>
                <AppLink href={link.href} aria-label={`Follow IKEA on ${link.label}`} className="font-bold hover:underline">
                  {link.label}
                </AppLink>
              </li>
            ))}
          </ul>
        </div>
        <p className="max-w-xl">
          Independent educational re-creation of ikea.com/sg. Not affiliated with or endorsed by Inter IKEA Systems B.V. IKEA and product names are trademarks of their owners. Sample prices were captured from the public site and are for demonstration only.
        </p>
      </div>
    </footer>
  );
}
