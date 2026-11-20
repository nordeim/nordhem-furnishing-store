import { describe, expect, it } from "vitest";
import { resolveInfoPage } from "@/content/pages";

/**
 * Session-008 pins on the synthesized info-page contract.
 *
 * S8-M2: the catch-all's broad prefixes (session-007 M-2) re-opened an unbounded thin-
 * content surface — every prefix-matched path rendered with the layout-default meta
 * description and NO canonical. The contract now requires a unique description and a
 * canonical that collapses the long tail into the prefix root.
 *
 * S8-L5: rule.collection previously applied to EVERY prefix match, so /new/new-products
 * showed the Christmas rail. It must only apply on the exact prefix.
 */
describe("resolveInfoPage metadata contract (session-008)", () => {
  it("deep paths under a prefix canonicalize to the prefix root (S8-M2)", () => {
    const page = resolveInfoPage(["customer-service", "faq"]);
    expect(page.canonicalPath).toBe("/customer-service");
    const deep = resolveInfoPage(["newsroom", "media-resources", "disclaimers-pub3dd83fc1"]);
    expect(deep.canonicalPath).toBe("/newsroom");
  });

  it("the exact prefix keeps its self-canonical (S8-M2)", () => {
    for (const prefix of ["planners", "newsroom", "customer-service", "offers", "stores"]) {
      const page = resolveInfoPage([prefix]);
      expect(page.canonicalPath, prefix).toBe(`/${prefix}`);
    }
  });

  it("every resolved page carries a unique, page-specific description (S8-M2)", () => {
    const faq = resolveInfoPage(["customer-service", "faq"]);
    const recalls = resolveInfoPage(["customer-service", "product-support", "recalls"]);
    expect(faq.description).toBeTruthy();
    expect(faq.description).not.toBe(recalls.description);
    // The description must reference the specific page, not stay generic-layout.
    expect(faq.description).toContain("Faq");
    // And it differs from the prefix root's own description.
    const root = resolveInfoPage(["customer-service"]);
    expect(faq.description).not.toBe(root.description);
  });

  it("collection rails only render on the exact rule prefix, never on deep paths (S8-L5)", () => {
    expect(resolveInfoPage(["new"]).collection).toBe("christmas-decoration-wt001");
    expect(resolveInfoPage(["new", "new-products"]).collection).toBeUndefined();
    expect(resolveInfoPage(["rooms", "ikea-real-homes-puba2435880"]).collection).toBeUndefined();
    expect(resolveInfoPage(["campaigns", "christmas"]).collection).toBeUndefined();
  });
});
