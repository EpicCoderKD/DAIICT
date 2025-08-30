import { ethers } from "ethers";
import abi from "../abi/GreenH2CreditsV2.json";
import { TransactionListener } from "./transactionListener.js";
import { SupabaseService } from "./supabaseService.js";

export async function getProviderAndSigner() {
  if (!window.ethereum) throw new Error("MetaMask not found");
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  return { provider, signer };
}

export async function getContract() {
  const res = await fetch("/contract-address.json");
  if (!res.ok)
    throw new Error("contract-address.json missing. Run deploy script.");
  const { address } = await res.json();
  const { signer } = await getProviderAndSigner();
  return new ethers.Contract(address, abi, signer);
}

export async function getContractWithListener() {
  const contract = await getContract();
  const { provider } = await getProviderAndSigner();
  
  // Initialize services
  const transactionListener = new TransactionListener(contract, provider);
  const supabaseService = new SupabaseService();
  
  return { contract, transactionListener, supabaseService };
}

export async function initializeTransactionMirroring() {
  try {
    const { contract, transactionListener, supabaseService } = await getContractWithListener();
    
    // Start listening to new transactions
    await transactionListener.startListening();
    
    // Initial sync of blockchain data to Supabase
    await supabaseService.syncBlockchainData(contract);
    
    console.log('Transaction mirroring initialized successfully');
    
    return { contract, transactionListener, supabaseService };
  } catch (error) {
    console.error('Failed to initialize transaction mirroring:', error);
    throw error;
  }
}
