import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import * as bcrypt from "bcrypt";
import { PrismaService } from "@corely/data";

type Args = {
  envFile?: string;
  email?: string;
  password?: string;
};

type DemoUserSeed = {
  id: string;
  displayName: string;
  roleLabel: string;
};

type DemoAuthUserSeed = {
  userId: string;
  email: string;
  displayName: string;
  partyId: string;
  tenantRoleSystemKey: "OWNER" | "ADMIN" | "MEMBER";
  workspaceRole: "OWNER" | "ADMIN" | "MEMBER";
  membershipId: string;
  workspaceMembershipId: string;
};

const DEMO_IDS = {
  tenantId: "demo-tenant-pho-saigon-mitte",
  userId: "demo-user-pho-saigon-mitte-owner",
  legalEntityId: "demo-legal-entity-pho-saigon-mitte",
  workspaceId: "demo-workspace-pho-saigon-mitte",
  ownerRoleId: "demo-role-pho-saigon-mitte-owner",
  adminRoleId: "demo-role-pho-saigon-mitte-admin",
  memberRoleId: "demo-role-pho-saigon-mitte-member",
  tenantMembershipId: "demo-membership-pho-saigon-mitte-owner",
  workspaceMembershipId: "demo-workspace-membership-pho-saigon-mitte-owner",
  roomMainHallId: "demo-restaurant-room-main-hall",
  roomPickupId: "demo-restaurant-room-pickup",
  cashRegisterId: "demo-cash-register-pho-saigon-mitte",
  registerId: "91b5f1f6-88b3-4a97-8c39-55db6dbaf001",
  shiftSessionId: "91b5f1f6-88b3-4a97-8c39-55db6dbaf002",
  table2SessionId: "demo-restaurant-session-table-2",
  table7SessionId: "demo-restaurant-session-table-7",
  table2OrderId: "demo-restaurant-order-table-2",
  table7OrderId: "demo-restaurant-order-table-7",
  approvalDiscountId: "demo-restaurant-approval-discount",
  openingCashEntryId: "demo-cash-entry-opening-float",
  cashEntryCounterId: "demo-cash-entry-counter",
} as const;

const DEMO_USERS: DemoUserSeed[] = [
  {
    id: "91b5f1f6-88b3-4a97-8c39-55db6dbaf101",
    displayName: "Linh Tran",
    roleLabel: "Cashier",
  },
  {
    id: "91b5f1f6-88b3-4a97-8c39-55db6dbaf102",
    displayName: "Minh Nguyen",
    roleLabel: "Server",
  },
  {
    id: "91b5f1f6-88b3-4a97-8c39-55db6dbaf103",
    displayName: "Lan Pham",
    roleLabel: "Server",
  },
  {
    id: "91b5f1f6-88b3-4a97-8c39-55db6dbaf104",
    displayName: "Tuan Le",
    roleLabel: "Kitchen",
  },
  {
    id: "91b5f1f6-88b3-4a97-8c39-55db6dbaf105",
    displayName: "Huong Do",
    roleLabel: "Kitchen",
  },
  {
    id: "91b5f1f6-88b3-4a97-8c39-55db6dbaf106",
    displayName: "Ha Doan",
    roleLabel: "Manager",
  },
];

const TABLE_IDS = {
  table1: "demo-restaurant-table-1",
  table2: "demo-restaurant-table-2",
  table3: "demo-restaurant-table-3",
  table4: "demo-restaurant-table-4",
  table5: "demo-restaurant-table-5",
  table6: "demo-restaurant-table-6",
  table7: "demo-restaurant-table-7",
  table8: "demo-restaurant-table-8",
} as const;

const MODIFIER_GROUP_IDS = {
  prepNotes: "demo-restaurant-modifier-group-prep-notes",
  portionSize: "demo-restaurant-modifier-group-portion-size",
} as const;

const MODIFIER_OPTION_IDS = {
  noCoriander: "demo-restaurant-modifier-option-no-coriander",
  extraChili: "demo-restaurant-modifier-option-extra-chili",
  extraBeef: "demo-restaurant-modifier-option-extra-beef",
  noOnion: "demo-restaurant-modifier-option-no-onion",
  glutenFree: "demo-restaurant-modifier-option-gluten-free-note",
  largePortion: "demo-restaurant-modifier-option-large-portion",
} as const;

const CATALOG_IDS = {
  uomPieces: "demo-catalog-uom-pieces",
  taxProfileFood: "demo-catalog-tax-profile-food",
  categoryStarters: "demo-catalog-category-starters",
  categoryMains: "demo-catalog-category-mains",
  categoryDrinks: "demo-catalog-category-drinks",
  priceListPos: "demo-catalog-price-list-pos",
  freshSpringRollsItem: "demo-catalog-fresh-spring-rolls",
  crispyNemRollsItem: "demo-catalog-crispy-nem-rolls",
  phoBoItem: "demo-catalog-pho-bo",
  phoGaItem: "demo-catalog-pho-ga",
  bunChaItem: "demo-catalog-bun-cha",
  bunBoNamBoItem: "demo-catalog-bun-bo-nam-bo",
  comRangGaItem: "demo-catalog-com-rang-ga",
  vietnameseIcedCoffeeItem: "demo-catalog-vietnamese-iced-coffee",
  jasmineTeaItem: "demo-catalog-jasmine-tea",
  homemadeLemonSodaItem: "demo-catalog-homemade-lemon-soda",
} as const;

const KITCHEN_STATION_IDS = {
  hot: "demo-restaurant-kitchen-station-hot",
  drinks: "demo-restaurant-kitchen-station-drinks",
  pass: "demo-restaurant-kitchen-station-pass",
} as const;

const ORDER_ITEM_IDS = {
  table2PhoGa: "demo-restaurant-order-item-table2-pho-ga",
  table2SpringRolls: "demo-restaurant-order-item-table2-spring-rolls",
  table2Coffee: "demo-restaurant-order-item-table2-coffee",
  table7BunCha: "demo-restaurant-order-item-table7-bun-cha",
  table7LemonSoda: "demo-restaurant-order-item-table7-lemon-soda",
} as const;

const ORDER_ITEM_MODIFIER_IDS = {
  table2PhoGaNoCoriander: "demo-restaurant-order-item-modifier-table2-pho-ga-no-coriander",
  table2PhoGaExtraChili: "demo-restaurant-order-item-modifier-table2-pho-ga-extra-chili",
  table7BunChaExtraBeef: "demo-restaurant-order-item-modifier-table7-bun-cha-extra-beef",
} as const;

const KITCHEN_TICKET_IDS = {
  table2Hot: "demo-restaurant-ticket-table2-hot",
  table2Drinks: "demo-restaurant-ticket-table2-drinks",
  table7Hot: "demo-restaurant-ticket-table7-hot",
} as const;

const KITCHEN_TICKET_ITEM_IDS = {
  table2HotPhoGa: "demo-restaurant-ticket-item-table2-hot-pho-ga",
  table2HotSpringRolls: "demo-restaurant-ticket-item-table2-hot-spring-rolls",
  table2DrinksCoffee: "demo-restaurant-ticket-item-table2-drinks-coffee",
  table7HotBunCha: "demo-restaurant-ticket-item-table7-hot-bun-cha",
} as const;

