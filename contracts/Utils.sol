// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

library Utils {
	/**
	 * @dev Utility function
	 */
	function areStringsEqual(string calldata s1, string calldata s2)
		external
		pure
		returns (bool)
	{
		return
			keccak256(abi.encodePacked(s1)) == keccak256(abi.encodePacked(s2));
	}
}
