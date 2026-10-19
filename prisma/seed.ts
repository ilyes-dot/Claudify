/**
 * Seeds the database with:
 *  - the base permission catalog
 *  - three system roles (Super Admin, Editor, Viewer)
 *  - one initial admin user (credentials come from env, never hardcoded)
 *
 * Run with: npm run prisma:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const MODULES = [
  "users", "roles", "audit-logs", "settings", "dashboard",
  "products", "categories", "orders", "customers",
] as const;
const ACTIONS = ["view", "create", "update", "delete"] as const;

async function main() {
  // 1. Permission catalog -----------------------------------------------
  const permissionKeys = MODULES.flatMap((module) =>
    ACTIONS.map((action) => ({ module, action, key: `${module}:${action}` }))
  );

  for (const p of permissionKeys) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: {},
      create: {
        key: p.key,
        module: p.module,
        action: p.action,
        description: `Can ${p.action} ${p.module}`,
      },
    });
  }

  const allPermissions = await prisma.permission.findMany();

  // 2. Roles ---------------------------------------------------------------
  const superAdmin = await prisma.role.upsert({
    where: { name: "Super Admin" },
    update: {},
    create: {
      name: "Super Admin",
      description: "Full, unrestricted access to every module.",
      isSystem: true,
    },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: superAdmin.id } });
  await prisma.rolePermission.createMany({
    data: allPermissions.map((perm) => ({ roleId: superAdmin.id, permissionId: perm.id })),
    skipDuplicates: true,
  });

  const editor = await prisma.role.upsert({
    where: { name: "Editor" },
    update: {},
    create: {
      name: "Editor",
      description: "Can manage day-to-day records but not roles or settings.",
      isSystem: true,
    },
  });
  const editorPerms = allPermissions.filter(
    (p) => !["roles", "settings"].includes(p.module) || p.action === "view"
  );
  await prisma.rolePermission.deleteMany({ where: { roleId: editor.id } });
  await prisma.rolePermission.createMany({
    data: editorPerms.map((perm) => ({ roleId: editor.id, permissionId: perm.id })),
    skipDuplicates: true,
  });

  const viewer = await prisma.role.upsert({
    where: { name: "Viewer" },
    update: {},
    create: {
      name: "Viewer",
      description: "Read-only access across all modules.",
      isSystem: true,
    },
  });
  const viewerPerms = allPermissions.filter((p) => p.action === "view");
  await prisma.rolePermission.deleteMany({ where: { roleId: viewer.id } });
  await prisma.rolePermission.createMany({
    data: viewerPerms.map((perm) => ({ roleId: viewer.id, permissionId: perm.id })),
    skipDuplicates: true,
  });

  // 3. Initial admin user ---------------------------------------------------
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      "\n⚠️  SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin user creation.\n" +
        "   Set them in .env before running the seed to bootstrap the first login.\n"
    );
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: "System Administrator",
        email,
        passwordHash,
        roleId: superAdmin.id,
        status: "ACTIVE",
        mustChangePassword: true, // force rotation on first login
      },
    });
    console.log(`✅ Admin user created: ${email} (must change password on first login)`);
  }

  // 4. Sample shop data — only inserted if the Category table is empty, so
  // re-running the seed never duplicates or overwrites real store data.
  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    const categories = await Promise.all(
      [
        { name: "Apparel", slug: "apparel", description: "Clothing and accessories." },
        { name: "Electronics", slug: "electronics", description: "Gadgets and devices." },
        { name: "Home & Living", slug: "home-living", description: "Furniture and decor." },
      ].map((c) => prisma.category.create({ data: c }))
    );

    const products = await Promise.all([
      prisma.product.create({
        data: {
          name: "Classic Cotton T-Shirt", slug: "classic-cotton-tshirt", sku: "TS-001",
          price: 19.99, stock: 120, status: "ACTIVE", categoryId: categories[0].id,
          description: "A soft, everyday cotton t-shirt.",
        },
      }),
      prisma.product.create({
        data: {
          name: "Wireless Earbuds", slug: "wireless-earbuds", sku: "EB-002",
          price: 59.99, compareAtPrice: 79.99, stock: 45, status: "ACTIVE", categoryId: categories[1].id,
          description: "Bluetooth earbuds with noise cancellation.",
        },
      }),
      prisma.product.create({
        data: {
          name: "Ceramic Table Lamp", slug: "ceramic-table-lamp", sku: "LP-003",
          price: 34.5, stock: 8, status: "ACTIVE", categoryId: categories[2].id,
          description: "Minimalist ceramic lamp for any room.",
        },
      }),
      prisma.product.create({
        data: { name: "Denim Jacket (Draft)", slug: "denim-jacket-draft", price: 89.0, stock: 0, status: "DRAFT" },
      }),
    ]);

    const customer = await prisma.customer.create({
      data: { name: "Amina Haddad", email: "amina.haddad@example.com", phone: "+213555000111", city: "Oran", country: "Algeria" },
    });

    await prisma.order.create({
      data: {
        orderNumber: "ORD-1001",
        customerId: customer.id,
        status: "PAID",
        subtotal: 79.98,
        shipping: 5.0,
        total: 84.98,
        items: {
          create: [
            { productId: products[0].id, nameSnapshot: products[0].name, priceSnapshot: products[0].price, quantity: 2 },
          ],
        },
      },
    });

    console.log("✅ Sample shop data created: 3 categories, 4 products, 1 customer, 1 order.");
  }

  console.log("✅ Seed complete: permissions, roles seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