const TENANT_SLUG = "pho-saigon-mitte-demo";
const WORKSPACE_SLUG = "pho-saigon-mitte";
const WORKSPACE_NAME = "Pho Saigon Mitte";
const TENANT_NAME = "Pho Saigon Mitte Demo";
const DEFAULT_EMAIL = "demo.restaurant@corely.one";
const DEFAULT_PASSWORD = "Password123!";
const APP_IDS = [
  "core",
  "workspaces",
  "cash-management",
  "restaurant",
  "pos-admin",
  "catalog",
] as const;
const DEMO_ROLE_PERMISSION_KEYS = [
  "cash.read",
  "cash.write",
  "cash.close",
  "cash.export",
  "pos.registers.read",
  "pos.registers.manage",
  "pos.transactions.read",
  "catalog.read",
  "catalog.quickwrite",
] as const;
const OPENING_FLOAT_CENTS = 20_000;

type DemoCatalogItemSeed = {
  id: string;
  variantId: string;
  priceId: string;
  code: string;
  name: string;
  description: string;
  sku: string;
  categoryId: string;
  amountCents: number;
  barcode: string;
};

const DEMO_CATALOG_ITEMS: DemoCatalogItemSeed[] = [
  {
    id: CATALOG_IDS.freshSpringRollsItem,
    variantId: "demo-catalog-variant-fresh-spring-rolls",
    priceId: "demo-catalog-price-fresh-spring-rolls",
    code: "FRESH-SPRING-ROLLS",
    name: "Fresh Spring Rolls",
    description: "Rice paper rolls with herbs, vermicelli, and nuoc cham.",
    sku: "FRESH-SPRING-ROLLS",
    categoryId: CATALOG_IDS.categoryStarters,
    amountCents: 750,
    barcode: "2000000000011",
  },
  {
    id: CATALOG_IDS.crispyNemRollsItem,
    variantId: "demo-catalog-variant-crispy-nem-rolls",
    priceId: "demo-catalog-price-crispy-nem-rolls",
    code: "CRISPY-NEM-ROLLS",
    name: "Crispy Nem Rolls",
    description: "Golden fried Vietnamese spring rolls with dipping sauce.",
    sku: "CRISPY-NEM-ROLLS",
    categoryId: CATALOG_IDS.categoryStarters,
    amountCents: 790,
    barcode: "2000000000028",
  },
  {
    id: CATALOG_IDS.phoBoItem,
    variantId: "demo-catalog-variant-pho-bo",
    priceId: "demo-catalog-price-pho-bo",
    code: "PHO-BO",
    name: "Pho Bo",
    description: "Beef pho with rice noodles, broth, and fresh herbs.",
    sku: "PHO-BO",
    categoryId: CATALOG_IDS.categoryMains,
    amountCents: 1490,
    barcode: "2000000000035",
  },
  {
    id: CATALOG_IDS.phoGaItem,
    variantId: "demo-catalog-variant-pho-ga",
    priceId: "demo-catalog-price-pho-ga",
    code: "PHO-GA",
    name: "Pho Ga",
    description: "Chicken pho with aromatic broth and rice noodles.",
    sku: "PHO-GA",
    categoryId: CATALOG_IDS.categoryMains,
    amountCents: 1400,
    barcode: "2000000000042",
  },
  {
    id: CATALOG_IDS.bunChaItem,
    variantId: "demo-catalog-variant-bun-cha",
    priceId: "demo-catalog-price-bun-cha",
    code: "BUN-CHA",
    name: "Bun Cha",
    description: "Grilled pork patties with noodles, herbs, and dipping broth.",
    sku: "BUN-CHA",
    categoryId: CATALOG_IDS.categoryMains,
    amountCents: 1450,
    barcode: "2000000000059",
  },
  {
    id: CATALOG_IDS.bunBoNamBoItem,
    variantId: "demo-catalog-variant-bun-bo-nam-bo",
    priceId: "demo-catalog-price-bun-bo-nam-bo",
    code: "BUN-BO-NAM-BO",
    name: "Bun Bo Nam Bo",
    description: "Warm vermicelli bowl with beef, herbs, and roasted peanuts.",
    sku: "BUN-BO-NAM-BO",
    categoryId: CATALOG_IDS.categoryMains,
    amountCents: 1520,
    barcode: "2000000000066",
  },
  {
    id: CATALOG_IDS.comRangGaItem,
    variantId: "demo-catalog-variant-com-rang-ga",
    priceId: "demo-catalog-price-com-rang-ga",
    code: "COM-RANG-GA",
    name: "Com Rang Ga",
    description: "Vietnamese chicken fried rice with scallion and pickles.",
    sku: "COM-RANG-GA",
    categoryId: CATALOG_IDS.categoryMains,
    amountCents: 1350,
    barcode: "2000000000073",
  },
  {
    id: CATALOG_IDS.vietnameseIcedCoffeeItem,
    variantId: "demo-catalog-variant-vietnamese-iced-coffee",
    priceId: "demo-catalog-price-vietnamese-iced-coffee",
    code: "VIETNAMESE-ICED-COFFEE",
    name: "Vietnamese Iced Coffee",
    description: "Dark roast coffee with condensed milk over ice.",
    sku: "VIETNAMESE-ICED-COFFEE",
    categoryId: CATALOG_IDS.categoryDrinks,
    amountCents: 500,
    barcode: "2000000000080",
  },
  {
    id: CATALOG_IDS.jasmineTeaItem,
    variantId: "demo-catalog-variant-jasmine-tea",
    priceId: "demo-catalog-price-jasmine-tea",
    code: "JASMINE-TEA",
    name: "Jasmine Tea",
    description: "Hot jasmine tea served in a small pot.",
    sku: "JASMINE-TEA",
    categoryId: CATALOG_IDS.categoryDrinks,
    amountCents: 350,
    barcode: "2000000000097",
  },
  {
    id: CATALOG_IDS.homemadeLemonSodaItem,
    variantId: "demo-catalog-variant-homemade-lemon-soda",
    priceId: "demo-catalog-price-homemade-lemon-soda",
    code: "HOMEMADE-LEMON-SODA",
    name: "Homemade Lemon Soda",
    description: "Fresh lemon soda with mint and crushed ice.",
    sku: "HOMEMADE-LEMON-SODA",
    categoryId: CATALOG_IDS.categoryDrinks,
    amountCents: 650,
    barcode: "2000000000103",
  },
];

