// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./PocketRegistry.sol";

import "./Types.sol";
import "./Params.sol";

contract PocketVault is
	Initializable,
	PausableUpgradeable,
	ReentrancyGuardUpgradeable,
	OwnableUpgradeable
{
	/// @dev Declare pocket registry
	address public registryAddress;

	/// @dev RegistryUpdated emitted event
	event RegistryUpdated(address indexed actor, address indexed registry);

	/// @dev Emit Deposited whenever a deposit happens
	event Deposited(
		address indexed actor,
		string indexed pocketId,
		address indexed tokenAddress,
		uint256 amount
	);

	/// @notice Deposit
	function deposit(Params.DepositingParams memory params)
		external
		nonReentrant
	{
		/// @dev Verify whether the pocket is open for depositing
		require(
			PocketRegistry(registryAddress).isAbleToDeposit(
				params.pocketId,
				params.actor
			),
			"Error: pocket is not able to deposit"
		);

		require(
			IERC20(params.tokenAddress).transferFrom(
				params.actor,
				address(this),
				params.amount
			),
			"Error: cannot transfer token"
		);
		//
		//        /// @dev Credit balancex
		//        Types.Pocket storage currentPocket = PocketRegistry(registryAddress).pockets(params.pocketId);
		//        PocketRegistry(registryAddress).updatePocketStats(
		//            Params.UpdatePocketParams({
		//                id: currentPocket.id,
		//                status: currentPocket.status
		//            }),
		//            "CREDIT_POCKET_BALANCE_AFTER_DEPOSITING"
		//        );

		/// @dev Emit event
		emit Deposited(
			msg.sender,
			params.pocketId,
			params.tokenAddress,
			params.amount
		);
	}

	/// @notice Set registry address
	function setRegistry(address registry) external onlyOwner {
		registryAddress = registry;
		emit RegistryUpdated(msg.sender, registry);
	}

	/// @custom:oz-upgrades-unsafe-allow constructor
	constructor() {
		_disableInitializers();
	}

	function initialize() public initializer {
		__Pausable_init();
		__Ownable_init();
	}

	function pause() public onlyOwner {
		_pause();
	}

	function unpause() public onlyOwner {
		_unpause();
	}
}
