// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./Types.sol";

library Params {
	/**
	 * @dev Define pocket item
	 */
	struct CreatePocketParams {
		/**
		 * @dev Each pocket would have a unique id
		 */
		string id;
		address owner;
		/**
		 * @dev AMM configurations
		 */
		address ammRouterAddress;
		address baseMintAddress;
		address targetMintAddress;
		/**
		 * @dev Pocket trade config
		 **/
		uint256 startAt;
		uint256 batchVolume;
		Types.StopCondition[] stopConditions;
		uint256 frequency;
		/**
		 * @dev Pocket opening position config
		 */
		Types.ValueComparison openingPositionCondition;
		/**
		 * @dev Pocket closing position config
		 */
		Types.ValueComparison closingPositionCondition;
	}

	/// @dev Define update pocket params
	struct UpdatePocketParams {
		string id;
		address owner;
		Types.PocketStatus status;
		/**
		 * @dev Archived info is used for statistic
		 */
		uint256 totalDepositedBaseAmount;
		uint256 totalReceivedTargetAmount;
		uint256 totalSwappedBaseAmount;
		uint256 baseTokenBalance;
		uint256 targetTokenBalance;
		uint256 executedBatchAmount;
		uint256 nextScheduledExecutionAt;
	}

	/// @dev Depositing params
	struct DepositingParams {
		address actor;
		string pocketId;
		address tokenAddress;
		uint256 amount;
	}

	/// @dev Depositing params
	struct WithdrawParams {
		address actor;
		string pocketId;
	}
}