function findRepoRoot(start: string): string | null {
  let current = start;

  while (true) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function parseArgs(argv: string[]): Args {
  const parsed: Args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--env-file") {
      parsed.envFile = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--email") {
      parsed.email = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--password") {
      parsed.password = argv[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return parsed;
}

function loadEnvFile(args: Args): void {
  const repoRoot = findRepoRoot(process.cwd());

  if (args.envFile) {
    const resolved = path.isAbsolute(args.envFile)
      ? args.envFile
      : path.resolve(repoRoot ?? process.cwd(), args.envFile);
    dotenv.config({ path: resolved });
    return;
  }

  if (repoRoot) {
    dotenv.config({ path: path.join(repoRoot, ".env") });
    return;
  }

  dotenv.config();
}

function getDemoCredentials(args: Args) {
  return {
    ownerEmail:
      args.email?.trim() || process.env.CORELY_RESTAURANT_DEMO_EMAIL?.trim() || DEFAULT_EMAIL,
    sharedPassword:
      args.password?.trim() ||
      process.env.CORELY_RESTAURANT_DEMO_PASSWORD?.trim() ||
      DEFAULT_PASSWORD,
  };
}

function getNow(): Date {
  return new Date();
}

function buildDemoAuthUsers(ownerEmail: string): DemoAuthUserSeed[] {
  const cashierPartyId = DEMO_USERS.find((entry) => entry.roleLabel === "Cashier")!.id;
  const firstServerPartyId = DEMO_USERS.find((entry) => entry.displayName === "Minh Nguyen")!.id;
  const secondServerPartyId = DEMO_USERS.find((entry) => entry.displayName === "Lan Pham")!.id;
  const firstKitchenPartyId = DEMO_USERS.find((entry) => entry.displayName === "Tuan Le")!.id;
  const secondKitchenPartyId = DEMO_USERS.find((entry) => entry.displayName === "Huong Do")!.id;
  const managerPartyId = DEMO_USERS.find((entry) => entry.roleLabel === "Manager")!.id;

  return [
    {
      userId: DEMO_IDS.userId,
      email: ownerEmail,
      displayName: "Pho Saigon Mitte Demo",
      partyId: managerPartyId,
      tenantRoleSystemKey: "OWNER",
      workspaceRole: "OWNER",
      membershipId: DEMO_IDS.tenantMembershipId,
      workspaceMembershipId: DEMO_IDS.workspaceMembershipId,
    },
    {
      userId: "demo-user-pho-saigon-mitte-cashier-linh",
      email: "cashier.linh@corely.one",
      displayName: "Linh Tran",
      partyId: cashierPartyId,
      tenantRoleSystemKey: "ADMIN",
      workspaceRole: "ADMIN",
      membershipId: "demo-membership-pho-saigon-mitte-cashier-linh",
      workspaceMembershipId: "demo-workspace-membership-pho-saigon-mitte-cashier-linh",
    },
    {
      userId: "demo-user-pho-saigon-mitte-server-minh",
      email: "server.minh@corely.one",
      displayName: "Minh Nguyen",
      partyId: firstServerPartyId,
      tenantRoleSystemKey: "MEMBER",
      workspaceRole: "MEMBER",
      membershipId: "demo-membership-pho-saigon-mitte-server-minh",
      workspaceMembershipId: "demo-workspace-membership-pho-saigon-mitte-server-minh",
    },
    {
      userId: "demo-user-pho-saigon-mitte-server-lan",
      email: "server.lan@corely.one",
      displayName: "Lan Pham",
      partyId: secondServerPartyId,
      tenantRoleSystemKey: "MEMBER",
      workspaceRole: "MEMBER",
      membershipId: "demo-membership-pho-saigon-mitte-server-lan",
      workspaceMembershipId: "demo-workspace-membership-pho-saigon-mitte-server-lan",
    },
    {
      userId: "demo-user-pho-saigon-mitte-kitchen-tuan",
      email: "kitchen.tuan@corely.one",
      displayName: "Tuan Le",
      partyId: firstKitchenPartyId,
      tenantRoleSystemKey: "MEMBER",
      workspaceRole: "MEMBER",
      membershipId: "demo-membership-pho-saigon-mitte-kitchen-tuan",
      workspaceMembershipId: "demo-workspace-membership-pho-saigon-mitte-kitchen-tuan",
    },
    {
      userId: "demo-user-pho-saigon-mitte-kitchen-huong",
      email: "kitchen.huong@corely.one",
      displayName: "Huong Do",
      partyId: secondKitchenPartyId,
      tenantRoleSystemKey: "MEMBER",
      workspaceRole: "MEMBER",
      membershipId: "demo-membership-pho-saigon-mitte-kitchen-huong",
      workspaceMembershipId: "demo-workspace-membership-pho-saigon-mitte-kitchen-huong",
    },
    {
      userId: "demo-user-pho-saigon-mitte-manager-ha",
      email: "manager.ha@corely.one",
      displayName: "Ha Doan",
      partyId: managerPartyId,
      tenantRoleSystemKey: "ADMIN",
      workspaceRole: "ADMIN",
      membershipId: "demo-membership-pho-saigon-mitte-manager-ha",
      workspaceMembershipId: "demo-workspace-membership-pho-saigon-mitte-manager-ha",
    },
  ];
}

async function ensureTenantUserWorkspace(
  prisma: PrismaService,
  ownerEmail: string,
  sharedPassword: string
) {
  const passwordHash = await bcrypt.hash(sharedPassword, 10);
  const demoAuthUsers = buildDemoAuthUsers(ownerEmail);
  const existingTenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ id: DEMO_IDS.tenantId }, { slug: TENANT_SLUG }],
    },
    select: { id: true },
  });
  const tenantId = existingTenant?.id ?? DEMO_IDS.tenantId;

  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {
      name: TENANT_NAME,
      slug: TENANT_SLUG,
      status: "ACTIVE",
      timeZone: "Europe/Berlin",
    },
    create: {
      id: tenantId,
      name: TENANT_NAME,
      slug: TENANT_SLUG,
      status: "ACTIVE",
      timeZone: "Europe/Berlin",
    },
  });

  const ownerRole = await prisma.role.upsert({
    where: {
      tenantId_systemKey: {
        tenantId,
        systemKey: "OWNER",
      },
    },
    update: {
      name: "Owner",
      scope: "TENANT",
      isSystem: true,
    },
    create: {
      id: DEMO_IDS.ownerRoleId,
      tenantId,
      name: "Owner",
      scope: "TENANT",
      systemKey: "OWNER",
      isSystem: true,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: {
      tenantId_systemKey: {
        tenantId,
        systemKey: "ADMIN",
      },
    },
    update: {
      name: "Admin",
      scope: "TENANT",
      isSystem: true,
    },
    create: {
      id: DEMO_IDS.adminRoleId,
      tenantId,
      name: "Admin",
      scope: "TENANT",
      systemKey: "ADMIN",
      isSystem: true,
    },
  });

  const memberRole = await prisma.role.upsert({
    where: {
      tenantId_systemKey: {
        tenantId,
        systemKey: "MEMBER",
      },
    },
    update: {
      name: "Member",
      scope: "TENANT",
      isSystem: true,
    },
    create: {
      id: DEMO_IDS.memberRoleId,
      tenantId,
      name: "Member",
      scope: "TENANT",
      systemKey: "MEMBER",
      isSystem: true,
    },
  });

  const roleBySystemKey = {
    OWNER: ownerRole.id,
    ADMIN: adminRole.id,
    MEMBER: memberRole.id,
  } as const;

  for (const demoUser of demoAuthUsers) {
    await prisma.user.upsert({
      where: { id: demoUser.userId },
      update: {
        email: demoUser.email,
        name: demoUser.displayName,
        passwordHash,
        status: "ACTIVE",
        partyId: demoUser.partyId,
      },
      create: {
        id: demoUser.userId,
        email: demoUser.email,
        name: demoUser.displayName,
        passwordHash,
        status: "ACTIVE",
        partyId: demoUser.partyId,
      },
    });

    await prisma.membership.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId: demoUser.userId,
        },
      },
      update: {
        roleId: roleBySystemKey[demoUser.tenantRoleSystemKey],
      },
      create: {
        id: demoUser.membershipId,
        tenantId,
        userId: demoUser.userId,
        roleId: roleBySystemKey[demoUser.tenantRoleSystemKey],
      },
    });
  }

  if (DEMO_ROLE_PERMISSION_KEYS.length > 0) {
    await prisma.rolePermissionGrant.createMany({
      data: Object.values(roleBySystemKey).flatMap((roleId) =>
        DEMO_ROLE_PERMISSION_KEYS.map((permissionKey) => ({
          id: randomUUID(),
          tenantId,
          roleId,
          permissionKey,
          effect: "ALLOW" as const,
          createdBy: DEMO_IDS.userId,
        }))
      ),
      skipDuplicates: true,
    });
  }

  await prisma.legalEntity.upsert({
    where: { id: DEMO_IDS.legalEntityId },
    update: {
      tenantId,
      kind: "COMPANY",
      legalName: WORKSPACE_NAME,
      countryCode: "DE",
      currency: "EUR",
      taxId: "DEMO-PHO-SAIGON-MITTE",
      phone: "+49 30 12345678",
      website: "https://pos.corely.one",
      address: {
        line1: "Rosenthaler Str. 12",
        city: "Berlin",
        postalCode: "10119",
        countryCode: "DE",
      },
    },
    create: {
      id: DEMO_IDS.legalEntityId,
      tenantId,
      kind: "COMPANY",
      legalName: WORKSPACE_NAME,
      countryCode: "DE",
      currency: "EUR",
      taxId: "DEMO-PHO-SAIGON-MITTE",
      phone: "+49 30 12345678",
      website: "https://pos.corely.one",
      address: {
        line1: "Rosenthaler Str. 12",
        city: "Berlin",
        postalCode: "10119",
        countryCode: "DE",
      },
    },
  });

  await (prisma.workspace as any).upsert({
    where: { id: DEMO_IDS.workspaceId },
    update: {
      tenantId,
      legalEntityId: DEMO_IDS.legalEntityId,
      name: WORKSPACE_NAME,
      slug: WORKSPACE_SLUG,
      verticalId: "restaurant",
      onboardingStatus: "DONE",
      onboardingCompletedAt: getNow(),
      deletedAt: null,
    },
    create: {
      id: DEMO_IDS.workspaceId,
      tenantId,
      legalEntityId: DEMO_IDS.legalEntityId,
      name: WORKSPACE_NAME,
      slug: WORKSPACE_SLUG,
      verticalId: "restaurant",
      onboardingStatus: "DONE",
      onboardingCompletedAt: getNow(),
      publicEnabled: false,
    },
  });

  for (const demoUser of demoAuthUsers) {
    await prisma.workspaceMembership.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: DEMO_IDS.workspaceId,
          userId: demoUser.userId,
        },
      },
      update: {
        role: demoUser.workspaceRole,
        status: "ACTIVE",
      },
      create: {
        id: demoUser.workspaceMembershipId,
        workspaceId: DEMO_IDS.workspaceId,
        userId: demoUser.userId,
        role: demoUser.workspaceRole,
        status: "ACTIVE",
      },
    });
  }

  return { tenantId, userId: DEMO_IDS.userId, demoAuthUsers };
}

