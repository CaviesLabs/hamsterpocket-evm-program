<br />
<p align="center">
  <img src="https://cavies.xyz/assets/images/logo.png" alt="CaviesLabs" />
</p>

<h3 align="center">
  <strong>Built for flexible, customizable Self-managed DCA strategies #defi #infrastructure 
</strong>
</h3>

<p align="center">
     <a href="https://pocket.hamsterbox.xyz">
        Launch DApp
    </a> |
    <a href="https://cavies.xyz/">
        About Cavies
    </a>
</p>

<p align="center">

</p>

<p align="center">
  <a href="https://github.com/CaviesLabs/hamsterpocket-program/">
    <img alt="GitHub Repository Stars Count" src="https://img.shields.io/github/stars/CaviesLabs/hamsterpocket-program?style=social" />
  </a>
    <a href="https://twitter.com/CaviesLabs">
        <img alt="Follow Us on Twitter" src="https://img.shields.io/twitter/follow/CaviesLabs?style=social" />
    </a>
    <a href="https://linkedin.com/company/cavieslabs">
        <img alt="Follow Us on LinkedIn" src="https://img.shields.io/badge/LinkedIn-Follow-black?style=social&logo=linkedin" />
    </a>
</p>
<p align="center">
    <a href="#">
        <img alt="Build Status" src="https://build.cavies.xyz/buildStatus/icon?job=hamsterpocket%2Fhamsterpocket-backend%2Fdevelop" />
    </a>
    <a href="https://github.com/CaviesLabs/hamsterpocket-program">
        <img alt="License" src="https://img.shields.io/github/license/CaviesLabs/hamsterpocket-program" />
    </a>
    <a href="https://github.com/CaviesLabs/hamsterpocket-program/pulls">
        <img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" />
    </a>
    <a href="https://coveralls.io/github/CaviesLabs/hamsterpocket-program/?branch=next">
        <img alt="Coverage Status" src="https://coveralls.io/repos/github/CaviesLabs/hamsterpocket-program/badge.svg?branch=next" />
    </a>
</p>

