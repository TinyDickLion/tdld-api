import fs from "fs";

export const readDataFile = async (dataPath: any) =>
  JSON.parse((await fs.promises.readFile(dataPath, "utf8")) || "[]");

export const writeDataFile = async (dataPath: any, data: any) =>
  fs.promises.writeFile(dataPath, JSON.stringify(data, null, 2), "utf8");
