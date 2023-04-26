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
		address baseTokenAddress;
		address targetTokenAddress;
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
		Types.TradingStopCondition takeProfitCondition;
		Types.TradingStopCondition stopLossCondition;
	}

	/**
	 * @dev Define pocket item
	 */
	struct UpdatePocketParams {
		/**
		 * @dev Each pocket would have a unique id
		 */
		string id;
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
		Types.TradingStopCondition takeProfitCondition;
		Types.TradingStopCondition stopLossCondition;
	}

	/// @dev Define params
	struct UpdatePocketClosingPositionStatsParams {
		string id;
		address actor;
		/**
		 * @dev Archived info is used for statistic
		 */
		uint256 swappedTargetTokenAmount;
		uint256 receivedBaseTokenAmount;
	}

	/// @dev Define params
	struct UpdatePocketTradingStatsParams {
		address actor;
		string id;
		/**
		 * @dev Archived info is used for statistic
		 */
		uint256 swappedBaseTokenAmount;
		uint256 receivedTargetTokenAmount;
	}

	/// @dev Depositing params
	struct UpdatePocketWithdrawalParams {
		address actor;
		string id;
	}

	/// @dev Define params
	struct UpdatePocketDepositParams {
		address actor;
		string id;
		uint256 amount;
		address tokenAddress;
	}

	/// @dev Define params
	struct UpdatePocketStatusParams {
		address actor;
		string id;
		Types.PocketStatus status;
	}
}
