import { provide } from "midway";

@provide()
export class Utils {
  isEqualStr(str1: any, str2: any): boolean {
    return str1.toString() === str2.toString();
  }
  isEqualProp(prop1: Prop, prop2: Prop): boolean {
    return `${prop1.key}/${prop1.status}` === `${prop2.key}/${prop2.status}`;
  }
  sleep(delay: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
