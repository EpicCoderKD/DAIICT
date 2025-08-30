import { ethers } from "ethers";
import abi from "../abi/GreenH2CreditsV2.json";

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
