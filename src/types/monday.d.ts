export interface MondayUser {
  id: number | string;
}

export interface MondayContext {
  user: MondayUser;
  boardId?: number;
  boardIds?: number[];
  theme?: string;
}

export interface MondayListenResponse<T> {
  data: T;
}

type MondayListener<T> = (res: MondayListenResponse<T>) => void;

declare module "monday-sdk-js" {
  interface MondayClient {
    execute(method: string, params?: Record<string, unknown>): void;
    listen<T = unknown>(type: string, callback: MondayListener<T>): void;
    setApiVersion(version: string): void;
    api<T = unknown>(
      query: string,
      options?: { variables?: Record<string, unknown> }
    ): Promise<T>;
    get<T = unknown>(type: string): Promise<MondayListenResponse<T>>;
  }

  export default function mondaySdk(): MondayClient;
}