async function seedEntitlements(prisma: PrismaService, tenantId: string, userId: string) {
  for (const appId of APP_IDS) {
    await prisma.tenantAppInstall.upsert({
      where: {
        tenantId_appId: {
          tenantId,
          appId,
        },
      },
      update: {
        enabled: true,
        installedVersion: "1.0.0",
        enabledAt: getNow(),
        enabledByUserId: userId,
        disabledAt: null,
        disabledByUserId: null,
      },
      create: {
        id: `demo-app-install-${appId}`,
        tenantId,
        appId,
        enabled: true,
        installedVersion: "1.0.0",
        enabledAt: getNow(),
        enabledByUserId: userId,
      },
    });

    await prisma.tenantFeatureOverride.upsert({
      where: {
        tenantId_featureKey: {
          tenantId,
          featureKey: `app.${appId}.enabled`,
        },
      },
      update: {
        valueJson: JSON.stringify(true),
        updatedBy: userId,
      },
      create: {
        id: `demo-feature-${appId}`,
        tenantId,
        featureKey: `app.${appId}.enabled`,
        valueJson: JSON.stringify(true),
        updatedBy: userId,
      },
    });
  }
}

async function seedStaff(prisma: PrismaService, tenantId: string) {
  for (const staff of DEMO_USERS) {
    await prisma.party.upsert({
      where: { id: staff.id },
      update: {
        tenantId,
        displayName: staff.displayName,
        kind: "INDIVIDUAL",
        lifecycleStatus: "ACTIVE",
        jobTitle: staff.roleLabel,
      },
      create: {
        id: staff.id,
        tenantId,
        displayName: staff.displayName,
        kind: "INDIVIDUAL",
        lifecycleStatus: "ACTIVE",
        jobTitle: staff.roleLabel,
      },
    });

    await prisma.partyRole.upsert({
      where: {
        tenantId_partyId_role: {
          tenantId,
          partyId: staff.id,
          role: "EMPLOYEE",
        },
      },
      update: {},
      create: {
        id: `demo-party-role-${staff.id}`,
        tenantId,
        partyId: staff.id,
        role: "EMPLOYEE",
      },
    });
  }
}

