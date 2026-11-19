import { describe, expect, it } from "vitest";
import { imageUrl } from "@/lib/images";
import { escapeLike, lastSegment, normaliseQuery, slugToTitle } from "@/lib/paths";
import { createRateLimiter } from "@/lib/rate-limit";

describe("imageUrl", () => {
  it("sizes range-categorisation tiles with imwidth", () => {
    const url = imageUrl("https://www.ikea.com/sg/en/range-categorisation/images/product/a.jpeg?imwidth=160", "l");
    expect(url).toBe("https://www.ikea.com/sg/en/range-categorisation/images/product/a.jpeg?imwidth=640");
  });

  it("sizes other IKEA media with the f flag and drops stale params", () => {
    expect(imageUrl("https://www.ikea.com/images/x.jpg?f=s", "m")).toBe("https://www.ikea.com/images/x.jpg?f=m");
  });

  it("leaves foreign and relative URLs untouched", () => {
    expect(imageUrl("https://example.com/a.jpg")).toBe("https://example.com/a.jpg");
    expect(imageUrl("/local.png")).toBe("/local.png");
  });
});

describe("search helpers", () => {
  it("escapes LIKE wildcards and backslashes", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
  });

  it("collapses whitespace and bounds length", () => {
    expect(normaliseQuery("  sofa   bed  ")).toBe("sofa bed");
    expect(normaliseQuery("x".repeat(500))).toHaveLength(80);
    expect(normaliseQuery(undefined)).toBe("");
  });
});

describe("path helpers", () => {
  it("extracts the last segment ignoring query, hash and slashes", () => {
    expect(lastSegment("/cat/sofas-armchairs-700640/?x=1#y")).toBe("sofas-armchairs-700640");
    expect(lastSegment("/")).toBe("");
  });

  it("derives readable titles from CMS slugs", () => {
    expect(slugToTitle("secure-it-or-return-it-pub6b7f8175")).toBe("Secure it or return it");
    expect(slugToTitle("delivery")).toBe("Delivery");
    expect(slugToTitle("")).toBe("IKEA Singapore");
  });
});

describe("rate limiter", () => {
  it("blocks after the limit and recovers when the window elapses", () => {
    let now = 1_000;
    const limiter = createRateLimiter({ limit: 2, windowMs: 1_000, now: () => now });
    expect(limiter.check("ip").ok).toBe(true);
    expect(limiter.check("ip").ok).toBe(true);
    const blocked = limiter.check("ip");
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBe(1_000);
    expect(limiter.check("other").ok).toBe(true);
    now += 1_000;
    expect(limiter.check("ip").ok).toBe(true);
  });
});
