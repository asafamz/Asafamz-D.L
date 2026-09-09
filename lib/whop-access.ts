import { headers } from "next/headers";
import { whopsdk } from "./whop-sdk";

export async function getWhopUser() {
  const headerList = await headers();
  return whopsdk.verifyUserToken(headerList);
}

export async function checkExperienceAccess(experienceId: string) {
  const { userId } = await getWhopUser();
  const access = await whopsdk.users.checkAccess(experienceId, { id: userId });
  return { userId, ...access };
}

export async function checkCompanyAdmin(companyId: string) {
  const { userId } = await getWhopUser();
  const access = await whopsdk.users.checkAccess(companyId, { id: userId });
  return { userId, ...access };
}