async function seedCash(prisma: PrismaService, tenantId: string, userId: string) {
  const cashierPartyId = DEMO_USERS.find((entry) => entry.roleLabel === "Cashier")!.id;
  const openedAt = new Date(Date.now() - 2 * 60 * 60 * 1000);

  await prisma.cashRegister.upsert({
    where: { id: DEMO_IDS.cashRegisterId },
    update: {
      tenantId,
      workspaceId: DEMO_IDS.workspaceId,
      name: "Front Counter Register",
      location: "Dining Room",
      currency: "EUR",
      currentBalanceCents: OPENING_FLOAT_CENTS,
    },
    create: {
      id: DEMO_IDS.cashRegisterId,
      tenantId,
      workspaceId: DEMO_IDS.workspaceId,
      name: "Front Counter Register",
      location: "Dining Room",
      currency: "EUR",
      currentBalanceCents: OPENING_FLOAT_CENTS,
    },
  });

  await prisma.cashEntryCounter.upsert({
    where: { registerId: DEMO_IDS.cashRegisterId },
    update: {
      tenantId,
      workspaceId: DEMO_IDS.workspaceId,
      lastEntryNo: 1,
    },
    create: {
      id: DEMO_IDS.cashEntryCounterId,
      tenantId,
      workspaceId: DEMO_IDS.workspaceId,
      registerId: DEMO_IDS.cashRegisterId,
      lastEntryNo: 1,
    },
  });

  await prisma.cashEntry.upsert({
    where: { id: DEMO_IDS.openingCashEntryId },
    update: {
      tenantId,
      workspaceId: DEMO_IDS.workspaceId,
      registerId: DEMO_IDS.cashRegisterId,
      entryNo: 1,
      direction: "IN",
      entryType: "OPENING_FLOAT",
      source: "SHIFT_OPEN",
      paymentMethod: "CASH",
      amountCents: OPENING_FLOAT_CENTS,
      grossAmountCents: OPENING_FLOAT_CENTS,
      description: "Opening float for Friday evening shift",
      occurredAt: openedAt,
      dayKey: openedAt.toISOString().slice(0, 10),
      balanceAfterCents: OPENING_FLOAT_CENTS,
      type: "FLOAT",
      sourceType: "SHIFT",
      businessDate: openedAt.toISOString().slice(0, 10),
      createdByUserId: userId,
    },
    create: {
      id: DEMO_IDS.openingCashEntryId,
      tenantId,
      workspaceId: DEMO_IDS.workspaceId,
      registerId: DEMO_IDS.cashRegisterId,
      entryNo: 1,
      direction: "IN",
      entryType: "OPENING_FLOAT",
      source: "SHIFT_OPEN",
      paymentMethod: "CASH",
      amountCents: OPENING_FLOAT_CENTS,
      grossAmountCents: OPENING_FLOAT_CENTS,
      description: "Opening float for Friday evening shift",
      occurredAt: openedAt,
      dayKey: openedAt.toISOString().slice(0, 10),
      balanceAfterCents: OPENING_FLOAT_CENTS,
      type: "FLOAT",
      sourceType: "SHIFT",
      businessDate: openedAt.toISOString().slice(0, 10),
      createdByUserId: userId,
    },
  });

  await prisma.register.upsert({
    where: { id: DEMO_IDS.registerId },
    update: {
      workspaceId: DEMO_IDS.workspaceId,
      cashDrawerId: DEMO_IDS.cashRegisterId,
      name: "POS Front Counter",
      status: "ACTIVE",
    },
    create: {
      id: DEMO_IDS.registerId,
      workspaceId: DEMO_IDS.workspaceId,
      cashDrawerId: DEMO_IDS.cashRegisterId,
      name: "POS Front Counter",
      status: "ACTIVE",
    },
  });

  await prisma.shiftSession.upsert({
    where: { id: DEMO_IDS.shiftSessionId },
    update: {
      workspaceId: DEMO_IDS.workspaceId,
      registerId: DEMO_IDS.registerId,
      openedByEmployeePartyId: cashierPartyId,
      openedAt,
      startingCashCents: OPENING_FLOAT_CENTS,
      status: "OPEN",
      closedAt: null,
      closedByEmployeePartyId: null,
      closingCashCents: null,
      totalSalesCents: 0,
      totalCashReceivedCents: 0,
      varianceCents: null,
      notes: "Restaurant demo shift",
    },
    create: {
      id: DEMO_IDS.shiftSessionId,
      workspaceId: DEMO_IDS.workspaceId,
      registerId: DEMO_IDS.registerId,
      openedByEmployeePartyId: cashierPartyId,
      openedAt,
      startingCashCents: OPENING_FLOAT_CENTS,
      status: "OPEN",
      notes: "Restaurant demo shift",
    },
  });
}

async function seedCatalog(prisma: PrismaService, tenantId: string) {
  await prisma.catalogUom.upsert({
    where: { id: CATALOG_IDS.uomPieces },
    update: {
      tenantId,
      workspaceId: DEMO_IDS.workspaceId,
      code: "PCS",
      name: "Pieces",
      baseCode: null,
      factor: null,
      rounding: null,
    },
    create: {
      id: CATALOG_IDS.uomPieces,
      tenantId,
      workspaceId: DEMO_IDS.workspaceId,
      code: "PCS",
      name: "Pieces",
    },
  });

  await prisma.catalogTaxProfile.upsert({
    where: { id: CATALOG_IDS.taxProfileFood },
    update: {
      tenantId,
      workspaceId: DEMO_IDS.workspaceId,
      name: "Restaurant VAT 7%",
      vatRateBps: 700,
      isExciseApplicable: false,
      exciseType: null,
      exciseValue: null,
      effectiveFrom: null,
      effectiveTo: null,
      archivedAt: null,
    },
    create: {
      id: CATALOG_IDS.taxProfileFood,
      tenantId,
      workspaceId: DEMO_IDS.workspaceId,
      name: "Restaurant VAT 7%",
      vatRateBps: 700,
      isExciseApplicable: false,
    },
  });

  const categories = [
    { id: CATALOG_IDS.categoryStarters, name: "Starters" },
    { id: CATALOG_IDS.categoryMains, name: "Main Dishes" },
    { id: CATALOG_IDS.categoryDrinks, name: "Drinks" },
  ] as const;

  for (const category of categories) {
    await prisma.catalogCategory.upsert({
      where: { id: category.id },
      update: {
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        name: category.name,
        parentId: null,
        archivedAt: null,
      },
      create: {
        id: category.id,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        name: category.name,
      },
    });
  }

  await prisma.catalogPriceList.upsert({
    where: { id: CATALOG_IDS.priceListPos },
    update: {
      tenantId,
      workspaceId: DEMO_IDS.workspaceId,
      name: "Restaurant POS",
      currency: "EUR",
      status: "ACTIVE",
      archivedAt: null,
    },
    create: {
      id: CATALOG_IDS.priceListPos,
      tenantId,
      workspaceId: DEMO_IDS.workspaceId,
      name: "Restaurant POS",
      currency: "EUR",
      status: "ACTIVE",
    },
  });

  for (const item of DEMO_CATALOG_ITEMS) {
    await prisma.catalogItem.upsert({
      where: { id: item.id },
      update: {
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        code: item.code,
        name: item.name,
        description: item.description,
        status: "ACTIVE",
        type: "PRODUCT",
        defaultUomId: CATALOG_IDS.uomPieces,
        taxProfileId: CATALOG_IDS.taxProfileFood,
        shelfLifeDays: null,
        requiresLotTracking: false,
        requiresExpiryDate: false,
        hsCode: null,
        metadata: {
          demoBusiness: WORKSPACE_NAME,
          verticalId: "restaurant",
          demoMenuCategory: item.code.split("-")[0],
        },
        archivedAt: null,
      },
      create: {
        id: item.id,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        code: item.code,
        name: item.name,
        description: item.description,
        status: "ACTIVE",
        type: "PRODUCT",
        defaultUomId: CATALOG_IDS.uomPieces,
        taxProfileId: CATALOG_IDS.taxProfileFood,
        requiresLotTracking: false,
        requiresExpiryDate: false,
        metadata: {
          demoBusiness: WORKSPACE_NAME,
          verticalId: "restaurant",
          demoMenuCategory: item.code.split("-")[0],
        },
      },
    });

    await prisma.catalogItemCategory.deleteMany({
      where: { itemId: item.id },
    });
    await prisma.catalogItemCategory.create({
      data: {
        itemId: item.id,
        categoryId: item.categoryId,
      },
    });

    await prisma.catalogVariant.upsert({
      where: { id: item.variantId },
      update: {
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        attributes: null,
        status: "ACTIVE",
        archivedAt: null,
      },
      create: {
        id: item.variantId,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        status: "ACTIVE",
      },
    });

    await prisma.catalogVariantBarcode.deleteMany({
      where: { tenantId, workspaceId: DEMO_IDS.workspaceId, variantId: item.variantId },
    });
    await prisma.catalogVariantBarcode.create({
      data: {
        id: `${item.variantId}-barcode`,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        variantId: item.variantId,
        barcode: item.barcode,
      },
    });

    await prisma.catalogPrice.upsert({
      where: { id: item.priceId },
      update: {
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        priceListId: CATALOG_IDS.priceListPos,
        itemId: item.id,
        variantId: item.variantId,
        amount: item.amountCents / 100,
        taxIncluded: true,
        effectiveFrom: null,
        effectiveTo: null,
      },
      create: {
        id: item.priceId,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        priceListId: CATALOG_IDS.priceListPos,
        itemId: item.id,
        variantId: item.variantId,
        amount: item.amountCents / 100,
        taxIncluded: true,
      },
    });
  }
}

