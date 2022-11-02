// toStruct takes an array type e.g. Inventory.ItemStructOutput and converts it to an object type.
import { ethers } from "hardhat";

export const toStruct = <A extends Array<unknown>>(arr: A): ExtractPropsFromArray<A> => {
    const keys = Object.keys(arr).filter((key) => isNaN(Number(key)));
    const result = {};
    // @ts-ignore
    arr.forEach((item, index) => (result[keys[index]] = item));
    return result as A;
};

// This is to remove unnecessary properties from the output type. Use it eg. `ExtractPropsFromArray<Inventory.ItemStructOutput>`
export type ExtractPropsFromArray<T> = Omit<T, keyof Array<unknown> | `${number}`>;

export const wei = (value: string) => ethers.utils.parseEther(value);
