import type { Commitment, PublicKey } from '@solana/web3.js';
import { Metaplex } from '@/Metaplex';
import { Operation, useOperation, OperationHandler } from '@/types';
import { toMetadata, toTokenWithMetadata, TokenWithMetadata } from './Metadata';
import {
  findAssociatedTokenAccountPda,
  toMint,
  toTokenWithMint,
  TokenWithMint,
  toMintAccount,
  toTokenAccount,
} from '../tokenModule';
import { findMetadataPda, parseMetadataAccount } from '@/programs';
import { DisposableScope } from '@/utils';

// -----------------
// Operation
// -----------------

const Key = 'FindTokenWithMetadataByMintOperation' as const;
export const findTokenWithMetadataByMintOperation =
  useOperation<FindTokenWithMetadataByMintOperation>(Key);
export type FindTokenWithMetadataByMintOperation = Operation<
  typeof Key,
  FindTokenWithMetadataByMintInput,
  TokenWithMetadata | TokenWithMint
>;

export type FindTokenWithMetadataByMintInput = {
  mintAddress: PublicKey;
  ownerAddress: PublicKey;
  commitment?: Commitment;
  loadJsonMetadata?: boolean; // Default: true
};

// -----------------
// Handler
// -----------------

export const findTokenWithMetadataByMintOperationHandler: OperationHandler<FindTokenWithMetadataByMintOperation> =
  {
    handle: async (
      operation: FindTokenWithMetadataByMintOperation,
      metaplex: Metaplex,
      scope: DisposableScope
    ): Promise<TokenWithMetadata | TokenWithMint> => {
      const {
        mintAddress,
        ownerAddress,
        commitment,
        loadJsonMetadata = true,
      } = operation.input;

      const metadataAddress = findMetadataPda(mintAddress);
      const tokenAddress = findAssociatedTokenAccountPda(
        mintAddress,
        ownerAddress
      );
      const accounts = await metaplex
        .rpc()
        .getMultipleAccounts(
          [mintAddress, metadataAddress, tokenAddress],
          commitment
        );

      const mintAccount = toMintAccount(accounts[0]);
      const metadataAccount = parseMetadataAccount(accounts[1]);
      const tokenAccount = toTokenAccount(accounts[2]);
      const mintModel = toMint(mintAccount);

      if (!metadataAccount.exists) {
        return toTokenWithMint(tokenAccount, mintModel);
      }

      let metadataModel = toMetadata(metadataAccount);
      if (loadJsonMetadata) {
        metadataModel = await metaplex
          .nfts()
          .loadJsonMetadata(metadataModel)
          .run(scope);
      }

      return toTokenWithMetadata(tokenAccount, mintModel, metadataModel);
    },
  };