async function seedRestaurant(prisma: PrismaService, tenantId: string, userId: string) {
  const table2OpenedAt = new Date(Date.now() - 50 * 60 * 1000);
  const table7OpenedAt = new Date(Date.now() - 25 * 60 * 1000);
  const table2SentAt = new Date(Date.now() - 32 * 60 * 1000);
  const table2DrinksSentAt = new Date(Date.now() - 30 * 60 * 1000);
  const table7SentAt = new Date(Date.now() - 18 * 60 * 1000);

  await prisma.diningRoom.upsert({
    where: { id: DEMO_IDS.roomMainHallId },
    update: {
      tenantId,
      workspaceId: DEMO_IDS.workspaceId,
      name: "Main Hall",
      sortOrder: 0,
    },
    create: {
      id: DEMO_IDS.roomMainHallId,
      tenantId,
      workspaceId: DEMO_IDS.workspaceId,
      name: "Main Hall",
      sortOrder: 0,
    },
  });

  await prisma.diningRoom.upsert({
    where: { id: DEMO_IDS.roomPickupId },
    update: {
      tenantId,
      workspaceId: DEMO_IDS.workspaceId,
      name: "Pickup Counter",
      sortOrder: 1,
    },
    create: {
      id: DEMO_IDS.roomPickupId,
      tenantId,
      workspaceId: DEMO_IDS.workspaceId,
      name: "Pickup Counter",
      sortOrder: 1,
    },
  });

  const tables = [
    {
      id: TABLE_IDS.table1,
      diningRoomId: DEMO_IDS.roomMainHallId,
      name: "Table 1",
      capacity: 2,
      posX: 1,
      posY: 1,
      shape: "ROUND" as const,
      availabilityStatus: "AVAILABLE" as const,
    },
    {
      id: TABLE_IDS.table2,
      diningRoomId: DEMO_IDS.roomMainHallId,
      name: "Table 2",
      capacity: 2,
      posX: 2,
      posY: 1,
      shape: "ROUND" as const,
      availabilityStatus: "OCCUPIED" as const,
    },
    {
      id: TABLE_IDS.table3,
      diningRoomId: DEMO_IDS.roomMainHallId,
      name: "Table 3",
      capacity: 4,
      posX: 3,
      posY: 1,
      shape: "RECTANGLE" as const,
      availabilityStatus: "AVAILABLE" as const,
    },
    {
      id: TABLE_IDS.table4,
      diningRoomId: DEMO_IDS.roomMainHallId,
      name: "Table 4",
      capacity: 4,
      posX: 4,
      posY: 1,
      shape: "RECTANGLE" as const,
      availabilityStatus: "AVAILABLE" as const,
    },
    {
      id: TABLE_IDS.table5,
      diningRoomId: DEMO_IDS.roomMainHallId,
      name: "Table 5",
      capacity: 4,
      posX: 2,
      posY: 2,
      shape: "RECTANGLE" as const,
      availabilityStatus: "AVAILABLE" as const,
    },
    {
      id: TABLE_IDS.table6,
      diningRoomId: DEMO_IDS.roomMainHallId,
      name: "Table 6",
      capacity: 4,
      posX: 3,
      posY: 2,
      shape: "RECTANGLE" as const,
      availabilityStatus: "AVAILABLE" as const,
    },
    {
      id: TABLE_IDS.table7,
      diningRoomId: DEMO_IDS.roomPickupId,
      name: "Table 7",
      capacity: 6,
      posX: 1,
      posY: 1,
      shape: "SQUARE" as const,
      availabilityStatus: "OCCUPIED" as const,
    },
    {
      id: TABLE_IDS.table8,
      diningRoomId: DEMO_IDS.roomMainHallId,
      name: "Table 8",
      capacity: 6,
      posX: 4,
      posY: 2,
      shape: "RECTANGLE" as const,
      availabilityStatus: "AVAILABLE" as const,
    },
  ];

  for (const table of tables) {
    await prisma.restaurantTable.upsert({
      where: { id: table.id },
      update: {
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        diningRoomId: table.diningRoomId,
        name: table.name,
        capacity: table.capacity,
        posX: table.posX,
        posY: table.posY,
        shape: table.shape,
        availabilityStatus: table.availabilityStatus,
      },
      create: {
        id: table.id,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        diningRoomId: table.diningRoomId,
        name: table.name,
        capacity: table.capacity,
        posX: table.posX,
        posY: table.posY,
        shape: table.shape,
        availabilityStatus: table.availabilityStatus,
      },
    });
  }

  const modifierGroups = [
    {
      id: MODIFIER_GROUP_IDS.prepNotes,
      name: "Prep Notes",
      selectionMode: "MULTI" as const,
      isRequired: false,
      sortOrder: 0,
      linkedCatalogItemIds: [
        CATALOG_IDS.freshSpringRollsItem,
        CATALOG_IDS.crispyNemRollsItem,
        CATALOG_IDS.phoBoItem,
        CATALOG_IDS.phoGaItem,
        CATALOG_IDS.bunChaItem,
        CATALOG_IDS.bunBoNamBoItem,
        CATALOG_IDS.comRangGaItem,
      ],
      options: [
        {
          id: MODIFIER_OPTION_IDS.noCoriander,
          name: "no coriander",
          priceDeltaCents: 0,
          sortOrder: 0,
        },
        {
          id: MODIFIER_OPTION_IDS.extraChili,
          name: "extra chili",
          priceDeltaCents: 0,
          sortOrder: 1,
        },
        {
          id: MODIFIER_OPTION_IDS.extraBeef,
          name: "extra beef",
          priceDeltaCents: 250,
          sortOrder: 2,
        },
        { id: MODIFIER_OPTION_IDS.noOnion, name: "no onion", priceDeltaCents: 0, sortOrder: 3 },
        {
          id: MODIFIER_OPTION_IDS.glutenFree,
          name: "gluten-free note",
          priceDeltaCents: 0,
          sortOrder: 4,
        },
      ],
    },
    {
      id: MODIFIER_GROUP_IDS.portionSize,
      name: "Portion Size",
      selectionMode: "SINGLE" as const,
      isRequired: false,
      sortOrder: 1,
      linkedCatalogItemIds: [
        CATALOG_IDS.phoBoItem,
        CATALOG_IDS.phoGaItem,
        CATALOG_IDS.bunBoNamBoItem,
      ],
      options: [
        {
          id: MODIFIER_OPTION_IDS.largePortion,
          name: "large portion",
          priceDeltaCents: 300,
          sortOrder: 0,
        },
      ],
    },
  ];

  for (const group of modifierGroups) {
    await prisma.restaurantModifierGroup.upsert({
      where: { id: group.id },
      update: {
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        name: group.name,
        selectionMode: group.selectionMode,
        isRequired: group.isRequired,
        sortOrder: group.sortOrder,
      },
      create: {
        id: group.id,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        name: group.name,
        selectionMode: group.selectionMode,
        isRequired: group.isRequired,
        sortOrder: group.sortOrder,
      },
    });

    await prisma.restaurantMenuItemModifierGroup.deleteMany({
      where: { tenantId, workspaceId: DEMO_IDS.workspaceId, modifierGroupId: group.id },
    });

    if (group.linkedCatalogItemIds.length > 0) {
      await prisma.restaurantMenuItemModifierGroup.createMany({
        data: group.linkedCatalogItemIds.map((catalogItemId, index) => ({
          tenantId,
          workspaceId: DEMO_IDS.workspaceId,
          catalogItemId,
          modifierGroupId: group.id,
          sortOrder: index,
        })),
      });
    }

    for (const option of group.options) {
      await prisma.restaurantModifierOption.upsert({
        where: { id: option.id },
        update: {
          tenantId,
          workspaceId: DEMO_IDS.workspaceId,
          modifierGroupId: group.id,
          name: option.name,
          priceDeltaCents: option.priceDeltaCents,
          sortOrder: option.sortOrder,
        },
        create: {
          id: option.id,
          tenantId,
          workspaceId: DEMO_IDS.workspaceId,
          modifierGroupId: group.id,
          name: option.name,
          priceDeltaCents: option.priceDeltaCents,
          sortOrder: option.sortOrder,
        },
      });
    }
  }

  const kitchenStations = [
    { id: KITCHEN_STATION_IDS.hot, name: "Hot Line", code: "HOT" },
    { id: KITCHEN_STATION_IDS.drinks, name: "Drinks", code: "DRINKS" },
    { id: KITCHEN_STATION_IDS.pass, name: "Pass", code: "PASS" },
  ];

  for (const station of kitchenStations) {
    await prisma.kitchenStation.upsert({
      where: { id: station.id },
      update: {
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        name: station.name,
        code: station.code,
      },
      create: {
        id: station.id,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        name: station.name,
        code: station.code,
      },
    });
  }

  await prisma.restaurantApprovalRequest.deleteMany({
    where: { id: DEMO_IDS.approvalDiscountId },
  });
  await prisma.kitchenTicketItem.deleteMany({
    where: {
      id: {
        in: Object.values(KITCHEN_TICKET_ITEM_IDS),
      },
    },
  });
  await prisma.kitchenTicket.deleteMany({
    where: {
      id: {
        in: Object.values(KITCHEN_TICKET_IDS),
      },
    },
  });
  await prisma.restaurantOrderItemModifier.deleteMany({
    where: {
      id: {
        in: Object.values(ORDER_ITEM_MODIFIER_IDS),
      },
    },
  });
  await prisma.restaurantOrderItem.deleteMany({
    where: {
      id: {
        in: Object.values(ORDER_ITEM_IDS),
      },
    },
  });
  await prisma.restaurantOrder.deleteMany({
    where: {
      id: {
        in: [DEMO_IDS.table2OrderId, DEMO_IDS.table7OrderId],
      },
    },
  });
  await prisma.restaurantTableSession.deleteMany({
    where: {
      id: {
        in: [DEMO_IDS.table2SessionId, DEMO_IDS.table7SessionId],
      },
    },
  });

  await prisma.restaurantTableSession.createMany({
    data: [
      {
        id: DEMO_IDS.table2SessionId,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        tableId: TABLE_IDS.table2,
        registerId: DEMO_IDS.registerId,
        shiftSessionId: DEMO_IDS.shiftSessionId,
        openedByUserId: userId,
        openedAt: table2OpenedAt,
        status: "OPEN",
        transferCount: 0,
      },
      {
        id: DEMO_IDS.table7SessionId,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        tableId: TABLE_IDS.table7,
        registerId: DEMO_IDS.registerId,
        shiftSessionId: DEMO_IDS.shiftSessionId,
        openedByUserId: userId,
        openedAt: table7OpenedAt,
        status: "OPEN",
        transferCount: 0,
        notes: "Takeaway pickup in progress",
      },
    ],
  });

  await prisma.restaurantOrder.createMany({
    data: [
      {
        id: DEMO_IDS.table2OrderId,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        tableSessionId: DEMO_IDS.table2SessionId,
        tableId: TABLE_IDS.table2,
        status: "SENT",
        subtotalCents: 2_650,
        discountCents: 0,
        taxCents: 185,
        totalCents: 2_835,
        sentAt: table2SentAt,
      },
      {
        id: DEMO_IDS.table7OrderId,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        tableSessionId: DEMO_IDS.table7SessionId,
        tableId: TABLE_IDS.table7,
        status: "SENT",
        subtotalCents: 3_550,
        discountCents: 0,
        taxCents: 249,
        totalCents: 3_799,
        sentAt: table7SentAt,
      },
    ],
  });

  await prisma.restaurantOrderItem.createMany({
    data: [
      {
        id: ORDER_ITEM_IDS.table2PhoGa,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        orderId: DEMO_IDS.table2OrderId,
        catalogItemId: "demo-catalog-pho-ga",
        itemName: "Pho Ga",
        sku: "PHO-GA",
        quantity: 1,
        sentQuantity: 1,
        unitPriceCents: 1_400,
        taxRateBps: 700,
        taxCents: 98,
        lineSubtotalCents: 1_400,
        lineTotalCents: 1_498,
      },
      {
        id: ORDER_ITEM_IDS.table2SpringRolls,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        orderId: DEMO_IDS.table2OrderId,
        catalogItemId: "demo-catalog-fresh-spring-rolls",
        itemName: "Fresh Spring Rolls",
        sku: "FRESH-SPRING-ROLLS",
        quantity: 1,
        sentQuantity: 1,
        unitPriceCents: 750,
        taxRateBps: 700,
        taxCents: 53,
        lineSubtotalCents: 750,
        lineTotalCents: 803,
      },
      {
        id: ORDER_ITEM_IDS.table2Coffee,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        orderId: DEMO_IDS.table2OrderId,
        catalogItemId: "demo-catalog-vietnamese-iced-coffee",
        itemName: "Vietnamese Iced Coffee",
        sku: "VIETNAMESE-ICED-COFFEE",
        quantity: 1,
        sentQuantity: 1,
        unitPriceCents: 500,
        taxRateBps: 700,
        taxCents: 34,
        lineSubtotalCents: 500,
        lineTotalCents: 534,
      },
      {
        id: ORDER_ITEM_IDS.table7BunCha,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        orderId: DEMO_IDS.table7OrderId,
        catalogItemId: "demo-catalog-bun-cha",
        itemName: "Bun Cha",
        sku: "BUN-CHA",
        quantity: 2,
        sentQuantity: 2,
        unitPriceCents: 1_450,
        taxRateBps: 700,
        taxCents: 203,
        lineSubtotalCents: 2_900,
        lineTotalCents: 3_103,
      },
      {
        id: ORDER_ITEM_IDS.table7LemonSoda,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        orderId: DEMO_IDS.table7OrderId,
        catalogItemId: "demo-catalog-homemade-lemon-soda",
        itemName: "Homemade Lemon Soda",
        sku: "HOMEMADE-LEMON-SODA",
        quantity: 1,
        sentQuantity: 1,
        unitPriceCents: 650,
        taxRateBps: 700,
        taxCents: 46,
        lineSubtotalCents: 650,
        lineTotalCents: 696,
      },
    ],
  });

  await prisma.restaurantOrderItemModifier.createMany({
    data: [
      {
        id: ORDER_ITEM_MODIFIER_IDS.table2PhoGaNoCoriander,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        orderItemId: ORDER_ITEM_IDS.table2PhoGa,
        modifierGroupId: MODIFIER_GROUP_IDS.prepNotes,
        optionName: "no coriander",
        quantity: 1,
        priceDeltaCents: 0,
      },
      {
        id: ORDER_ITEM_MODIFIER_IDS.table2PhoGaExtraChili,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        orderItemId: ORDER_ITEM_IDS.table2PhoGa,
        modifierGroupId: MODIFIER_GROUP_IDS.prepNotes,
        optionName: "extra chili",
        quantity: 1,
        priceDeltaCents: 0,
      },
      {
        id: ORDER_ITEM_MODIFIER_IDS.table7BunChaExtraBeef,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        orderItemId: ORDER_ITEM_IDS.table7BunCha,
        modifierGroupId: MODIFIER_GROUP_IDS.prepNotes,
        optionName: "extra beef",
        quantity: 1,
        priceDeltaCents: 250,
      },
    ],
  });

  await prisma.kitchenTicket.createMany({
    data: [
      {
        id: KITCHEN_TICKET_IDS.table2Hot,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        orderId: DEMO_IDS.table2OrderId,
        tableSessionId: DEMO_IDS.table2SessionId,
        tableId: TABLE_IDS.table2,
        stationId: KITCHEN_STATION_IDS.hot,
        sendKey: "demo-send-table-2-hot",
        status: "NEW",
        sentAt: table2SentAt,
      },
      {
        id: KITCHEN_TICKET_IDS.table2Drinks,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        orderId: DEMO_IDS.table2OrderId,
        tableSessionId: DEMO_IDS.table2SessionId,
        tableId: TABLE_IDS.table2,
        stationId: KITCHEN_STATION_IDS.drinks,
        sendKey: "demo-send-table-2-drinks",
        status: "IN_PROGRESS",
        sentAt: table2DrinksSentAt,
      },
      {
        id: KITCHEN_TICKET_IDS.table7Hot,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        orderId: DEMO_IDS.table7OrderId,
        tableSessionId: DEMO_IDS.table7SessionId,
        tableId: TABLE_IDS.table7,
        stationId: KITCHEN_STATION_IDS.hot,
        sendKey: "demo-send-table-7-hot",
        status: "DONE",
        sentAt: table7SentAt,
      },
    ],
  });

  await prisma.kitchenTicketItem.createMany({
    data: [
      {
        id: KITCHEN_TICKET_ITEM_IDS.table2HotPhoGa,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        ticketId: KITCHEN_TICKET_IDS.table2Hot,
        orderItemId: ORDER_ITEM_IDS.table2PhoGa,
        quantity: 1,
      },
      {
        id: KITCHEN_TICKET_ITEM_IDS.table2HotSpringRolls,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        ticketId: KITCHEN_TICKET_IDS.table2Hot,
        orderItemId: ORDER_ITEM_IDS.table2SpringRolls,
        quantity: 1,
      },
      {
        id: KITCHEN_TICKET_ITEM_IDS.table2DrinksCoffee,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        ticketId: KITCHEN_TICKET_IDS.table2Drinks,
        orderItemId: ORDER_ITEM_IDS.table2Coffee,
        quantity: 1,
      },
      {
        id: KITCHEN_TICKET_ITEM_IDS.table7HotBunCha,
        tenantId,
        workspaceId: DEMO_IDS.workspaceId,
        ticketId: KITCHEN_TICKET_IDS.table7Hot,
        orderItemId: ORDER_ITEM_IDS.table7BunCha,
        quantity: 2,
      },
    ],
  });

  await prisma.restaurantApprovalRequest.create({
    data: {
      id: DEMO_IDS.approvalDiscountId,
      tenantId,
      workspaceId: DEMO_IDS.workspaceId,
      orderId: DEMO_IDS.table7OrderId,
      orderItemId: ORDER_ITEM_IDS.table7BunCha,
      type: "DISCOUNT",
      status: "PENDING",
      reason: "Manager approval required for pickup goodwill discount",
      amountCents: 300,
      requestedByUserId: userId,
      decidedByUserId: null,
      decidedAt: null,
    },
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFile(args);

  const { ownerEmail, sharedPassword } = getDemoCredentials(args);
  const prisma = new PrismaService();

  try {
    const { tenantId, userId, demoAuthUsers } = await ensureTenantUserWorkspace(
      prisma,
      ownerEmail,
      sharedPassword
    );

    await seedEntitlements(prisma, tenantId, userId);
    await seedStaff(prisma, tenantId);
    await seedCash(prisma, tenantId, userId);
    await seedCatalog(prisma, tenantId);
    await seedRestaurant(prisma, tenantId, userId);

    process.stdout.write(
      `${JSON.stringify(
        {
          tenantId,
          workspaceId: DEMO_IDS.workspaceId,
          workspaceName: WORKSPACE_NAME,
          surfaceId: "pos",
          verticalId: "restaurant",
          email: ownerEmail,
          password: sharedPassword,
          users: demoAuthUsers.map((demoUser) => ({
            name: demoUser.displayName,
            email: demoUser.email,
            tenantRole: demoUser.tenantRoleSystemKey,
            workspaceRole: demoUser.workspaceRole,
            password: sharedPassword,
          })),
          loginUrl: process.env.CORELY_LOCAL_POS_URL
            ? `${process.env.CORELY_LOCAL_POS_URL.replace(/\/$/, "")}/auth/login`
            : "http://pos.localhost:8080/auth/login",
          floorPlanUrl: process.env.CORELY_LOCAL_POS_URL
            ? `${process.env.CORELY_LOCAL_POS_URL.replace(/\/$/, "")}/restaurant/floor-plan`
            : "http://pos.localhost:8080/restaurant/floor-plan",
          kitchenQueueUrl: process.env.CORELY_LOCAL_POS_URL
            ? `${process.env.CORELY_LOCAL_POS_URL.replace(/\/$/, "")}/restaurant/kitchen-queue`
            : "http://pos.localhost:8080/restaurant/kitchen-queue",
          openingFloatCents: OPENING_FLOAT_CENTS,
          catalogItemsSeeded: DEMO_CATALOG_ITEMS.map((item) => ({
            code: item.code,
            name: item.name,
            priceCents: item.amountCents,
          })),
          demoStory: {
            table2: "occupied",
            table5: "available for 4 guests",
            table7: "takeaway pickup in progress",
            activeKitchenTickets: 3,
            pendingApprovals: 1,
          },
        },
        null,
        2
      )}\n`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
