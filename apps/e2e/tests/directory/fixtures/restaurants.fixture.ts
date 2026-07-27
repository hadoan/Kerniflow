import type { DirectoryRestaurantFixture } from "../helpers/db.ts";

export type DirectoryRestaurantFixtures = {
  activePho: DirectoryRestaurantFixture;
  activeBunCha: DirectoryRestaurantFixture;
  hiddenPho: DirectoryRestaurantFixture;
};

export function buildDirectoryRestaurantFixtures(runTag: string): DirectoryRestaurantFixtures {
  const prefix = `${runTag}-`;

  return {
    activePho: {
      slug: `${prefix}pho-bar-neukoelln`,
      name: `${runTag} Pho Bar Neukoelln`,
      shortDescription: "Vietnamese pho and banh mi",
      dishTags: ["pho", "banh-mi"],
      neighborhoodSlug: "neukoelln",
      addressLine: "Weserstr. 10",
      postalCode: "12045",
      status: "ACTIVE",
    },
    activeBunCha: {
      slug: `${prefix}bun-cha-mitte`,
      name: `${runTag} Bun Cha Mitte`,
      shortDescription: "Bun cha and grilled specialties",
      dishTags: ["bun-cha"],
      neighborhoodSlug: "mitte",
      addressLine: "Torstr. 20",
      postalCode: "10119",
      status: "ACTIVE",
    },
    hiddenPho: {
      slug: `${prefix}hidden-test-place`,
      name: `${runTag} Hidden Test Place`,
      shortDescription: "Hidden listing for moderation checks",
      dishTags: ["pho"],
      neighborhoodSlug: "mitte",
      addressLine: "Invalidenstr. 1",
      postalCode: "10115",
      status: "HIDDEN",
    },
  };
}
