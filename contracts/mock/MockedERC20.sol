// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockedERC20 is ERC20 {
	constructor() ERC20("MockedERC20", "MERC20") {
		_mint(msg.sender, 1000000 * 10**decimals());
	}
}
