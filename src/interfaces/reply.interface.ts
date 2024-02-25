import { TokenPair } from "./token.interface";

export interface ReplyData {
  success: boolean;
  message: string;
  data: any;
}

export interface TokenReplyData extends ReplyData {
  data: TokenPair;
}
