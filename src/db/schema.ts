import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** "category" appears in navigation; "collection" is a curated listing (e.g. lowest price). */
  kind: text("kind").notNull().default("category"),
  image: text("image"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    articleNo: text("article_no").notNull().unique(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    typeDesc: text("type_desc").notNull(),
    priceCents: integer("price_cents").notNull(),
    image: text("image").notNull(),
    rating: real("rating"),
    reviewCount: integer("review_count").notNull().default(0),
    categorySlug: text("category_slug")
      .notNull()
      .references(() => categories.slug),
    collections: text("collections")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("products_category_idx").on(t.categorySlug),
    index("products_price_idx").on(t.priceCents),
    check("products_price_nonneg", sql`${t.priceCents} >= 0`),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("cart_items_session_product_uq").on(t.sessionId, t.productId),
    check("cart_items_qty_range", sql`${t.quantity} between 1 and 99`),
  ],
);

export const favourites = pgTable(
  "favourites",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("favourites_session_product_uq").on(t.sessionId, t.productId)],
);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNo: text("order_no").notNull().unique(),
    sessionId: text("session_id").notNull(),
    customerName: text("customer_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    address: text("address").notNull(),
    postalCode: text("postal_code").notNull(),
    deliveryMethod: text("delivery_method").notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    deliveryCents: integer("delivery_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    status: text("status").notNull().default("received"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("orders_session_idx").on(t.sessionId)],
);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  typeDesc: text("type_desc").notNull(),
  image: text("image").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  quantity: integer("quantity").notNull(),
});

export const familyMembers = pgTable("family_members", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
