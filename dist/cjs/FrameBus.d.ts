export declare class FrameBus {
    ready: boolean;
    initing: boolean;
    destroying: boolean;
    walEl: null | any;
    walWin: null | Window;
    onMsgHandler: null | ((event: any) => void);
    requests: Map<string, {
        req: Record<string, any>;
        resolve: (value: any) => void;
    }>;
    constructor(config?: string | // existing wallElId
    {
        id?: string;
        src?: string;
    });
    initId(walElId: string): void;
    initSrc(src?: string): Promise<void>;
    showFrame(): void;
    hideFrame(): void;
    destroy(): void;
    isReady(): Promise<boolean>;
    setOnDisconnect(f: any): void;
    onDisconnect(): void;
    onMessage(event: any): void;
    emit(data: Record<string, any>): void;
    emitAsync<T>(data: Record<string, any>): Promise<T>;
    getStyles(): string;
}