![Hero image](https://files.slack.com/files-pri/T03N86YEZ6Z-F04TQLW6JCU/heroimage.png?pub_secret=014779ae87)

Hamsterpocket (Pocket) is an Open Source self-managed dollar-cost-averaging protocol that lets users create and run their own saving pools (“pockets”) that will automatically execute the chosen strategies over time.

## **What we deliver out-of-the-box** 📦

<p align="center">
  <img alt="Architecture" src="https://files.slack.com/files-pri/T03N86YEZ6Z-F04T783JZAB/out-of-the-box.png?pub_secret=3ca2221066">
</p>

- **Convenient** - Users only need to set up the desired pools and strategies once, then top up (reload) said pools with the required funds for execution anytime.
- **Trustless** - Users are able to manage their own pools. Every pocket can only be paused, resumed, terminated and withdrawn at will by the pockets’ owners.
- **Flexible use cases**:

  • Run a TWAP strategy on-chain

  • Create a simple saving pool for one or multiple assets

  • Set-and-forget vaults for medium or long-term spot purchases

## **Prototype Design & Test cases** 🚴

- [**Figma**](https://www.figma.com/file/Tx32sB0eC2iwkBD7rZRRut/Hamsterpocket-(DCA)?node-id=1902%3A43690&t=JpssstVDMVaaWHSf-0)
- [**Test cases**](https://docs.google.com/spreadsheets/d/1xdPHErMtTJtk0zH2-huzkDcuJx9lwZgb/edit#gid=1292533007)

## **Our Tech Stack** 🛠

- [ReactJs](https://reactjs.org/)
- [Next.js](https://nextjs.org/)
- [Nest.js](https://nestjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/)
- [Anchor](https://anchor-lang.com/)
- [Rust](https://rustup.rs/)

## **Related Workspaces** 🔗

- [hamsterpocket-backend](https://github.com/CaviesLabs/hamsterpocket-backend) - Backend repository
- [hamsterpocket-frontend](https://github.com/CaviesLabs/hamsterpocket-frontend) - Frontend repository/DApp
- [hamsterpocket-program](https://github.com/CaviesLabs/hamsterpocket-program) - Rust smart contract repository

## **Getting started** 🚀

### **Deployed Contracts addresses** 📢
| Contract       | BSC Mainnet  | Mumbai                                     | XDC | OKT |
|----------------|----------------------------------------------|--------------------------------------------|-----|-----|
| PocketChef     | 0xd74Ad94208935a47b1Bd289d28d45Bce6369E064 | 0xD156e603a421efbba39BDcAC9F1a7ed0081d2fBF | 0x2E2eEFcD211658035b77AC4D1a4c40Be7174B441    | 0x2B7388Cf467d05f3979dDd3eAD8AfD8a0CE0076c    |
| PocketRegistry | 0xb9599963729Acf22a18629355dA23e0bA4fBa611 | 0x691a63b8259c5C11E68DbF295571A53D6273aC8d | 0x8FbaCBb3B09c876cA0AD0939A746935456D5793F    | 0x680702fEa71e65DD79cF2114DbAe6b74F676DCc6    |
| PocketVault    | 0x4bcD48D0Af9b48716EDb30BFF560d08036439871 | 0xF90884eB5bDE6B8Ea306e1912B600d0ce2f73292 | 0x8500d55F0f49FFfA33cCBdbcF171eD50a7bcA26E    | 0x76DB16c04F9683288E912e986C3F4EBB52266F1C    |
| Multicall3     | 0x3156935b16C6c6742961dfb57811c086A2dbDF1e | 0xB3A38B447903a594076C9eF11F54203C870638C5 | 0x9ac25725B8465E70cc2458592C9104c0f06C8e87    | 0x292A7C55443850a30A6BCC17aF306b4Dc8864476    |


### Test

```bash
yarn test
```

```bash
  [administration]
    ✔ [administration] should: non deployer wont be allowed to modify contracts (253ms)

  [manage_pocket]
    ✔ [create_pocket] should: owner creates pocket successfully (369ms)
    ✔ [get_trading_info] should: getTradingInfoOf should work properly
    ✔ [create_pocket] should: cannot create with a duplicated id
    ✔ [update_pocket] should: owner updates pocket will fail if owner provides invalid id
    ✔ [update_pocket] should: non-owner updates pocket will fail
    ✔ [update_pocket] should: owner updates pocket successfully (285ms)
    ✔ [update_pocket_status] should: non-owner will fail to update pocket status
    ✔ [update_pocket_status] should: owner can pause/close pocket status (707ms)
    ✔ [update_pocket_status] should: owner will fail to update pocket status if it's not available

  [manage_vault]
    ✔ [create_and_deposit] should: owner creates and deposits to pocket with native ether (1332ms)
    ✔ [create_and_deposit] should: owner creates and deposits to pocket using multicall (1061ms)
    ✔ [withdraw] should: owner fails to withdraw an active pocket
    ✔ [deposit] should: non-owner fails to deposit to an active pocket
    ✔ [close_and_withdraw] should: close and withdraw pocket with multicall (1484ms)
    ✔ [deposit] should: owner fails to deposit to a closed pocket

  [quoter]
    ✔ [quoter] should: BTCB/WBNB on RouterV2 should work properly (444ms)
    ✔ [quoter] should: UNI/WBNB on RouterV2 should work properly (304ms)
    ✔ [quoter] should: ETH/WBNB on RouterV2 should work properly (311ms)
    ✔ [quoter] should: BTCB/WBNB on fee 0.05% should work properly (1761ms)
    ✔ [quoter] should: ETH/WBNB on fee 0.05% should work (1612ms)
    ✔ [quoter] should: BTCB/WBNB on fee 0.3% should work properly (6033ms)
    ✔ [quoter] should: UNI/WBNB on fee 0.3% should work (1695ms)
    ✔ [quoter] should: ETH/WBNB on fee 0.3% should work (1832ms)
    ✔ [quoter] should: BTCB/WBNB on fee 1% should work properly (4985ms)
    ✔ [quoter] should: UNI/WBNB on fee 1% should work (1178ms)
    ✔ [quoter] should: ETH/WBNB on fee 1% should work (3415ms)

  [swap]
    ✔ [auto_investment] should: non-operator cannot trigger the swap, even owner
    ✔ [auto_investment] should: operator can trigger the swap (1352ms)
    ✔ [auto_investment] should: operator can close position of the swap (3234ms)
    ✔ [auto_investment] should: operator will fail to close position as the condition is not reached (stop loss) (1331ms)
    ✔ [auto_investment] should: operator will fail to close position as the condition is not reached (take profit) (1189ms)
    ✔ [auto_investment] should: owner can close position (3504ms)
    ✔ [auto_investment] should: auto close whenever pocket reaches stop conditions (3352ms)
    ✔ [auto_investment] should: should work with pcs router v2 (5067ms)


  35 passing (57s)
```

### Deploy into BSC mainnet

```bash
npx hardhat run scripts/pocket/deploy.ts --network <network-name>
```

## **Contribution** 🤝

Hamsterpocket is an Open Source project and we encourage everyone to help us making it better. If you are interested in contributing to the project, please feel free to do so.

If you have any questions about contributing, please refer to our twitter <a href="https://twitter.com/CaviesLabs">
<img alt="Follow Us on Twitter" src="https://img.shields.io/twitter/follow/CaviesLabs?style=social" />
</a> - we are happy to help you!

Discovered a 🐜 or have feature suggestion? Feel free to [create an issue](https://github.com/CaviesLabs/hamsterpocket-program/issues/new/choose) on Github.

## **Support us** ❤️

**Hamsterpocket is and always will be Open Source, released under MIT Licence.**

How you can help us:

- **Contribute** - this is how the Core Team is supporting the project.
- **Spread the word** - tell your friends, colleagues, and followers about Hamsterpocket.
- **Create content** - write a blog post, record a video, or create a tutorial. We will be happy to share it on our social media channels.

### **Follow us on Social Media**

[![Twitter Follow](https://img.shields.io/twitter/follow/CaviesLabs?style=social)](https://twitter.com/CaviesLabs)
[![LinkedIn Follow](https://img.shields.io/badge/LinkedIn-Follow-black?style=social&logo=linkedin)](https://www.linkedin.com/company/cavieslabs/)

## **Careers** 👩‍💻👨‍💻

We are growing and we are looking for talented people to join our team. If you are interested in working with us, please check our [Careers page](https://www.notion.so/cavies/Job-Board-320ac7987dc64a53b0d3d3e7c52c5ce7).

## **Contacts** 📱📱

Feel free to submit your inquiries to <a href="mailto:dev@cavies.xyz">dev@cavies.xyz</a> or <a href="mailto:hello@cavies.xyz">hello@cavies.xyz</a>
