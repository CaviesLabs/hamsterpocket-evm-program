// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

import "./PocketRegistry.sol";

import "./Types.sol";
import "./Params.sol";

contract PocketVault is
	Initializable,
	PausableUpgradeable,
	ReentrancyGuardUpgradeable,
	OwnableUpgradeable
{
	using SafeMathUpgradeable for uint256;

	/// @dev Declare pocket registry
	address public registryAddress;

	/// @dev RegistryUpdated emitted event
	event RegistryUpdated(address indexed actor, address indexed registry);

	/// @dev Emit Withdrawn whenever a withdrawal happens
	event Withdrawn(
		address indexed actor,
		string indexed pocketId,
		address baseTokenAddress,
		uint256 baseTokenAmount,
		address targetTokenAddress,
		uint256 targetTokenAmount
	);

	/// @dev Emit Deposited whenever a deposit happens
	event Deposited(
		address indexed actor,
		string indexed pocketId,
		address indexed tokenAddress,
		uint256 amount
	);

	/// @dev Emit ClosedPosition whenever a position is closed
	event ClosedPosition(
		address indexed actor,
		string indexed pocketId,
		address baseTokenAddress,
		uint256 baseTokenAmount,
		address targetTokenAddress,
		uint256 targetTokenAmount
	);

	/// @dev Emit Swapped whenever a swap happens
	event Swapped(
		address indexed actor,
		string indexed pocketId,
		address baseTokenAddress,
		uint256 baseTokenAmount,
		address targetTokenAddress,
		uint256 targetTokenAmount
	);

	/// @notice Modifier to verify only permitted actor can perform the operation
	modifier onlyRelayer() {
		require(
			PocketRegistry(registryAddress).hasRole(
				PocketRegistry(registryAddress).RELAYER(),
				msg.sender
			),
			"Permission: only relayer is permitted"
		);

		_;
	}

	/// @notice Make DCA swap for the given pocket pocket
	function makeDCASwap(string memory pocketId)
		external
		nonReentrant
		onlyRelayer
		returns (uint256, uint256)
	{
		/// @dev Extract necessary info
		(
			address ammRouterAddress,
			address baseTokenAddress,
			address targetTokenAddress,
			,
			uint256 batchVolume,
			,
			,
			,

		) = PocketRegistry(registryAddress).getTradingInfoOf(pocketId);

		/// @dev Approve the router to spend base token.
		TransferHelper.safeApprove(
			baseTokenAddress,
			address(ammRouterAddress),
			batchVolume
		);

		/// @dev Execute the swap
		ISwapRouter.ExactInputParams memory params = ISwapRouter
			.ExactInputParams({
				path: abi.encodePacked(
					baseTokenAddress,
					uint256(3000),
					targetTokenAddress
				),
				recipient: address(this),
				deadline: block.timestamp,
				amountIn: batchVolume,
				amountOutMinimum: 0
			});
		uint256 amountOut = ISwapRouter(ammRouterAddress).exactInput(params);

		/// @dev Emit event
		emit Swapped(
			msg.sender,
			pocketId,
			baseTokenAddress,
			batchVolume,
			targetTokenAddress,
			amountOut
		);

		/// @dev Return amount in and amount out
		return (batchVolume, amountOut);
	}

	/// @notice Make close position for the given pocket
	function closePosition(string memory pocketId)
		external
		nonReentrant
		onlyRelayer
		returns (uint256, uint256)
	{
		/// @dev Extract necessary info
		(
			address ammRouterAddress,
			address baseTokenAddress,
			address targetTokenAddress,
			,
			,
			,
			,
			,

		) = PocketRegistry(registryAddress).getTradingInfoOf(pocketId);
		(, uint256 targetTokenBalance) = PocketRegistry(registryAddress)
			.getBalanceInfoOf(pocketId);

		/// @dev Approve the router to spend base token.
		TransferHelper.safeApprove(
			baseTokenAddress,
			address(ammRouterAddress),
			targetTokenBalance
		);

		/// @dev Execute the swap
		ISwapRouter.ExactInputParams memory params = ISwapRouter
			.ExactInputParams({
				path: abi.encodePacked(
					targetTokenAddress,
					uint256(3000),
					baseTokenAddress
				),
				recipient: address(this),
				deadline: block.timestamp,
				amountIn: targetTokenBalance,
				amountOutMinimum: 0
			});
		uint256 amountOut = ISwapRouter(ammRouterAddress).exactInput(params);

		/// @dev Emit event
		emit ClosedPosition(
			msg.sender,
			pocketId,
			baseTokenAddress,
			amountOut,
			targetTokenAddress,
			targetTokenBalance
		);

		/// @dev Return amount in and amount out
		return (targetTokenBalance, amountOut);
	}

	/// @notice withdraw
	function withdraw(Params.UpdatePocketWithdrawalParams memory params)
		external
		nonReentrant
		onlyRelayer
	{
		/// @dev Withdraw tokens
		(
			,
			address baseTokenAddress,
			address targetTokenAddress,
			,
			,
			,
			,
			,

		) = PocketRegistry(registryAddress).getTradingInfoOf(params.id);
		(uint256 baseTokenBalance, uint256 targetTokenBalance) = PocketRegistry(
			registryAddress
		).getBalanceInfoOf(params.id);
		address owner = PocketRegistry(registryAddress).getOwnerOf(params.id);

		require(
			IERC20(baseTokenAddress).transfer(owner, baseTokenBalance),
			"Error: cannot transfer token"
		);
		require(
			IERC20(targetTokenAddress).transfer(owner, targetTokenBalance),
			"Error: cannot transfer token"
		);

		/// @dev Emit event
		emit Withdrawn(
			owner,
			params.id,
			baseTokenAddress,
			baseTokenBalance,
			targetTokenAddress,
			targetTokenBalance
		);
	}

	/// @notice Deposit
	function deposit(Params.UpdatePocketDepositParams memory params)
		external
		nonReentrant
		onlyRelayer
	{
		/// @dev Use msg.sender instead of params.actor so that we can deposit token from the PocketChef.
		require(
			IERC20(params.tokenAddress).transferFrom(
				msg.sender,
				address(this),
				params.amount
			),
			"Error: cannot transfer token"
		);

		/// @dev Emit event
		emit Deposited(
			msg.sender,
			params.id,
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
