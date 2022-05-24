export declare class FrameBus {
    ready: boolean;
    initing: boolean;
    walEl: null | HTMLIFrameElement;
    walWin: null | Window;
    onMsgHandler: null | ((event: MessageEvent<any>) => void);
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
    onMessage(event: MessageEvent): void;
    emit(data: Record<string, any>): void;
    emitAsync<T>(data: Record<string, any>): Promise<T>;
    getStyles(): string;
}
