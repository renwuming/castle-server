import { provide } from "midway";

@provide()
export class Utils {
  isEqualStr(str1: any, str2: any): boolean {
    return str1.toString() === str2.toString();
  }
}
