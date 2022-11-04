import type { AlgonautConfig } from './AlgonautTypes';
export declare class FrameBus {
    ready: boolean;
    initing: boolean;
    destroying: boolean;
    walEl: null | any;
    walElContainer: null | any;
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
        align?: AlgonautConfig['INKEY_ALIGN'];
    });
    initId(walElId: string): void;
    initSrc(src?: string, align?: AlgonautConfig['INKEY_ALIGN']): Promise<void>;
    showFrame(routepath?: string): void;
    hideFrame(): void;
    setHeight(height: number, unit?: string): void;
    destroy(): void;
    isReady(): Promise<boolean>;
    setOnDisconnect(f: any): void;
    onDisconnect(): void;
    onMessage(event: any): void;
    emit(data: Record<string, any>): void;
    emitAsync<T>(data: Record<string, any>): Promise<T>;
    insertStyles(css: string): void;
    removeStyles(): void;
}
