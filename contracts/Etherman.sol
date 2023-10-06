// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/universal-router/contracts/libraries/Constants.sol";

contract Etherman is Ownable {
	address public immutable WETH;

	constructor(address _weth) Ownable() {
		WETH = _weth;
	}

	/// @notice Unwrap WBNB for owner
	function unwrapWETH(
		uint256 amount,
		address payable target
	) external onlyOwner {
		/// @dev Deposit ERC-20 of WETH
		IERC20(WETH).transferFrom(msg.sender, address(this), amount);

		/// @dev Now call unwrap
		IWETH9(WETH).withdraw(amount);
		(bool success, ) = target.call{value: amount}("");

		require(success, "Error: cannot unwrap WETH");
	}

	/// @dev To receive
	receive() external payable {}
}
