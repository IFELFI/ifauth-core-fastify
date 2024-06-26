export interface ReplyData {
  message: string;
  data?: any;
}

export interface AuthReplyData extends ReplyData {
  code: string;
  autoAuthCode?: string;
}