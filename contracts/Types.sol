// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

library Types {
	/**
	 * @dev Pocket status which has 4 statuses
	 */
	enum PocketStatus {
		Active,
		Paused,
		Closed,
		Withdrawn
	}

	/**
	 * @dev Value comparison
	 */
	enum ValueComparisonOperator {
		Unset,
		Gt,
		Gte,
		Lt,
		Lte,
		Bw,
		NBw
	}
	struct ValueComparison {
		uint256 value0;
		uint256 value1;
		ValueComparisonOperator operator;
	}

	/**
	 * @dev Stop condition
	 */
	enum StopConditionOperator {
		EndTimeReach,
		BatchAmountReach,
		SpentBaseTokenAmountReach,
		ReceivedTargetTokenAmountReach
	}
	struct StopCondition {
		uint256 value;
		StopConditionOperator operator;
	}

	/**
	 * @dev Define Pocket
	 */
	struct Pocket {
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
		uint256 frequency;
		StopCondition[] stopConditions;
		/**
		 * @dev Pocket opening position config
		 */
		ValueComparison openingPositionCondition;
		/**
		 * @dev Pocket closing position config
		 */
		ValueComparison closingPositionCondition;
		/**
		 * @dev Following fields will be assigned during runtime.
		 */
		PocketStatus status;
		/**
		 * @dev Info is used for statistic
		 */
		uint256 totalDepositedBaseAmount;
		uint256 totalSwappedBaseAmount;
		uint256 totalReceivedTargetAmount;
		uint256 baseTokenBalance;
		uint256 targetTokenBalance;
		uint256 executedBatchAmount;
		uint256 nextScheduledExecutionAt;
	}
}
