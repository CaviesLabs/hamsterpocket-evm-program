import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";

import { deployFixtures } from "./fixtures";

describe("[administrator]", async function () {
  let fixtures: Awaited<ReturnType<typeof deployFixtures>>;

  before(async () => {
    fixtures = await loadFixture(deployFixtures);
  });

  it("[administration] should: non deployer wont be allowed to modify contracts", async () => {
    await expect(
      fixtures.Registry.connect(fixtures.owner2).grantRole(
        fixtures.Registry.OPERATOR(),
        fixtures.owner2.address
      )
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      fixtures.Registry.connect(fixtures.owner2).whitelistAddress(
        "0xa180fe01b906a1be37be6c534a3300785b20d947",
        true
      )
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      fixtures.Vault.connect(fixtures.owner2).withdraw({
        actor: fixtures.owner2.address,
        id: "random-id",
      })
    ).to.be.revertedWith("Permission: only relayer is permitted");

    await expect(
      fixtures.Vault.connect(fixtures.owner2).makeDCASwap("random-id")
    ).to.be.revertedWith("Permission: only relayer is permitted");

    await expect(
      fixtures.Vault.connect(fixtures.owner2).closePosition("random-id")
    ).to.be.revertedWith("Permission: only relayer is permitted");

    await expect(
      fixtures.Vault.connect(fixtures.owner2).setRegistry(
        "0xa180fe01b906a1be37be6c534a3300785b20d947"
      )
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      fixtures.Vault.connect(fixtures.owner2).setPermit2(
        "0xa180fe01b906a1be37be6c534a3300785b20d947"
      )
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});
